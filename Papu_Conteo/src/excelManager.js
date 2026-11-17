'use strict';

const fs = require('fs');
const ExcelJS = require('exceljs');
const { findBestMatch, normalize } = require('./matcher');

const COL = {
  SECCION: 1,
  NOMBRE: 2,
  TELEFONO: 3,
  TOMAS: 4,
  ALEX: 5,
  INDECISO: 6,
  NOTAS: 7,
  OPERADOR_ASIGNADO: 8,
  CONFIRMADO: 9,
  VOTO_CONFIRMADO: 10,
  OPERADOR_CONFIRMO: 11,
  FECHA_HORA: 12,
  DISCREPANCIA: 13,
};

const GREEN_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFB6F2B6' },
};

const ORANGE_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFD27F' },
};

const VOTE_COLUMNS = {
  TOMAS: COL.TOMAS,
  ALEX: COL.ALEX,
  INDECISO: COL.INDECISO,
  INDECISOS: COL.INDECISO,
};

const GRADO_ALIASES = {
  PRIMERO: 'Primer año',
  PRIMER: 'Primer año',
  '1': 'Primer año',
  SEGUNDO: 'Segundo año',
  '2': 'Segundo año',
  TERCERO: 'Tercer año',
  TERCER: 'Tercer año',
  '3': 'Tercer año',
  CUARTO: 'Cuarto año',
  '4': 'Cuarto año',
  QUINTO: 'Quinto año',
  '5': 'Quinto año',
};

class ExcelManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.workbook = null;
    this._queue = Promise.resolve();
  }

  /** Carga el padrón. Solo reemplaza el workbook si la lectura sale bien. */
  async load() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    if (workbook.worksheets.length === 0) {
      throw new Error(`El archivo ${this.filePath} no tiene hojas.`);
    }
    this.workbook = workbook;
    this.mtimeMs = fs.statSync(this.filePath).mtimeMs;
  }

  /** Recarga desde disco si el archivo cambió desde la última carga o guardado (edición manual). */
  async recargarSiCambio() {
    if (fs.statSync(this.filePath).mtimeMs === this.mtimeMs) return false;
    console.warn('[Excel] El archivo cambió en disco; se recarga antes de registrar el voto.');
    await this.load();
    return true;
  }

  /** Tras un fallo de guardado: vuelve a leer el disco. Devuelve false si no se pudo; nunca lanza. */
  async recuperar() {
    try {
      await this.load();
      return true;
    } catch (err) {
      console.error('[Excel] No se pudo recargar el padrón:', err.message);
      return false;
    }
  }

  /** Escribe a un temporal y lo renombra: el dashboard nunca lee un archivo a medio escribir. */
  async save() {
    const tmp = `${this.filePath}.tmp`;
    await this.workbook.xlsx.writeFile(tmp);
    await fs.promises.rename(tmp, this.filePath);
    this.mtimeMs = fs.statSync(this.filePath).mtimeMs;
  }

  /** Serializa operaciones sobre el workbook (procesar voto + guardar van juntos). */
  async runExclusive(fn) {
    const result = this._queue.then(() => fn());
    this._queue = result.catch(() => {});
    return result;
  }

  _resolveSheet(gradoRaw) {
    if (!gradoRaw) return null;
    const key = normalize(gradoRaw).replace(/[^A-Z0-9]/g, '');
    let sheetName = GRADO_ALIASES[key];
    if (!sheetName) {
      const found = Object.keys(GRADO_ALIASES).find((alias) => key.includes(alias));
      if (found) sheetName = GRADO_ALIASES[found];
    }
    if (!sheetName) return null;
    return this.workbook.getWorksheet(sheetName) || null;
  }

  _voteColumnFor(votoRaw) {
    const key = normalize(votoRaw || '').replace(/\s+/g, '');
    if (key.includes('TOMAS')) return VOTE_COLUMNS.TOMAS;
    if (key.includes('ALEX')) return VOTE_COLUMNS.ALEX;
    if (key.includes('INDECIS')) return VOTE_COLUMNS.INDECISO;
    return VOTE_COLUMNS.ALEX; // Por defecto Alex
  }

  _voteLabelForColumn(col) {
    if (col === COL.TOMAS) return 'Tomas';
    if (col === COL.ALEX) return 'Alex';
    if (col === COL.INDECISO) return 'Indeciso';
    return 'Alex';
  }

  _candidatesForSeccion(sheet, seccion) {
    const targetSeccion = normalize(seccion || '');
    const candidatos = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const seccionCelda = normalize(row.getCell(COL.SECCION).value);
      const nombre = row.getCell(COL.NOMBRE).value;
      if (!nombre) return;
      if (targetSeccion && seccionCelda !== targetSeccion) return;
      candidatos.push({
        rowNumber,
        nombre: normalizeDisplayName(String(nombre)),
        operadorAsignado: row.getCell(COL.OPERADOR_ASIGNADO).value || '',
      });
    });
    return candidatos;
  }

  _setCellStyle(cell, patch) {
    cell.style = Object.assign({}, cell.style, patch);
  }

  applyRowFill(sheet, rowNumber, fill) {
    const row = sheet.getRow(rowNumber);
    for (let c = 1; c <= 13; c++) {
      this._setCellStyle(row.getCell(c), { fill });
    }
  }

  confirmarIntencionesPrecargadas() {
    let migradas = 0;
    this.workbook.worksheets.forEach((sheet) => {
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const nombre = row.getCell(COL.NOMBRE).value;
        if (!nombre) return;

        const yaConfirmado = normalize(row.getCell(COL.CONFIRMADO).value) === 'SI';
        if (yaConfirmado) return;

        const esTomas = Number(row.getCell(COL.TOMAS).value) === 1;
        const esIndeciso = Number(row.getCell(COL.INDECISO).value) === 1;
        if (!esTomas && !esIndeciso) return;

        row.getCell(COL.CONFIRMADO).value = 'SI';
        row.getCell(COL.VOTO_CONFIRMADO).value = esTomas ? 'Tomas' : 'Indeciso';
        row.getCell(COL.OPERADOR_CONFIRMO).value = 'Precarga inicial';

        this.applyRowFill(sheet, rowNumber, GREEN_FILL);
        row.commit();
        migradas += 1;
      });
    });
    return migradas;
  }

  /**
   * Registra un voto para una persona que ya existe en el padrón.
   * Nunca agrega filas: si la persona, la sección o el grado no existen, devuelve
   * NOMBRE_NO_ENCONTRADO / SECCION_NO_ENCONTRADA / GRADO_NO_ENCONTRADO sin tocar el Excel.
   */
  processVote({ nombre, seccion, grado, voto, operador }) {
    const seccionUp = seccion ? seccion.toUpperCase() : '';
    const voteLabel = this._voteLabelForColumn(this._voteColumnFor(voto));
    const base = {
      nombre,
      grado: grado || '(sin grado)',
      seccion: seccionUp || 'N/A',
      operador,
      voto: voteLabel,
    };

    const sheet = this._resolveSheet(grado);
    if (grado && !sheet) {
      return { ...base, status: 'GRADO_NO_ENCONTRADO', hoja: null };
    }
    const hojas = sheet ? [sheet] : this.workbook.worksheets.filter((s) => s.name !== 'Revisar_Manual');

    let seccionExiste = false;
    let target = null;
    let match = null;
    for (const hoja of hojas) {
      const candidatos = this._candidatesForSeccion(hoja, seccion);
      if (candidatos.length > 0) seccionExiste = true;
      const m = findBestMatch(candidatos, nombre, operador);
      if (m.best) {
        target = hoja;
        match = { ...m, candidatos };
        break;
      }
    }

    if (!match) {
      const status = seccionUp && !seccionExiste ? 'SECCION_NO_ENCONTRADA' : 'NOMBRE_NO_ENCONTRADO';
      return { ...base, status, hoja: sheet ? sheet.name : 'todas las hojas' };
    }

    const { best, score, ambiguous, ties } = match;
    const row = target.getRow(best.rowNumber);
    const yaConfirmado = normalize(row.getCell(COL.CONFIRMADO).value) === 'SI';
    const voteCol = this._voteColumnFor(voto);
    const now = new Date();

    const datos = {
      ...base,
      hoja: target.name,
      grado: target.name,
      rowNumber: best.rowNumber,
      nombreEnPadron: best.nombre,
      matchScore: Number(score.toFixed(2)),
      ambiguous,
      candidatosAmbiguos: ambiguous ? ties.map((t) => t.candidato.nombre) : [],
    };

    if (!yaConfirmado) {
      row.getCell(COL.TOMAS).value = voteCol === COL.TOMAS ? 1 : null;
      row.getCell(COL.ALEX).value = voteCol === COL.ALEX ? 1 : null;
      row.getCell(COL.INDECISO).value = voteCol === COL.INDECISO ? 1 : null;

      row.getCell(COL.CONFIRMADO).value = 'SI';
      row.getCell(COL.VOTO_CONFIRMADO).value = voteLabel;
      row.getCell(COL.OPERADOR_CONFIRMO).value = operador;
      const fechaCell = row.getCell(COL.FECHA_HORA);
      fechaCell.value = now;
      this._setCellStyle(fechaCell, { numFmt: 'dd/mm/yyyy hh:mm' });

      this.applyRowFill(target, best.rowNumber, GREEN_FILL);
      row.commit();

      return { ...datos, status: 'REGISTRADO' };
    }

    const operadorPrevio = row.getCell(COL.OPERADOR_CONFIRMO).value || '';
    const votoPrevio = row.getCell(COL.VOTO_CONFIRMADO).value || '';

    if (normalize(votoPrevio) === normalize(voteLabel)) {
      return { ...datos, status: 'DUPLICADO_IGNORADO', votoPrevio, operadorPrevio };
    }

    const discrepancias = [
      `Voto reportado "${voteLabel}" (por ${operador}) difiere del voto ya registrado "${votoPrevio}" (por ${operadorPrevio || 'precarga inicial'})`,
    ];
    if (normalize(best.nombre) !== normalize(nombre)) {
      discrepancias.push(`Nombre recibido "${nombre}" difiere del nombre en padrón "${best.nombre}"`);
    }

    const discrepanciaPrevia = row.getCell(COL.DISCREPANCIA).value;
    const nuevaNota = `[${now.toLocaleString('es-MX')}] ${discrepancias.join('; ')}`;
    row.getCell(COL.DISCREPANCIA).value = discrepanciaPrevia
      ? `${discrepanciaPrevia}\n${nuevaNota}`
      : nuevaNota;

    this.applyRowFill(target, best.rowNumber, ORANGE_FILL);
    row.commit();

    return { ...datos, status: 'DISCREPANCIA', votoPrevio, operadorPrevio, discrepancias };
  }
}

function normalizeDisplayName(name) {
  return name
    .toLowerCase()
    .replace(/(^|\s)([a-záéíóúñ])/g, (_, sep, letter) => sep + letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { ExcelManager, COL, GRADO_ALIASES, normalizeDisplayName };

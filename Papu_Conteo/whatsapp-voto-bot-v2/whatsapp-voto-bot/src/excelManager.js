'use strict';

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

  async load() {
    this.workbook = new ExcelJS.Workbook();
    await this.workbook.xlsx.readFile(this.filePath);
    if (this.workbook.worksheets.length === 0) {
      throw new Error(`El archivo ${this.filePath} no tiene hojas.`);
    }
  }

  async save() {
    await this.workbook.xlsx.writeFile(this.filePath);
  }

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

  processVote({ nombre, seccion, grado, voto, operador }) {
    let sheet = this._resolveSheet(grado);
    let candidatos = [];

    if (sheet) {
      candidatos = this._candidatesForSeccion(sheet, seccion);
    } else {
      // Buscar en las hojas si no se especificó grado
      for (const s of this.workbook.worksheets) {
        if (s.name === 'Revisar_Manual') continue;
        const c = this._candidatesForSeccion(s, seccion);
        if (c.length > 0) {
          const matchResult = findBestMatch(c, nombre, operador);
          if (matchResult.best) {
            sheet = s;
            candidatos = c;
            break;
          }
        }
      }
    }

    const { best, score, ambiguous, ties } = candidatos.length > 0
      ? findBestMatch(candidatos, nombre, operador)
      : { best: null, score: 0, ambiguous: false, ties: [] };

    const targetSheet = sheet || this.workbook.worksheets[0];

    // SI NO APARECE EN EL EXCEL: Agregarlo en la celda/fila siguiente de la tabla
    if (!best) {
      const newRowNumber = targetSheet.lastRow ? targetSheet.lastRow.number + 1 : 2;
      const row = targetSheet.getRow(newRowNumber);

      const voteCol = this._voteColumnFor(voto);
      const voteLabel = this._voteLabelForColumn(voteCol);
      const now = new Date();

      row.getCell(COL.SECCION).value = seccion ? seccion.toUpperCase() : '';
      row.getCell(COL.NOMBRE).value = normalizeDisplayName(nombre);
      row.getCell(COL.TOMAS).value = voteCol === COL.TOMAS ? 1 : null;
      row.getCell(COL.ALEX).value = voteCol === COL.ALEX ? 1 : null;
      row.getCell(COL.INDECISO).value = voteCol === COL.INDECISO ? 1 : null;

      row.getCell(COL.CONFIRMADO).value = 'SI';
      row.getCell(COL.VOTO_CONFIRMADO).value = voteLabel;
      row.getCell(COL.OPERADOR_CONFIRMO).value = operador;
      const fechaCell = row.getCell(COL.FECHA_HORA);
      fechaCell.value = now;
      this._setCellStyle(fechaCell, { numFmt: 'dd/mm/yyyy hh:mm' });

      this.applyRowFill(targetSheet, newRowNumber, GREEN_FILL);
      row.commit();

      return {
        hoja: targetSheet.name,
        grado: targetSheet.name,
        rowNumber: newRowNumber,
        nombreEnPadron: normalizeDisplayName(nombre),
        seccion: seccion ? seccion.toUpperCase() : 'N/A',
        matchScore: 1,
        ambiguous: false,
        candidatosAmbiguos: [],
        status: 'REGISTRADO',
        voto: voteLabel,
        operador,
      };
    }

    const row = targetSheet.getRow(best.rowNumber);
    const yaConfirmado = normalize(row.getCell(COL.CONFIRMADO).value) === 'SI';
    const voteCol = this._voteColumnFor(voto);
    const voteLabel = this._voteLabelForColumn(voteCol);
    const now = new Date();

    const base = {
      hoja: targetSheet.name,
      grado: targetSheet.name,
      rowNumber: best.rowNumber,
      nombreEnPadron: best.nombre,
      seccion: seccion ? seccion.toUpperCase() : 'N/A',
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

      this.applyRowFill(targetSheet, best.rowNumber, GREEN_FILL);
      row.commit();

      return { ...base, status: 'REGISTRADO', voto: voteLabel, operador };
    }

    const operadorPrevio = row.getCell(COL.OPERADOR_CONFIRMO).value || '';
    const votoPrevio = row.getCell(COL.VOTO_CONFIRMADO).value || '';

    if (normalize(votoPrevio) === normalize(voteLabel)) {
      return {
        ...base,
        status: 'DUPLICADO_IGNORADO',
        voto: voteLabel,
        votoPrevio,
        operador,
        operadorPrevio,
      };
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

    this.applyRowFill(targetSheet, best.rowNumber, ORANGE_FILL);
    row.commit();

    return {
      ...base,
      status: 'DISCREPANCIA',
      voto: voteLabel,
      votoPrevio,
      operador,
      operadorPrevio,
      discrepancias,
    };
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
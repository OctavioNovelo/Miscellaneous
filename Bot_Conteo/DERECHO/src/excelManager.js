'use strict';

const fs = require('fs');
const ExcelJS = require('exceljs');
const { findBestMatch, normalize } = require('./matcher');

// Opciones de voto: las columnas de candidatos de la tabla de Aaron (el orden del Excel no importa).
const CANDIDATOS = ['Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron'];

// Columnas de confirmación: no existen en las listas; se agregan al final de cada hoja al cargar.
const TRACKING_HEADERS = {
  CONFIRMADO: 'Confirmado',
  VOTO_CONFIRMADO: 'Voto Confirmado',
  OPERADOR_CONFIRMO: 'Operador Confirmo',
  FECHA_HORA: 'Fecha/Hora',
  DISCREPANCIA: 'Discrepancia',
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

const GRADO_SHEETS = ['Primer año', 'Segundo año', 'Tercer año', 'Cuarto año'];
// Votos de nombres que no están en ningún grado: se anotan aquí para revisarlos a mano.
const NO_ENCONTRADOS = 'No encontrados';
const NO_ENCONTRADOS_HEADERS = ['Fecha/Hora', 'Nombre', 'Voto', 'Operador'];

/** Índice de columna (1-based) por encabezado, o -1 si no existe. */
function colsOf(sheet) {
  const h = sheet.getRow(1).values;
  const idx = (...names) => {
    for (const name of names) {
      const i = h.findIndex((v, k) => k > 0 && normalize(v) === normalize(name));
      if (i > 0) return i;
    }
    return -1;
  };
  return {
    SECCION: idx('Salon', 'Seccion'),
    NOMBRE: idx('Nombre'),
    OPERADOR_ASIGNADO: idx('Operador'),
    candidatos: Object.fromEntries(CANDIDATOS.map((n) => [n, idx(n)])),
    CONFIRMADO: idx(TRACKING_HEADERS.CONFIRMADO),
    VOTO_CONFIRMADO: idx(TRACKING_HEADERS.VOTO_CONFIRMADO),
    OPERADOR_CONFIRMO: idx(TRACKING_HEADERS.OPERADOR_CONFIRMO),
    FECHA_HORA: idx(TRACKING_HEADERS.FECHA_HORA),
    DISCREPANCIA: idx(TRACKING_HEADERS.DISCREPANCIA),
  };
}

class ExcelManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.workbook = null;
    this._queue = Promise.resolve();
  }

  /** Carga el padrón. Solo reemplaza el workbook si la lectura y la validación salen bien. */
  async load() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.filePath);
    if (workbook.worksheets.length === 0) {
      throw new Error(`El archivo ${this.filePath} no tiene hojas.`);
    }
    for (const sheet of workbook.worksheets.filter((s) => GRADO_SHEETS.includes(s.name))) {
      this._ensureTracking(sheet);
    }
    if (!workbook.getWorksheet(NO_ENCONTRADOS)) {
      workbook.addWorksheet(NO_ENCONTRADOS).addRow(NO_ENCONTRADOS_HEADERS);
    }
    this.workbook = workbook;
    this.mtimeMs = fs.statSync(this.filePath).mtimeMs;
  }

  /** Agrega al final las columnas de confirmación que falten, y valida las obligatorias. */
  _ensureTracking(sheet) {
    let cols = colsOf(sheet);
    for (const [key, header] of Object.entries(TRACKING_HEADERS)) {
      if (cols[key] !== -1) continue;
      const col = sheet.columnCount + 1;
      sheet.getRow(1).getCell(col).value = header;
      sheet.getRow(1).getCell(col).font = { bold: true };
      cols = colsOf(sheet);
    }
    const falta = [
      ...['SECCION', 'NOMBRE'].filter((k) => cols[k] === -1),
      ...CANDIDATOS.filter((n) => cols.candidatos[n] === -1),
    ];
    if (falta.length > 0) {
      throw new Error(`La hoja "${sheet.name}" no tiene las columnas: ${falta.join(', ')}.`);
    }
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

  /** Candidato elegido, con la capitalización del Excel; null si no es una opción. */
  _resolveCandidato(votoRaw) {
    const key = normalize(votoRaw || '');
    return CANDIDATOS.find((n) => normalize(n) === key) || null;
  }

  /**
   * Personas candidatas. Sin filtro se busca en todos los grados y secciones;
   * con grado y/o sección, solo dentro de ese grado y ese salón.
   */
  _candidatesAll({ grado = null, seccion = null } = {}) {
    const out = [];
    const salon = seccion ? normalize(seccion) : null;
    for (const sheet of this.workbook.worksheets.filter((s) => GRADO_SHEETS.includes(s.name))) {
      if (grado && sheet.name !== grado) continue;
      const c = colsOf(sheet);
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const nombre = row.getCell(c.NOMBRE).value;
        if (!nombre) return;
        const seccionFila = String(row.getCell(c.SECCION).value ?? '').trim();
        if (salon && normalize(seccionFila) !== salon) return;
        out.push({
          sheet,
          rowNumber,
          nombre: normalizeDisplayName(String(nombre)),
          seccion: seccionFila,
          operadorAsignado: c.OPERADOR_ASIGNADO !== -1 ? row.getCell(c.OPERADOR_ASIGNADO).value || '' : '',
        });
      });
    }
    return out;
  }

  _setCellStyle(cell, patch) {
    cell.style = Object.assign({}, cell.style, patch);
  }

  applyRowFill(sheet, rowNumber, fill) {
    const row = sheet.getRow(rowNumber);
    for (let c = 1; c <= sheet.columnCount; c++) {
      this._setCellStyle(row.getCell(c), { fill });
    }
  }

  /** Anota el voto de un nombre que no está en el padrón, en la hoja "No encontrados". */
  registrarNoEncontrado({ nombre, voto, operador }) {
    const ws = this.workbook.getWorksheet(NO_ENCONTRADOS);
    const row = ws.addRow([new Date(), nombre, voto, operador]);
    row.getCell(1).numFmt = 'dd/mm/yyyy hh:mm';
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: NO_ENCONTRADOS_HEADERS.length } };
    return { status: 'ANOTADO_NO_ENCONTRADO', nombre, voto, operador, rowNumber: row.number };
  }

  /**
   * Registra un voto para una persona que ya existe en el padrón.
   * Nunca agrega filas: si la persona o el candidato no existen, devuelve
   * NOMBRE_NO_ENCONTRADO o CANDIDATO_NO_VALIDO sin tocar el Excel.
   */
  processVote({ nombre, voto, operador, grado = null, seccion = null }) {
    const candidato = this._resolveCandidato(voto);
    const base = { nombre, operador, voto: candidato || String(voto || '') };
    if (!candidato) {
      return { ...base, status: 'CANDIDATO_NO_VALIDO', opciones: CANDIDATOS };
    }

    const m = findBestMatch(this._candidatesAll({ grado, seccion }), nombre, operador);
    if (!m.best) {
      return { ...base, status: 'NOMBRE_NO_ENCONTRADO', hoja: grado || 'todas las hojas' };
    }

    const { best, score, ambiguous, ties } = m;
    const target = best.sheet;
    const c = colsOf(target);
    const row = target.getRow(best.rowNumber);
    const yaConfirmado = normalize(row.getCell(c.CONFIRMADO).value) === 'SI';
    const now = new Date();

    const datos = {
      ...base,
      hoja: target.name,
      grado: target.name,
      seccion: best.seccion,
      rowNumber: best.rowNumber,
      nombreEnPadron: best.nombre,
      matchScore: Number(score.toFixed(2)),
      ambiguous,
      candidatosAmbiguos: ambiguous ? ties.map((t) => t.candidato.nombre) : [],
    };

    if (!yaConfirmado) {
      for (const n of CANDIDATOS) row.getCell(c.candidatos[n]).value = n === candidato ? 1 : null;

      row.getCell(c.CONFIRMADO).value = 'SI';
      row.getCell(c.VOTO_CONFIRMADO).value = candidato;
      row.getCell(c.OPERADOR_CONFIRMO).value = operador;
      const fechaCell = row.getCell(c.FECHA_HORA);
      fechaCell.value = now;
      this._setCellStyle(fechaCell, { numFmt: 'dd/mm/yyyy hh:mm' });

      this.applyRowFill(target, best.rowNumber, GREEN_FILL);
      row.commit();

      return { ...datos, status: 'REGISTRADO' };
    }

    const operadorPrevio = row.getCell(c.OPERADOR_CONFIRMO).value || '';
    const votoPrevio = row.getCell(c.VOTO_CONFIRMADO).value || '';

    if (normalize(votoPrevio) === normalize(candidato)) {
      return { ...datos, status: 'DUPLICADO_IGNORADO', votoPrevio, operadorPrevio };
    }

    const discrepancias = [
      `Voto reportado "${candidato}" (por ${operador}) difiere del voto ya registrado "${votoPrevio}" (por ${operadorPrevio || 'desconocido'})`,
    ];
    if (normalize(best.nombre) !== normalize(nombre)) {
      discrepancias.push(`Nombre recibido "${nombre}" difiere del nombre en padrón "${best.nombre}"`);
    }

    const discrepanciaPrevia = row.getCell(c.DISCREPANCIA).value;
    const nuevaNota = `[${now.toLocaleString('es-MX')}] ${discrepancias.join('; ')}`;
    row.getCell(c.DISCREPANCIA).value = discrepanciaPrevia
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

module.exports = { ExcelManager, colsOf, CANDIDATOS, GRADO_SHEETS, normalizeDisplayName };

'use strict';

// Convierte la lista de grados exportada de Google Sheets (un CSV por pestaña) al formato
// del padrón: una hoja por grado con los mismos encabezados que las hojas actuales.
// Uso: node src/normalizarPadron.js <carpeta-csv> <salida.xlsx>
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { normalize } = require('./matcher');

// Encabezados de las hojas actuales del padrón (data/Padron.xlsx, hoja "Primer año").
const HEADERS = [
  'Salon', 'Nombre', 'Número Tel.', 'Tomas', 'Alex', 'Indeciso', 'Indeciso CE',
  'Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron', 'Operador',
  'Confirmado', 'Voto Confirmado', 'Operador Confirmo', 'Fecha/Hora', 'Discrepancia',
];

// Archivo CSV -> nombre de hoja del padrón.
const HOJAS = {
  '1er_Semestre.csv': 'Primer año',
  'Segundo.csv': 'Segundo año',
  'Tercero.csv': 'Tercer año',
  'Cuarto.csv': 'Cuarto año',
  'Quinto.csv': 'Quinto año',
  'Sexto.csv': 'Sexto año',
  'Septimo.csv': 'Séptimo año',
  'Octavo.csv': 'Octavo año',
  'Noveno.csv': 'Noveno año',
  'OTROS.csv': 'OTROS',
};

/** CSV RFC 4180 mínimo: comillas, comillas dobles escapadas y saltos de línea dentro de comillas. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * Extrae alumnos de una pestaña. Cada fila con "Operador" + "Nombre del alumno" abre bloques
 * (uno por par de columnas); el salón sale del "SALÓN X" de la fila de arriba, si existe.
 * Devuelve { alumnos: [{salon, nombre, operador, voto}], descartadas: [{fila, valor, motivo}] }.
 */
function parseGrado(text) {
  const rows = parseCsv(text);
  const alumnos = [];
  const descartadas = [];
  let bloques = [];
  rows.forEach((r, i) => {
    const heads = [];
    r.forEach((v, c) => {
      if (normalize(v) === 'OPERADOR' && normalize(r[c + 1]) === 'NOMBRE DEL ALUMNO') {
        const m = /^SAL[OÓ]N\s+(\S+)/i.exec(String((rows[i - 1] || [])[c] || '').trim());
        heads.push({ c, salon: m ? m[1].toUpperCase() : '' });
      }
    });
    if (heads.length) { bloques = heads; return; }
    for (const b of bloques) {
      const nombre = String(r[b.c + 1] || '').trim();
      if (!nombre) continue;
      if (/^total/i.test(nombre)) {
        descartadas.push({ fila: i + 1, valor: nombre, motivo: 'renglón de totales, no es alumno' });
        continue;
      }
      alumnos.push({ salon: b.salon, nombre, operador: String(r[b.c] || '').trim(), voto: String(r[b.c + 2] || '').trim() });
    }
  });
  return { alumnos, descartadas };
}

/** Libro con una hoja por grado. El "Voto" de la lista (SI/INSEGURO/NO) no es un candidato: no se copia. */
function construirLibro(grados) {
  const wb = new ExcelJS.Workbook();
  for (const [hoja, alumnos] of grados) {
    const ws = wb.addWorksheet(hoja);
    ws.addRow(HEADERS).font = { bold: true };
    for (const a of alumnos) {
      const fila = Array(HEADERS.length).fill(null);
      fila[HEADERS.indexOf('Salon')] = a.salon || null;
      fila[HEADERS.indexOf('Nombre')] = a.nombre;
      fila[HEADERS.indexOf('Operador')] = a.operador || null;
      ws.addRow(fila);
    }
  }
  return wb;
}

async function main(dir, salida) {
  const grados = [];
  const reporte = [];
  for (const [archivo, hoja] of Object.entries(HOJAS)) {
    const { alumnos, descartadas } = parseGrado(fs.readFileSync(path.join(dir, archivo), 'utf8'));
    grados.push([hoja, alumnos]);
    const votos = {};
    for (const a of alumnos) votos[a.voto || '(vacío)'] = (votos[a.voto || '(vacío)'] || 0) + 1;
    reporte.push({ archivo, hoja, alumnos: alumnos.length, descartadas, votos });
  }
  await construirLibro(grados).xlsx.writeFile(salida);
  console.log(JSON.stringify(reporte, null, 2));
}

if (require.main === module) {
  const [dir, salida] = process.argv.slice(2);
  if (!dir || !salida) {
    console.error('Uso: node src/normalizarPadron.js <carpeta-csv> <salida.xlsx>');
    process.exit(1);
  }
  main(dir, salida).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { parseCsv, parseGrado, construirLibro, HEADERS, HOJAS };

'use strict';

// Sincroniza el padrón con la lista oficial (Listas 23n, ya exportada a .xlsx):
//  - quita las columnas "Indeciso CE", "Tomas" y "Alex" (ya no son opciones de voto);
//  - agrega la columna "No ha votado" antes de Operador;
//  - marca en la fila de cada persona la opción CE que tiene la lista (una o ninguna);
//  - agrega a su grado a quien no esté en el padrón (sin confirmar);
//  - aplica el mismo estilo de encabezados a todas las hojas (el de Primer año).
// Uso: node src/sincronizarListas.js <padron.xlsx> <listas.xlsx> <salida.xlsx>
const ExcelJS = require('exceljs');
const { normalize } = require('./matcher');

const CE = ['Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron'];
// Tomas y Alex ya no son candidatos: sus columnas se quitan del padrón.
const RETIRADAS = ['Tomas', 'Tomas ', 'Alex', 'Indeciso', 'Indeciso ', 'Indeciso SA'];
const NHV = 'No ha votado';
const GRADOS = ['Primer año', 'Segundo año', 'Tercer año', 'Cuarto año'];
// Hoja de la lista -> hoja del padrón.
const LISTA_DE = { 'Primer año': 'Primer año', 'Segundo año': 'Segundo año', 'Tercer año': 'Tercer Año' };
// Misma persona con nombre distinto: nombre en la lista (MAYÚSCULAS) -> nombre en el padrón.
const ALIAS = {
  'JENNIFER PAOLA ALEJOS ZAMORA': 'Jennifer Alejos Zamora',
  'DANIELA HERNANDEZ': 'VELASCO HERNANDEZ CLAUDIA DANIELA',
};

const valor = (c) => {
  const v = c.value;
  if (v && typeof v === 'object') {
    if (v.result !== undefined) return v.result;
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if (v.text) return v.text;
  }
  return v;
};
const txt = (v) => (v === null || v === undefined ? '' : String(v)).trim();
const esUno = (v) => txt(v) === '1';

/** Lee una hoja como objetos { encabezado: valor }, saltando el encabezado y filas sin nombre. */
function filasDe(ws) {
  const encabezados = ws.getRow(1).values.slice(1).map(txt);
  const filas = [];
  ws.eachRow((r, i) => {
    if (i === 1) return;
    const o = {};
    encabezados.forEach((h, k) => { o[h] = valor(r.getCell(k + 1)); });
    if (txt(o['Nombre'])) filas.push(o);
  });
  return { encabezados, filas };
}

/**
 * Devuelve { libro, resumen } sin tocar los archivos de entrada.
 * @param {ExcelJS.Workbook} padron
 * @param {ExcelJS.Workbook} listas
 */
function sincronizar(padron, listas) {
  const resumen = [];
  const estilo = {};
  const ancho = {};
  const primera = padron.getWorksheet('Primer año');
  primera.getRow(1).eachCell((c, col) => {
    const n = txt(c.value);
    estilo[n] = { fill: c.fill, font: c.font, alignment: c.alignment };
    ancho[n] = primera.getColumn(col).width;
  });

  // 1) Padrón en memoria, sin Indeciso CE, con la columna No ha votado
  const hojas = {};
  const porNombre = new Map(); // nombre normalizado -> { fila, hoja }
  for (const grado of GRADOS) {
    const ws = padron.getWorksheet(grado);
    if (!ws) continue;
    const { encabezados, filas } = filasDe(ws);
    const headers = encabezados.filter((h) => h !== 'Indeciso CE' && !RETIRADAS.includes(h));
    headers.splice(headers.indexOf('Operador'), 0, NHV);
    for (const f of filas) {
      delete f['Indeciso CE'];
      porNombre.set(normalize(txt(f['Nombre'])), { fila: f, hoja: grado });
    }
    hojas[grado] = { headers, filas };
  }

  // 2) Lista: marcar a quien ya está; agregar a quien no
  for (const grado of GRADOS) {
    const ws = listas.getWorksheet(LISTA_DE[grado]);
    if (!ws) continue;
    const { filas } = filasDe(ws);
    let marcados = 0, agregados = 0;
    for (const l of filas) {
      const nombreLista = txt(l['Nombre']);
      const nombrePadron = ALIAS[nombreLista.toUpperCase()] || nombreLista;
      const ce = CE.filter((c) => esUno(l[c]));
      const hit = porNombre.get(normalize(nombrePadron));
      if (hit) {
        marcados++;
        for (const c of CE) hit.fila[c] = ce.includes(c) ? 1 : null;
        hit.fila[NHV] = ce.length ? null : 1;
        if (ce.length > 1) resumen.push(`${nombreLista}: dos marcas CE en la lista (${ce.join(', ')})`);
        if (hit.hoja !== grado) resumen.push(`${nombreLista}: está en ${hit.hoja} en el padrón, se marca ahí`);
      } else {
        agregados++;
        const nueva = { Salon: txt(l['Salon']) || null, Nombre: nombreLista, Operador: txt(l['Operador']) || null, Confirmado: 'NO' };
        for (const c of CE) nueva[c] = ce.includes(c) ? 1 : null;
        nueva[NHV] = ce.length ? null : 1;
        hojas[grado].filas.push(nueva);
        porNombre.set(normalize(nombreLista), { fila: nueva, hoja: grado });
        resumen.push(`agregado a ${grado}: ${nombreLista}`);
      }
    }
    resumen.push(`${grado}: marcados ${marcados}, agregados ${agregados}`);
  }

  // 3) Libro nuevo con el estilo de encabezados de Primer año
  const libro = new ExcelJS.Workbook();
  for (const grado of GRADOS) {
    if (!hojas[grado]) continue;
    const { headers, filas } = hojas[grado];
    const ws = libro.addWorksheet(grado);
    ws.addRow(headers);
    for (const f of filas) ws.addRow(headers.map((h) => (f[h] === undefined ? null : f[h])));
    headers.forEach((h, k) => {
      const cell = ws.getRow(1).getCell(k + 1);
      const e = estilo[h];
      if (e) { cell.fill = e.fill; cell.alignment = e.alignment; }
      else if (h === NHV) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9DC3E6' } };
      cell.font = { name: 'Arial', size: 10, bold: true };
      ws.getColumn(k + 1).width = ancho[h] || 14;
    });
    resumen.push(`${grado}: ${filas.length} personas`);
  }
  libro.addWorksheet('No encontrados').addRow(['Fecha/Hora', 'Nombre', 'Voto', 'Operador']).font = { bold: true };
  return { libro, resumen };
}

module.exports = { sincronizar, CE, NHV, ALIAS };

if (require.main === module) {
  const [padronPath, listasPath, salida] = process.argv.slice(2);
  if (!padronPath || !listasPath || !salida) {
    console.error('Uso: node src/sincronizarListas.js <padron.xlsx> <listas.xlsx> <salida.xlsx>');
    process.exit(1);
  }
  (async () => {
    const padron = new ExcelJS.Workbook(); await padron.xlsx.readFile(padronPath);
    const listas = new ExcelJS.Workbook(); await listas.xlsx.readFile(listasPath);
    const { libro, resumen } = sincronizar(padron, listas);
    await libro.xlsx.writeFile(salida);
    console.log(resumen.join('\n'));
  })().catch((err) => { console.error(err); process.exit(1); });
}

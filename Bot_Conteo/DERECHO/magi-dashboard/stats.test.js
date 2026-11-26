'use strict';
// node --test magi-dashboard/stats.test.js
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const { statsFromWorkbook } = require('./server');

const OPCIONES = ['Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron', 'No ha votado'];

test('cuenta por candidato, solo los 4 grados y tolera columnas faltantes', () => {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet('Primer año');
  s1.addRow(['Salon', 'Nombre', 'Castelan', 'Confirmado', 'Voto Confirmado', 'Fecha/Hora', 'Discrepancia']);
  s1.addRow(['A', 'Ana', 1, 'SI', 'Castelan', '2026-11-19T10:00:00Z', null]);
  s1.addRow(['A', 'Beto', null, 'SI', 'Tomas', '2026-11-19T10:01:00Z', 'x']);
  s1.addRow(['B', 'Carla', null, 'NO', null, null, null]);
  for (const g of ['Segundo año', 'Tercer año']) wb.addWorksheet(g).addRow(['Salon', 'Nombre']);
  const s4 = wb.addWorksheet('Cuarto año');
  s4.addRow(['Salon', 'Nombre']); // sin columnas de confirmación aún
  s4.addRow(['D', 'Fer']);
  const ne = wb.addWorksheet('No encontrados');
  ne.addRow(['Fecha/Hora', 'Nombre', 'Voto', 'Operador']);
  ne.addRow(['2026-11-19T10:02:00Z', 'Desconocido', 'Jade', 'op']);

  const st = statsFromWorkbook(wb);
  assert.deepStrictEqual(st.candidatos, OPCIONES);
  assert.strictEqual(st.totales.votos.Castelan, 1);
  assert.strictEqual(st.totales.otros, 1); // "Tomas" no es una opción de DERECHO
  assert.strictEqual(st.totales.confirmados, 2);
  assert.strictEqual(st.totales.padron, 4, 'No encontrados no suma al padrón');
  assert.strictEqual(st.totales.pendientes, 2);
  assert.strictEqual(st.totales.discrepancias, 1);
  assert.deepStrictEqual(st.grados.map((g) => g.hoja), ['Primer año', 'Segundo año', 'Tercer año', 'Cuarto año']);
  assert.strictEqual(st.grados[3].confirmados, 0);
  assert.strictEqual(st.actividad[0].nombre, 'Beto');
});

test('sin confirmar cuenta solo No ha votado; confirmadas cuentan por su voto confirmado', () => {
  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet('Tercer año');
  s.addRow(['Salon', 'Nombre', ...OPCIONES, 'Confirmado', 'Voto Confirmado']);
  const fila = (nombre, marca, confirmado, voto) =>
    s.addRow(['A', nombre, ...OPCIONES.map((o) => (o === marca ? 1 : null)), confirmado, voto]);
  fila('Marca Jade Sin Confirmar', 'Jade', 'NO', null);
  fila('No Ha Votado Sin Confirmar', 'No ha votado', 'NO', null);
  fila('Sin Marca Sin Confirmar', null, null, null);
  fila('Marca Aaron Confirmada German', 'Aaron', 'SI', 'german'); // vale el voto confirmado, no la marca
  const st = statsFromWorkbook(wb);
  assert.strictEqual(st.totales.votos.Jade, 0, 'la marca sin confirmar no suma');
  assert.strictEqual(st.totales.votos.Aaron, 0);
  assert.strictEqual(st.totales.votos.German, 1);
  assert.strictEqual(st.totales.votos['No ha votado'], 1);
  assert.strictEqual(st.totales.confirmados, 1);
  assert.strictEqual(st.totales.pendientes, 3);
});

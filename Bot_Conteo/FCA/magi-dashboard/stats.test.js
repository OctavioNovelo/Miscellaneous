'use strict';
// node --test magi-dashboard/stats.test.js
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const { statsFromWorkbook } = require('./server');

test('cuenta por candidato y tolera columnas faltantes', () => {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet('Primer año');
  s1.addRow(['Salon', 'Nombre', 'Voto Omar', 'Confirmado', 'Voto Confirmado', 'Fecha/Hora', 'Discrepancia']);
  s1.addRow(['A', 'Ana', 1, 'SI', 'Voto Omar', '2026-11-19T10:00:00Z', null]);
  s1.addRow(['A', 'Beto', null, 'SI', 'Alex', '2026-11-19T10:01:00Z', 'x']);
  s1.addRow(['B', 'Carla', null, 'NO', null, null, null]);
  const s4 = wb.addWorksheet('Cuarto año');
  s4.addRow(['Salon', 'Nombre']); // sin columnas de confirmación aún
  s4.addRow(['D', 'Fer']);

  const st = statsFromWorkbook(wb);
  assert.deepStrictEqual(st.candidatos, ['Voto Omar', 'NO voto por Omar', 'No ha votado']);
  assert.strictEqual(st.totales.votos['Voto Omar'], 1);
  assert.strictEqual(st.totales.otros, 1); // "Alex" ya no es una opción de voto
  assert.strictEqual(st.totales.confirmados, 2);
  assert.strictEqual(st.totales.pendientes, 2);
  assert.strictEqual(st.totales.discrepancias, 1);
  assert.deepStrictEqual(st.grados.map((g) => g.hoja), ['Primer año', 'Cuarto año']);
  assert.ok(st.grados.every((g) => !('magi' in g)));
  assert.strictEqual(st.grados[1].confirmados, 0);
  assert.strictEqual(st.actividad[0].nombre, 'Beto');
});

test('sin confirmar cuenta solo No ha votado; confirmadas cuentan por su voto confirmado', () => {
  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet('Quinto año');
  s.addRow(['Salon', 'Nombre', 'Voto Omar', 'NO voto por Omar', 'No ha votado', 'Confirmado', 'Voto Confirmado']);
  s.addRow(['A', 'Marca Omar Sin Confirmar', 1, null, null, 'NO', null]);
  s.addRow(['A', 'No Ha Votado Sin Confirmar', null, null, 1, 'NO', null]);
  s.addRow(['A', 'Confirmada NO', null, 1, null, 'SI', 'NO voto por Omar']);
  const st = statsFromWorkbook(wb);
  assert.strictEqual(st.totales.votos['Voto Omar'], 0, 'la marca sin confirmar no suma');
  assert.strictEqual(st.totales.votos['NO voto por Omar'], 1);
  assert.strictEqual(st.totales.votos['No ha votado'], 1);
  assert.strictEqual(st.totales.confirmados, 1);
  assert.strictEqual(st.totales.pendientes, 2);
});

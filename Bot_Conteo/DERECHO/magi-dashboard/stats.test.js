'use strict';
// node --test magi-dashboard/stats.test.js
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const { statsFromWorkbook } = require('./server');

test('cuenta por candidato y tolera columnas faltantes', () => {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet('Primer año');
  s1.addRow(['Salon', 'Nombre', 'Castelan', 'Confirmado', 'Voto Confirmado', 'Fecha/Hora', 'Discrepancia']);
  s1.addRow(['A', 'Ana', 1, 'SI', 'Castelán', '2026-11-19T10:00:00Z', null]);
  s1.addRow(['A', 'Beto', null, 'SI', 'Alex', '2026-11-19T10:01:00Z', 'x']);
  s1.addRow(['B', 'Carla', null, 'NO', null, null, null]);
  const s4 = wb.addWorksheet('Cuarto año');
  s4.addRow(['Salon', 'Nombre']); // sin columnas de confirmación aún
  s4.addRow(['D', 'Fer']);

  const st = statsFromWorkbook(wb);
  assert.deepStrictEqual(st.candidatos, ['Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron']);
  assert.strictEqual(st.totales.votos.Castelan, 1);
  assert.strictEqual(st.totales.otros, 1); // "Alex" ya no es candidato
  assert.strictEqual(st.totales.confirmados, 2);
  assert.strictEqual(st.totales.pendientes, 2);
  assert.strictEqual(st.totales.discrepancias, 1);
  assert.deepStrictEqual(st.grados.map((g) => g.magi), ['MELCHIOR-1', 'MAGI-4']);
  assert.strictEqual(st.grados[1].confirmados, 0);
  assert.strictEqual(st.actividad[0].nombre, 'Beto');
});

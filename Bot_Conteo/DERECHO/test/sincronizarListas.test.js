'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { sincronizar } = require('../src/sincronizarListas');

// Datos sintéticos: ningún nombre real.
function libroPadron() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Primer año');
  ws.addRow(['Salon', 'Nombre', 'Número Tel.', 'Tomas ', 'Alex', 'Indeciso ', 'Indeciso CE', 'Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron', 'Operador', 'Confirmado']);
  ws.addRow(['A', 'Persona Uno', null, null, null, null, null, null, null, null, null, null, null, 'Op1', 'NO']);
  ws.addRow(['B', 'Persona Dos', null, 1, null, null, 1, null, null, null, null, null, null, null, 'NO']);
  return wb;
}

function libroLista() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Primer año');
  ws.addRow(['Salon', 'Nombre', 'Número Tel.', 'Tomas ', 'Alex', 'Indeciso SA', 'Indeciso CE', 'Castelan', 'German', 'Natalia', 'Gabriel', 'Jade', 'Aaron', 'Operador']);
  ws.addRow(['A', 'Persona Uno', null, null, null, null, null, null, null, null, null, null, 1, 'Op1']);
  ws.addRow(['B', 'Persona Nueva', null, null, null, null, null, null, 1, null, null, null, null, 'Op2']);
  ws.addRow(['C', 'Sin Marca', null, null, null, null, 1, null, null, null, null, null, null, 'Op3']);
  return wb;
}

test('quita Indeciso CE, agrega No ha votado y marca la opción CE de la lista', () => {
  const { libro } = sincronizar(libroPadron(), libroLista());
  const ws = libro.getWorksheet('Primer año');
  const h = ws.getRow(1).values.slice(1);
  assert.ok(!h.includes('Indeciso CE'));
  assert.ok(h.includes('No ha votado'));
  const fila = (n) => ws.getRows(2, 3).find((r) => r.getCell(2).value === n);
  assert.equal(fila('Persona Uno').getCell(h.indexOf('Aaron') + 1).value, 1);
  assert.equal(fila('Persona Uno').getCell(h.indexOf('No ha votado') + 1).value, null);
});

test('agrega a quien no está en el padrón como sin confirmar y con su marca', () => {
  const { libro, resumen } = sincronizar(libroPadron(), libroLista());
  const ws = libro.getWorksheet('Primer año');
  const h = ws.getRow(1).values.slice(1);
  const nueva = ws.getRows(2, 10).find((r) => r.getCell(2).value === 'Persona Nueva');
  assert.ok(nueva, 'debe agregar a Persona Nueva');
  assert.equal(nueva.getCell(h.indexOf('German') + 1).value, 1);
  assert.equal(nueva.getCell(h.indexOf('Confirmado') + 1).value, 'NO');
  assert.ok(resumen.some((l) => l.includes('agregado a Primer año: Persona Nueva')));
});

test('sin marca CE queda en No ha votado; la hoja No encontrados existe', () => {
  const { libro } = sincronizar(libroPadron(), libroLista());
  const ws = libro.getWorksheet('Primer año');
  const h = ws.getRow(1).values.slice(1);
  const sin = ws.getRows(2, 10).find((r) => r.getCell(2).value === 'Sin Marca');
  assert.equal(sin.getCell(h.indexOf('No ha votado') + 1).value, 1);
  assert.ok(libro.getWorksheet('No encontrados'));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ExcelManager, COL } = require('../src/excelManager');

// Trabaja sobre una copia temporal: el padrón real nunca se modifica en las pruebas.
async function cargarCopia() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'padron-test-'));
  const copia = path.join(dir, 'Padron.xlsx');
  fs.copyFileSync(path.join(__dirname, '..', 'data', 'Padron.xlsx'), copia);
  const m = new ExcelManager(copia);
  await m.load();
  return m;
}

/** Busca una persona real sin confirmar en la hoja indicada. */
function personaSinConfirmar(m, hoja) {
  const sheet = m.workbook.getWorksheet(hoja);
  let found = null;
  sheet.eachRow((row, n) => {
    if (found || n === 1) return;
    const nombre = row.getCell(COL.NOMBRE).value;
    const seccion = row.getCell(COL.SECCION).value;
    const confirmado = String(row.getCell(COL.CONFIRMADO).value || '').toUpperCase() === 'SI';
    if (nombre && seccion && !confirmado) found = { nombre: String(nombre), seccion: String(seccion) };
  });
  assert.ok(found, 'el padrón debe tener al menos una persona sin confirmar');
  return found;
}

test('persona inexistente: NOMBRE_NO_ENCONTRADO y no se agrega ninguna fila', async () => {
  const m = await cargarCopia();
  const sheet = m.workbook.getWorksheet('Segundo año');
  const antes = sheet.rowCount;
  const r = m.processVote({ nombre: 'Persona Inexistente Zzz', seccion: 'A', grado: 'Segundo', voto: 'Alex', operador: 'Prueba' });
  assert.equal(r.status, 'NOMBRE_NO_ENCONTRADO');
  assert.equal(sheet.rowCount, antes);
});

test('sección inexistente: SECCION_NO_ENCONTRADA', async () => {
  const m = await cargarCopia();
  const r = m.processVote({ nombre: 'Juan Prueba', seccion: 'Z', grado: 'Segundo', voto: 'Alex', operador: 'Prueba' });
  assert.equal(r.status, 'SECCION_NO_ENCONTRADA');
});

test('grado inexistente: GRADO_NO_ENCONTRADO', async () => {
  const m = await cargarCopia();
  const r = m.processVote({ nombre: 'Juan Prueba', seccion: 'A', grado: 'Decimo', voto: 'Alex', operador: 'Prueba' });
  assert.equal(r.status, 'GRADO_NO_ENCONTRADO');
});

test('persona real sin confirmar: REGISTRADO, queda confirmada, y el segundo reporte del mismo voto es duplicado', async () => {
  const m = await cargarCopia();
  const { nombre, seccion } = personaSinConfirmar(m, 'Segundo año');

  const primero = m.processVote({ nombre, seccion, grado: 'Segundo', voto: 'Tomas', operador: 'Operador A' });
  assert.equal(primero.status, 'REGISTRADO');
  assert.equal(primero.voto, 'Tomas');

  const row = m.workbook.getWorksheet('Segundo año').getRow(primero.rowNumber);
  assert.equal(row.getCell(COL.CONFIRMADO).value, 'SI');

  const segundo = m.processVote({ nombre, seccion, grado: 'Segundo', voto: 'Tomas', operador: 'Operador B' });
  assert.equal(segundo.status, 'DUPLICADO_IGNORADO');
});

test('mismo nombre con voto distinto de otro operador: DISCREPANCIA y el voto original se mantiene', async () => {
  const m = await cargarCopia();
  const { nombre, seccion } = personaSinConfirmar(m, 'Segundo año');
  m.processVote({ nombre, seccion, grado: 'Segundo', voto: 'Tomas', operador: 'Operador A' });
  const r = m.processVote({ nombre, seccion, grado: 'Segundo', voto: 'Alex', operador: 'Operador B' });
  assert.equal(r.status, 'DISCREPANCIA');
  assert.equal(r.votoPrevio, 'Tomas');
});

test('edición manual del Excel: recargarSiCambio la recoge antes de registrar', async () => {
  const m = await cargarCopia();
  // Otra instancia edita el archivo por fuera, como lo haría una persona en Excel.
  const { nombre, seccion } = personaSinConfirmar(m, 'Segundo año');
  const otro = new ExcelManager(m.filePath);
  await otro.load();
  otro.workbook.getWorksheet('Segundo año').getRow(2).getCell(COL.OPERADOR_ASIGNADO).value = 'Editado a mano';
  await otro.workbook.xlsx.writeFile(m.filePath);
  // Fuerza un mtime distinto aunque el sistema de archivos tenga poca resolución.
  const futuro = new Date(Date.now() + 5000);
  fs.utimesSync(m.filePath, futuro, futuro);

  assert.equal(await m.recargarSiCambio(), true);
  assert.equal(m.workbook.getWorksheet('Segundo año').getRow(2).getCell(COL.OPERADOR_ASIGNADO).value, 'Editado a mano');

  // Sin cambios posteriores no recarga.
  assert.equal(await m.recargarSiCambio(), false);
  const r = m.processVote({ nombre, seccion, grado: 'Segundo', voto: 'Alex', operador: 'Prueba' });
  assert.equal(r.status, 'REGISTRADO');
  // El voto se aplicó sobre el archivo ya editado: la edición manual sigue ahí.
  assert.equal(m.workbook.getWorksheet('Segundo año').getRow(2).getCell(COL.OPERADOR_ASIGNADO).value, 'Editado a mano');
});

test('recuperar: si el disco no se puede leer, conserva el libro anterior y devuelve false', async () => {
  const m = await cargarCopia();
  const hojasAntes = m.workbook.worksheets.map((s) => s.name);
  fs.unlinkSync(m.filePath);
  assert.equal(await m.recuperar(), false);
  assert.deepEqual(m.workbook.worksheets.map((s) => s.name), hojasAntes);
});

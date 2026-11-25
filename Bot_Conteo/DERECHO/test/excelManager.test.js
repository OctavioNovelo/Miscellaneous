'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ExcelManager, colsOf, CANDIDATOS } = require('../src/excelManager');

// Trabaja sobre una copia temporal: el padrón real nunca se modifica en las pruebas.
async function cargarCopia() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'padron-test-'));
  const copia = path.join(dir, 'Padron.xlsx');
  fs.copyFileSync(path.join(__dirname, '..', 'data', 'Padron.xlsx'), copia);
  const m = new ExcelManager(copia);
  await m.load();
  return m;
}

/** Índice de columna por encabezado en una hoja: el Excel no tiene un orden fijo. */
const col = (m, hoja, key) => colsOf(m.workbook.getWorksheet(hoja))[key];

/** Busca una persona real sin confirmar en la hoja indicada. */
function personaSinConfirmar(m, hoja) {
  const sheet = m.workbook.getWorksheet(hoja);
  const c = colsOf(sheet);
  let found = null;
  sheet.eachRow((row, n) => {
    if (found || n === 1) return;
    const nombre = row.getCell(c.NOMBRE).value;
    const confirmado = String(row.getCell(c.CONFIRMADO).value || '').toUpperCase() === 'SI';
    if (nombre && !confirmado) found = { nombre: String(nombre) };
  });
  assert.ok(found, 'el padrón debe tener al menos una persona sin confirmar');
  return found;
}

test('persona inexistente: NOMBRE_NO_ENCONTRADO sin tocar los grados; se anota en "No encontrados"', async () => {
  const m = await cargarCopia();
  const sheet = m.workbook.getWorksheet('Segundo año');
  const antes = sheet.rowCount;
  const aviso = m.workbook.getWorksheet('No encontrados').rowCount;
  const r = m.processVote({ nombre: 'Persona Inexistente Zzz', voto: 'Jade', operador: 'Prueba' });
  assert.equal(r.status, 'NOMBRE_NO_ENCONTRADO');
  assert.equal(sheet.rowCount, antes);
  const anotado = m.registrarNoEncontrado({ nombre: 'Persona Inexistente Zzz', voto: 'Jade', operador: 'Prueba' });
  assert.equal(anotado.status, 'ANOTADO_NO_ENCONTRADO');
  const hoja = m.workbook.getWorksheet('No encontrados');
  assert.equal(hoja.rowCount, aviso + 1);
  assert.equal(hoja.getRow(hoja.rowCount).getCell(2).value, 'Persona Inexistente Zzz');
});

test('candidato que no está en la tabla de Aaron: CANDIDATO_NO_VALIDO y el Excel no cambia', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Segundo año');
  const r = m.processVote({ nombre, voto: 'Tomas', operador: 'Prueba' });
  assert.equal(r.status, 'CANDIDATO_NO_VALIDO');
  assert.deepEqual(r.opciones, CANDIDATOS);
  const row = m.workbook.getWorksheet('Segundo año').getRow(m.workbook.getWorksheet('Segundo año').rowCount);
  assert.notEqual(row.getCell(col(m, 'Segundo año', 'CONFIRMADO')).value, 'SI');
});

test('persona real sin confirmar: REGISTRADO con su candidato, y el mismo voto repetido es duplicado', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Segundo año');

  const primero = m.processVote({ nombre, voto: 'Jade', operador: 'Operador A' });
  assert.equal(primero.status, 'REGISTRADO');
  assert.equal(primero.voto, 'Jade');

  const c = colsOf(m.workbook.getWorksheet('Segundo año'));
  const row = m.workbook.getWorksheet('Segundo año').getRow(primero.rowNumber);
  assert.equal(row.getCell(c.CONFIRMADO).value, 'SI');
  assert.equal(row.getCell(c.candidatos.Jade).value, 1);
  assert.equal(row.getCell(c.candidatos.Aaron).value, null, 'los otros candidatos quedan en blanco');

  const segundo = m.processVote({ nombre, voto: 'Jade', operador: 'Operador B' });
  assert.equal(segundo.status, 'DUPLICADO_IGNORADO');
});

test('mismo nombre con otro candidato de otro operador: DISCREPANCIA y el voto original se mantiene', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Segundo año');
  m.processVote({ nombre, voto: 'Jade', operador: 'Operador A' });
  const r = m.processVote({ nombre, voto: 'Gabriel', operador: 'Operador B' });
  assert.equal(r.status, 'DISCREPANCIA');
  assert.equal(r.votoPrevio, 'Jade');
});

test('sin voto explícito el candidato es Aaron', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Tercer año');
  const r = m.processVote({ nombre, voto: 'Aaron', operador: 'Prueba' });
  assert.equal(r.status, 'REGISTRADO');
  assert.equal(r.hoja, 'Tercer año');
  const c = colsOf(m.workbook.getWorksheet('Tercer año'));
  assert.equal(m.workbook.getWorksheet('Tercer año').getRow(r.rowNumber).getCell(c.candidatos.Aaron).value, 1);
});

test('edición manual del Excel: recargarSiCambio la recoge antes de registrar', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Segundo año');
  // Otra instancia edita el archivo por fuera, como lo haría una persona en Excel.
  const otro = new ExcelManager(m.filePath);
  await otro.load();
  otro.workbook.getWorksheet('Segundo año').getRow(2).getCell(col(otro, 'Segundo año', 'OPERADOR_ASIGNADO')).value = 'Editado a mano';
  await otro.workbook.xlsx.writeFile(m.filePath);
  // Fuerza un mtime distinto aunque el sistema de archivos tenga poca resolución.
  const futuro = new Date(Date.now() + 5000);
  fs.utimesSync(m.filePath, futuro, futuro);

  assert.equal(await m.recargarSiCambio(), true);
  assert.equal(m.workbook.getWorksheet('Segundo año').getRow(2).getCell(col(m, 'Segundo año', 'OPERADOR_ASIGNADO')).value, 'Editado a mano');

  // Sin cambios posteriores no recarga.
  assert.equal(await m.recargarSiCambio(), false);
  const r = m.processVote({ nombre, voto: 'Natalia', operador: 'Prueba' });
  assert.equal(r.status, 'REGISTRADO');
  // El voto se aplicó sobre el archivo ya editado: la edición manual sigue ahí.
  assert.equal(m.workbook.getWorksheet('Segundo año').getRow(2).getCell(col(m, 'Segundo año', 'OPERADOR_ASIGNADO')).value, 'Editado a mano');
});

test('recuperar: si el disco no se puede leer, conserva el libro anterior y devuelve false', async () => {
  const m = await cargarCopia();
  const hojasAntes = m.workbook.worksheets.map((s) => s.name);
  fs.unlinkSync(m.filePath);
  assert.equal(await m.recuperar(), false);
  assert.deepEqual(m.workbook.worksheets.map((s) => s.name), hojasAntes);
});

test('grado y salón limitan la búsqueda: el mismo nombre en otro grado no se toma', async () => {
  const m = await cargarCopia();
  const { nombre } = personaSinConfirmar(m, 'Segundo año');
  // Con el grado equivocado no debe encontrarla: la búsqueda queda dentro de Primer año.
  const mal = m.processVote({ nombre, voto: 'Jade', operador: 'Prueba', grado: 'Primer año' });
  assert.notEqual(mal.hoja, 'Segundo año');
  const bien = m.processVote({ nombre, voto: 'Jade', operador: 'Prueba', grado: 'Segundo año' });
  assert.equal(bien.status, 'REGISTRADO');
  assert.equal(bien.hoja, 'Segundo año');
});

test('Excel combinado: agrega columnas de confirmación al cargar', async () => {
  const m = await cargarCopia();
  const c = colsOf(m.workbook.getWorksheet('Primer año'));
  assert.notEqual(c.CONFIRMADO, -1);
  assert.notEqual(c.VOTO_CONFIRMADO, -1);
  assert.notEqual(c.DISCREPANCIA, -1);
});

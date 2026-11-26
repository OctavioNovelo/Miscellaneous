'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, parseGrado, construirLibro, HEADERS, HOJAS } = require('../src/normalizarPadron');
const { GRADO_SHEETS } = require('../src/excelManager');

test('parseCsv: comillas, comillas escapadas y comas dentro de celda', () => {
  assert.deepEqual(parseCsv('a,"Leslie ""negra""","1,5"\r\nb,,\n'), [['a', 'Leslie "negra"', '1,5'], ['b', '', '']]);
});

test('parseGrado: un bloque; ignora totales laterales y filas vacías', () => {
  const csv = ',,,,,,\nOperador,Nombre del alumno,Voto,¿Entró a votar?,,,\nNicolás,Ana Pech,SI,,,Totales con voto seguro:,1\n,Beto Can,INSEGURO,,,,\n,,,,,,\n';
  const { alumnos, descartadas } = parseGrado(csv);
  assert.deepEqual(alumnos, [
    { salon: '', nombre: 'Ana Pech', operador: 'Nicolás', voto: 'SI' },
    { salon: '', nombre: 'Beto Can', operador: '', voto: 'INSEGURO' },
  ]);
  assert.deepEqual(descartadas, []);
});

test('parseGrado: bloques por salón lado a lado; descarta los renglones "Total voto seguro="', () => {
  const csv = [
    'SALÓN A,,,,SALÓN B,,,',
    'Operador,Nombre del alumno,Voto,,Operador,Nombre del alumno,Voto,',
    'Op1,Ana,SI,,Op2,Beto,SI,',
    ',,,,Op2,Carla,SI,',
    ',Total voto seguro=,1,,,Total voto seguro=,2,',
    'SALÓN G,,,,,,,',
    'Operador,Nombre del alumno,Voto,,,,,',
    'Op3,Dani,SI,,,,,',
  ].join('\n');
  const { alumnos, descartadas } = parseGrado(csv);
  assert.deepEqual(alumnos.map((a) => `${a.salon}:${a.nombre}`), ['A:Ana', 'B:Beto', 'B:Carla', 'G:Dani']);
  assert.equal(descartadas.length, 2);
});

test('construirLibro: una hoja por grado con los encabezados del padrón', () => {
  const wb = construirLibro([['Quinto año', [{ salon: 'A', nombre: 'Ana', operador: 'Op1' }]]]);
  const ws = wb.getWorksheet('Quinto año');
  assert.deepEqual(ws.getRow(1).values.slice(1), HEADERS);
  const fila = ws.getRow(2);
  assert.equal(fila.getCell(HEADERS.indexOf('Salon') + 1).value, 'A');
  assert.equal(fila.getCell(HEADERS.indexOf('Nombre') + 1).value, 'Ana');
  assert.equal(fila.getCell(HEADERS.indexOf('Operador') + 1).value, 'Op1');
});

test('las hojas que genera el normalizador son exactamente las que lee el bot', () => {
  assert.deepEqual(Object.values(HOJAS), GRADO_SHEETS);
});

test('parseGrado: un renglón "SALÓN X" nuevo no se toma como alumno', () => {
  const csv = [
    'SALÓN A,SALÓN A,SALÓN A',
    'Operador,Nombre del alumno,Voto',
    'Op1,Ana,SI',
    'SALÓN G,SALÓN G,SALÓN G',
    'Operador,Nombre del alumno,Voto',
    'Op2,Beto,NO',
  ].join('\n');
  const { alumnos } = parseGrado(csv);
  assert.deepEqual(alumnos.map((a) => `${a.salon}:${a.nombre}:${a.voto}`), ['A:Ana:SI', 'G:Beto:NO']);
});

test('construirLibro: SI -> marca Voto Omar; NO, INSEGURO y vacío -> No ha votado; todo sin confirmar', () => {
  const alumnos = [
    { salon: '', nombre: 'Ana', operador: 'Op1', voto: 'SI' },
    { salon: '', nombre: 'Beto', operador: '', voto: 'NO' },
    { salon: '', nombre: 'Carla', operador: '', voto: 'INSEGURO' },
    { salon: '', nombre: 'Dani', operador: '', voto: '' },
  ];
  const ws = construirLibro([['OTROS', alumnos]]).getWorksheet('OTROS');
  const celda = (fila, col) => ws.getRow(fila).getCell(HEADERS.indexOf(col) + 1).value;
  assert.equal(celda(2, 'Voto Omar'), 1);
  assert.equal(celda(3, 'No ha votado'), 1);
  for (const fila of [2, 3, 4, 5]) {
    assert.equal(celda(fila, 'Confirmado'), 'NO');
    assert.equal(celda(fila, 'Voto Confirmado'), null);
  }
  assert.equal(celda(4, 'No ha votado'), 1);
  assert.equal(celda(5, 'No ha votado'), 1);
});

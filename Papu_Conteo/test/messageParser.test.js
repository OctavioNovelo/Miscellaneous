'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVoteMessage } = require('../src/messageParser');

const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

test('ignora mensajes que no empiezan con VOTO (chat normal del grupo)', () => {
  assert.deepEqual(parseVoteMessage('hola a todos', SECCIONES), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('Juan Perez\nA\nSegundo', SECCIONES), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('VOTOS del sábado', SECCIONES), { ok: false, ignorar: true });
});

test('formato multilínea con VOTO en su propia línea', () => {
  const r = parseVoteMessage('VOTO\nOctavio Augusto Novelo Martinez\nA\nSegundo\nTomas', SECCIONES);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, {
    nombres: ['Octavio Augusto Novelo Martinez'],
    seccion: 'A',
    grado: 'Segundo',
    voto: 'Tomas',
  });
});

test('voto omitido cuenta como Alex y acepta varios nombres', () => {
  const r = parseVoteMessage('VOTO\nJuan Perez\nMaria Lopez\nC\nTercero', SECCIONES);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.nombres, ['Juan Perez', 'Maria Lopez']);
  assert.equal(r.data.voto, 'Alex');
});

test('VOTO en la misma línea que el nombre también es válido', () => {
  const r = parseVoteMessage('voto: Juan Perez C Segundo', SECCIONES);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, { nombres: ['Juan Perez'], seccion: 'C', grado: 'Segundo', voto: 'Alex' });
});

test('un apellido como Alexis no se toma como voto', () => {
  const r = parseVoteMessage('VOTO\nMaria Lopez Alexis\nA\nSegundo', SECCIONES);
  assert.equal(r.ok, true);
  assert.equal(r.data.nombres[0], 'Maria Lopez Alexis');
  assert.equal(r.data.voto, 'Alex');
});

test('grado o sección inválidos devuelven error, no un registro con datos incompletos', () => {
  const grado = parseVoteMessage('VOTO\nJuan Perez\nA\nDecimo', SECCIONES);
  assert.equal(grado.ok, false);
  assert.match(grado.error, /Grado inválido/);

  const seccion = parseVoteMessage('VOTO\nJuan Perez\nZ\nSegundo', SECCIONES);
  assert.equal(seccion.ok, false);
  assert.match(seccion.error, /Sección inválida/);
});

test('VOTO sin datos devuelve error', () => {
  const r = parseVoteMessage('VOTO', SECCIONES);
  assert.equal(r.ok, false);
});

test('sin nombres (solo sección, grado y voto) devuelve error y no un voto vacío', () => {
  const r = parseVoteMessage('VOTO\nA\n3\nTomas', SECCIONES);
  assert.equal(r.ok, false);
});

test('una línea sin sección ni grado devuelve error; nunca busca en todas las hojas', () => {
  const r = parseVoteMessage('VOTO Juan Perez', SECCIONES);
  assert.equal(r.ok, false);
  assert.match(r.error, /Faltan la sección/);
});

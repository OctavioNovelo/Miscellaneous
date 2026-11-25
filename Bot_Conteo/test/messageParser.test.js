'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVoteMessage } = require('../src/messageParser');

test('ignora mensajes que no empiezan con VOTO (chat normal del grupo)', () => {
  assert.deepEqual(parseVoteMessage('hola a todos'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('Juan Perez\nJade'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('VOTOS del sábado'), { ok: false, ignorar: true });
});

test('nombre completo y por quién votas', () => {
  const r = parseVoteMessage('VOTO\nOctavio Augusto Novelo Martinez\nJade');
  assert.deepEqual(r, { ok: true, data: { nombre: 'Octavio Augusto Novelo Martinez', voto: 'Jade', grado: null, seccion: null } });
});

test('sin segunda línea el voto es Aaron por defecto', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez').data, { nombre: 'Juan Perez', voto: 'Aaron', grado: null, seccion: null });
});

test('una sola línea después de VOTO es el nombre', () => {
  assert.deepEqual(parseVoteMessage('VOTO: Juan Perez').data, { nombre: 'Juan Perez', voto: 'Aaron', grado: null, seccion: null });
});

test('grado y salón en la línea del nombre se quitan del nombre', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez Segundo A\nJade').data, {
    nombre: 'Juan Perez', voto: 'Jade', grado: 'Segundo año', seccion: 'A',
  });
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez Primer año c').data, {
    nombre: 'Juan Perez', voto: 'Aaron', grado: 'Primer año', seccion: 'C',
  });
});

test('sin grado ni salón el campo queda vacío', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez').data, {
    nombre: 'Juan Perez', voto: 'Aaron', grado: null, seccion: null,
  });
});

test('más de dos líneas o sin nombre devuelven error', () => {
  assert.equal(parseVoteMessage('VOTO\nJuan\nJade\nSegundo').ok, false);
  assert.equal(parseVoteMessage('VOTO').ok, false);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVoteMessage } = require('../src/messageParser');

test('ignora mensajes que no empiezan con VOTO (chat normal del grupo)', () => {
  assert.deepEqual(parseVoteMessage('hola a todos\nnos vemos'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('Juan Perez\nJade'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('VOTOS del sábado\nsí'), { ok: false, ignorar: true });
});

test('nombre completo y por quién votas', () => {
  const r = parseVoteMessage('VOTO\nOctavio Augusto Novelo Martinez\nJade');
  assert.deepEqual(r, { ok: true, data: { nombre: 'Octavio Augusto Novelo Martinez', voto: 'Jade', grado: null, seccion: null } });
});

test('sin segunda línea el voto es Voto Omar por defecto', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez').data, { nombre: 'Juan Perez', voto: 'Voto Omar', grado: null, seccion: null });
});

test('una sola línea después de VOTO es el nombre', () => {
  assert.deepEqual(parseVoteMessage('VOTO: Juan Perez').data, { nombre: 'Juan Perez', voto: 'Voto Omar', grado: null, seccion: null });
});

test('grado y salón en la línea del nombre se quitan del nombre', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez Segundo A\nJade').data, {
    nombre: 'Juan Perez', voto: 'Jade', grado: 'Segundo año', seccion: 'A',
  });
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez Primer año c').data, {
    nombre: 'Juan Perez', voto: 'Voto Omar', grado: 'Primer año', seccion: 'C',
  });
});

test('sin grado ni salón el campo queda vacío', () => {
  assert.deepEqual(parseVoteMessage('VOTO\nJuan Perez').data, {
    nombre: 'Juan Perez', voto: 'Voto Omar', grado: null, seccion: null,
  });
});

test('más de dos líneas o sin nombre devuelven error', () => {
  assert.equal(parseVoteMessage('VOTO\nJuan\nJade\nSegundo').ok, false);
  assert.equal(parseVoteMessage('VOTO').ok, false);
});

test('reconoce los grados de Quinto a Noveno y OTROS, con o sin acento y "año"', () => {
  const casos = {
    'Quinto': 'Quinto año', 'Sexto año': 'Sexto año', 'Séptimo': 'Séptimo año', 'septimo': 'Séptimo año',
    'Octavo': 'Octavo año', 'Noveno año': 'Noveno año', 'OTROS': 'OTROS', 'otros': 'OTROS',
    'Primero': 'Primer año', 'Cuarto': 'Cuarto año',
  };
  for (const [texto, grado] of Object.entries(casos)) {
    assert.deepEqual(parseVoteMessage(`VOTO\nAna Lopez ${texto} B\nJade`).data, {
      nombre: 'Ana Lopez', voto: 'Jade', grado, seccion: 'B',
    }, texto);
  }
});

test('sin VOTO, una sola línea es el nombre y cuenta como Voto Omar', () => {
  assert.deepEqual(parseVoteMessage('Pepe Botellas'), {
    ok: true, sinPrefijo: true, data: { nombre: 'Pepe Botellas', voto: 'Voto Omar', grado: null, seccion: null },
  });
  assert.deepEqual(parseVoteMessage('Ana Lopez Segundo A').data, {
    nombre: 'Ana Lopez', voto: 'Voto Omar', grado: 'Segundo año', seccion: 'A',
  });
});

test('sin VOTO, varias líneas o una línea vacía son chat y se ignoran', () => {
  assert.deepEqual(parseVoteMessage('Pepe Botellas\nNo ha votado'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('   '), { ok: false, ignorar: true });
});

test('sin VOTO, respuestas del bot con emoji o dos puntos no son nombres', () => {
  assert.deepEqual(parseVoteMessage('⚠️ Yumely Lavadores: ya estaba registrado con ese mismo voto.'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage('✅ Voto registrado.'), { ok: false, ignorar: true });
  assert.deepEqual(parseVoteMessage("Maria D'Angelo-Perez").data.nombre, "Maria D'Angelo-Perez");
});

'use strict';

const { normalize } = require('./matcher');

// Si el mensaje no trae la segunda línea (por quién vota), se cuenta para Voto Omar.
const VOTO_POR_DEFECTO = 'Voto Omar';

// Palabras reservadas de grado: si aparecen en el nombre, se toman como grado y no como parte del nombre.
const GRADOS = {
  PRIMERO: 'Primer año',
  PRIMER: 'Primer año',
  SEGUNDO: 'Segundo año',
  TERCERO: 'Tercer año',
  TERCER: 'Tercer año',
  CUARTO: 'Cuarto año',
  QUINTO: 'Quinto año',
  SEXTO: 'Sexto año',
  SEPTIMO: 'Séptimo año',
  OCTAVO: 'Octavo año',
  NOVENO: 'Noveno año',
  OTROS: 'OTROS',
};

// Todo mensaje de voto empieza con la palabra VOTO. Lo que no empiece así se ignora.
const PREFIJO_VOTO = /^\s*voto(?=\s|:|$)[:\s]*/i;

/**
 * Formato (una persona por mensaje):
 *   VOTO
 *   Nombre completo [grado] [salón]   ← grado y salón son opcionales
 *   Por quién votas (opcional; si se omite cuenta como Voto Omar)
 *
 * En la línea del nombre: "Segundo"…"Noveno" u "OTROS" se toman como grado ("año" se ignora); una sola letra como salón.
 * Que la opción de voto sea válida lo decide el Excel (ExcelManager.processVote), no el parser.
 * Devuelve { ignorar: true } si el mensaje no empieza con VOTO (chat normal del grupo).
 */
function parseVoteMessage(rawText) {
  const conPrefijo = PREFIJO_VOTO.test(rawText || '');
  const lines = (rawText || '')
    .replace(PREFIJO_VOTO, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Sin VOTO solo cuenta un mensaje de una línea (el nombre). Lo demás es chat y se ignora.
  if (!conPrefijo) {
    // Solo letras y separadores: las respuestas del propio bot ("⚠️ Nombre: ya estaba...") no son nombres.
    if (lines.length !== 1 || !/^\p{L}[\p{L} .'-]*$/u.test(lines[0])) return { ok: false, ignorar: true };
    const p = parseNombreLinea(lines[0]);
    if (!p) return { ok: false, ignorar: true };
    return { ok: true, sinPrefijo: true, data: { ...p, voto: VOTO_POR_DEFECTO } };
  }

  if (lines.length === 0) {
    return { ok: false, error: 'Falta el nombre completo.' };
  }
  if (lines.length > 2) {
    return { ok: false, error: 'Una persona por mensaje: VOTO, nombre completo y por quién votas.' };
  }

  const p = parseNombreLinea(lines[0]);
  if (!p) {
    return { ok: false, error: 'Falta el nombre completo.' };
  }
  return { ok: true, data: { ...p, voto: lines[1] || VOTO_POR_DEFECTO } };
}

/** Nombre, grado y salón de una línea. Devuelve null si no queda nombre. */
function parseNombreLinea(linea) {
  let grado = null;
  let seccion = null;
  const resto = [];
  for (const token of linea.split(/\s+/)) {
    const n = normalize(token);
    if (n === 'ANO') continue; // "año" acompaña al grado
    if (GRADOS[n]) { grado = GRADOS[n]; continue; }
    if (/^[A-Z]$/.test(n)) { seccion = n; continue; }
    resto.push(token);
  }
  const nombre = resto.join(' ').trim();
  return nombre ? { nombre, grado, seccion } : null;
}

module.exports = { parseVoteMessage, VOTO_POR_DEFECTO };

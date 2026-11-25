'use strict';

const { normalize } = require('./matcher');

// Si el mensaje no trae la segunda línea (por quién vota), se cuenta para Aaron.
const VOTO_POR_DEFECTO = 'Aaron';

// Palabras reservadas de grado: si aparecen en el nombre, se toman como grado y no como parte del nombre.
const GRADOS = {
  PRIMERO: 'Primer año',
  PRIMER: 'Primer año',
  SEGUNDO: 'Segundo año',
  TERCERO: 'Tercer año',
  TERCER: 'Tercer año',
  CUARTO: 'Cuarto año',
};

// Todo mensaje de voto empieza con la palabra VOTO. Lo que no empiece así se ignora.
const PREFIJO_VOTO = /^\s*voto(?=\s|:|$)[:\s]*/i;

/**
 * Formato (una persona por mensaje):
 *   VOTO
 *   Nombre completo [grado] [salón]   ← grado y salón son opcionales
 *   Por quién votas (opcional; si se omite cuenta como Aaron)
 *
 * En la línea del nombre: "Segundo" o "año" se toman como grado; una sola letra como salón.
 * Que la opción de voto sea válida lo decide el Excel (ExcelManager.processVote), no el parser.
 * Devuelve { ignorar: true } si el mensaje no empieza con VOTO (chat normal del grupo).
 */
function parseVoteMessage(rawText) {
  if (!PREFIJO_VOTO.test(rawText || '')) {
    return { ok: false, ignorar: true };
  }

  const lines = (rawText || '')
    .replace(PREFIJO_VOTO, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { ok: false, error: 'Falta el nombre completo.' };
  }
  if (lines.length > 2) {
    return { ok: false, error: 'Una persona por mensaje: VOTO, nombre completo y por quién votas.' };
  }

  let grado = null;
  let seccion = null;
  const resto = [];
  for (const token of lines[0].split(/\s+/)) {
    const n = normalize(token);
    if (n === 'ANO') continue; // "año" acompaña al grado
    if (GRADOS[n]) { grado = GRADOS[n]; continue; }
    if (/^[A-Z]$/.test(n)) { seccion = n; continue; }
    resto.push(token);
  }

  const nombre = resto.join(' ').trim();
  if (!nombre) {
    return { ok: false, error: 'Falta el nombre completo.' };
  }
  return { ok: true, data: { nombre, voto: lines[1] || VOTO_POR_DEFECTO, grado, seccion } };
}

module.exports = { parseVoteMessage, VOTO_POR_DEFECTO };

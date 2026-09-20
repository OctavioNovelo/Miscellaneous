'use strict';

const { normalize } = require('./matcher');

const GRADOS_VALIDOS_TEXTO = 'Primero, Segundo, Tercero, Cuarto, Quinto';

// Voto por defecto cuando el mensaje no trae una línea de voto explícita
const VOTO_POR_DEFECTO = 'Alex';

/** True si la línea/palabra es reconocible como un voto (Tomas/Alex/Indeciso...). */
function esLineaDeVoto(line) {
  const norm = normalize(line).replace(/\s+/g, '');
  return norm.includes('TOMAS') || norm.includes('ALEX') || norm.includes('INDECIS');
}

/** True si el texto parece ser un grado válido. */
function esGradoValido(text) {
  if (!text) return false;
  const norm = normalize(text).replace(/[^A-Z0-9]/g, '');
  if (!norm) return false;
  const aliases = ['PRIMERO', 'PRIMER', '1', 'SEGUNDO', '2', 'TERCERO', 'TERCER', '3', 'CUARTO', '4', 'QUINTO', '5'];
  return aliases.some((a) => norm === a || norm.includes(a));
}

/**
 * Parsea el mensaje de voto.
 * Soporta nombres de 3 o 4 palabras separados por espacio (ej: Octavio Augusto Novelo Martinez).
 */
function parseVoteMessage(rawText, seccionesValidas = []) {
  if (!rawText || !rawText.trim()) {
    return { ok: false, error: 'Mensaje vacío.' };
  }

  const cleanText = rawText.trim();
  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Si el mensaje viene en múltiples líneas con estructura estricta (Nombres..., Sección, Grado, Voto?)
  if (lines.length >= 3) {
    let voto = VOTO_POR_DEFECTO;
    let finDatos = lines.length;

    if (esLineaDeVoto(lines[lines.length - 1])) {
      voto = lines[lines.length - 1];
      finDatos = lines.length - 1;
    }

    const posGrado = lines[finDatos - 1];
    const posSeccion = lines[finDatos - 2];

    if (esGradoValido(posGrado) && (seccionesValidas.length === 0 || seccionesValidas.includes(posSeccion.toUpperCase()))) {
      const nombres = lines.slice(0, finDatos - 2).map((n) => n.trim()).filter(Boolean);
      if (nombres.length > 0) {
        return {
          ok: true,
          data: {
            nombres,
            seccion: posSeccion.toUpperCase(),
            grado: posGrado,
            voto: esLineaDeVoto(voto) ? voto : VOTO_POR_DEFECTO,
          },
        };
      }
    }
  }

  // Si viene en una sola línea o texto continuo separado por espacios:
  const tokens = cleanText.split(/\s+/).filter(Boolean);

  let voto = VOTO_POR_DEFECTO;
  let grado = '';
  let seccion = '';

  // 1. Extraer voto al final (si existe)
  if (tokens.length > 0 && esLineaDeVoto(tokens[tokens.length - 1])) {
    voto = tokens.pop();
  }

  // 2. Extraer grado al final (si existe)
  if (tokens.length > 0 && esGradoValido(tokens[tokens.length - 1])) {
    grado = tokens.pop();
  }

  // 3. Extraer sección al final (si existe)
  if (tokens.length > 0) {
    const candidateSeccion = tokens[tokens.length - 1].toUpperCase();
    if (seccionesValidas.length === 0 || seccionesValidas.includes(candidateSeccion)) {
      seccion = candidateSeccion;
      tokens.pop();
    }
  }

  // Lo que queda son las palabras del nombre (3 o 4 palabras: ej. Octavio Augusto Novelo Martinez)
  const nombreCompleto = tokens.join(' ').trim();

  if (!nombreCompleto) {
    return {
      ok: false,
      error: 'Formato inválido: no se pudo detectar el nombre en el mensaje.',
    };
  }

  return {
    ok: true,
    data: {
      nombres: [nombreCompleto],
      seccion,
      grado,
      voto,
    },
  };
}

module.exports = { parseVoteMessage, esLineaDeVoto };
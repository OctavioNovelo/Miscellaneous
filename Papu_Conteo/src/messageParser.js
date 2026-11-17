'use strict';

const { normalize } = require('./matcher');

// Voto por defecto cuando el mensaje no trae una línea de voto explícita
const VOTO_POR_DEFECTO = 'Alex';

// Todo mensaje de voto empieza con la palabra VOTO. Lo que no empiece así se ignora.
const PREFIJO_VOTO = /^\s*voto(?=\s|:|$)[:\s]*/i;

/** True si la línea es exactamente una opción de voto (no un apellido como "Alexis"). */
function esLineaDeVoto(line) {
  const norm = normalize(line).replace(/\s+/g, '');
  return ['TOMAS', 'ALEX', 'INDECISO', 'INDECISOS'].includes(norm);
}

/** True si el texto es un grado válido (Primero/Segundo/... o 1-5). */
function esGradoValido(text) {
  if (!text) return false;
  const norm = normalize(text).replace(/[^A-Z0-9]/g, '');
  if (!norm) return false;
  const aliases = ['PRIMERO', 'PRIMER', '1', 'SEGUNDO', '2', 'TERCERO', 'TERCER', '3', 'CUARTO', '4', 'QUINTO', '5'];
  return aliases.some((a) => norm === a || norm.includes(a));
}

/**
 * Formato de voto (una persona por bloque, o varias personas juntas):
 *   VOTO
 *   Nombre completo
 *   Sección
 *   Grado
 *   Voto (opcional; si se omite cuenta como Alex)
 *
 * Devuelve { ignorar: true } si el mensaje no empieza con VOTO (chat normal del grupo).
 */
function parseVoteMessage(rawText, seccionesValidas = []) {
  if (!PREFIJO_VOTO.test(rawText || '')) {
    return { ok: false, ignorar: true };
  }

  const cuerpo = (rawText || '').replace(PREFIJO_VOTO, '').trim();
  if (!cuerpo) {
    return { ok: false, error: 'Faltan los datos del voto (Nombre, Sección, Grado).' };
  }

  const lines = cuerpo
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length >= 3) {
    let voto = VOTO_POR_DEFECTO;
    let finDatos = lines.length;

    if (esLineaDeVoto(lines[lines.length - 1])) {
      voto = lines[lines.length - 1];
      finDatos = lines.length - 1;
    }

    const posGrado = lines[finDatos - 1];
    const posSeccion = lines[finDatos - 2];
    const seccionOk = seccionesValidas.length === 0 || seccionesValidas.includes(posSeccion.toUpperCase());

    if (!esGradoValido(posGrado)) {
      return { ok: false, error: `Grado inválido: "${posGrado}".` };
    }
    if (!seccionOk) {
      return { ok: false, error: `Sección inválida: "${posSeccion}".` };
    }

    const nombres = lines.slice(0, finDatos - 2);
    if (nombres.length === 0) {
      return { ok: false, error: 'Falta el nombre de la persona.' };
    }
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

  // Dos líneas o una sola: se separa todo por espacios (Nombre Sección Grado [Voto])
  const tokens = cuerpo.split(/\s+/).filter(Boolean);

  let voto = VOTO_POR_DEFECTO;
  let grado = '';
  let seccion = '';

  if (tokens.length > 0 && esLineaDeVoto(tokens[tokens.length - 1])) {
    voto = tokens.pop();
  }
  if (tokens.length > 0 && esGradoValido(tokens[tokens.length - 1])) {
    grado = tokens.pop();
  }
  if (tokens.length > 0) {
    const candidateSeccion = tokens[tokens.length - 1].toUpperCase();
    if (seccionesValidas.length === 0 || seccionesValidas.includes(candidateSeccion)) {
      seccion = candidateSeccion;
      tokens.pop();
    }
  }

  const nombreCompleto = tokens.join(' ').trim();
  if (!nombreCompleto) {
    return { ok: false, error: 'Formato inválido: no se pudo detectar el nombre en el mensaje.' };
  }
  // Sin sección y grado no se puede ubicar a la persona: nunca se busca en todas las hojas.
  if (!seccion || !grado) {
    return { ok: false, error: 'Faltan la sección y/o el grado (ej. "A" y "Segundo").' };
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

module.exports = { parseVoteMessage, esLineaDeVoto, esGradoValido };

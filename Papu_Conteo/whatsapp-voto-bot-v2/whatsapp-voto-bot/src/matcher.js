'use strict';

/**
 * Normaliza texto: minúsculas, sin acentos, sin dobles espacios,
 * y sin puntuación irrelevante. Así "José  Núñez" y "jose nuñez"
 * se comparan de forma justa.
 */
function normalize(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de Levenshtein clásica */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // borrar
        dp[i][j - 1] + 1,      // insertar
        dp[i - 1][j - 1] + cost // sustituir
      );
    }
  }
  return dp[m][n];
}

/** Similitud 0..1 basada en Levenshtein, y bonus si comparten todas las palabras */
function similarity(nameA, nameB) {
  const a = normalize(nameA);
  const b = normalize(nameB);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  let score = 1 - dist / maxLen;

  // Bonus: mismas palabras en distinto orden, o un nombre es subconjunto del otro
  // (ej. falta un segundo nombre: "Naomy Abroncio Medina" vs "Naomy Guadalupe Abroncio Medina")
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const smaller = Math.min(wordsA.size, wordsB.size);
  const larger = Math.max(wordsA.size, wordsB.size);

  const overlapVsUnion = intersection.length / larger; // penaliza palabras extra en ambos lados
  const overlapVsSmaller = intersection.length / smaller; // ignora palabras extra (ej. segundo nombre faltante)

  // Si todas las palabras del nombre más corto están en el más largo, es muy probable
  // que sea la misma persona (falta un nombre intermedio) -> score alto.
  if (overlapVsSmaller === 1 && smaller >= 2) {
    score = Math.max(score, 0.85 + 0.1 * overlapVsUnion);
  } else {
    score = Math.max(score, overlapVsUnion * 0.95);
  }

  return Math.min(score, 1);
}

/**
 * Busca la mejor fila candidata dentro de un subconjunto de filas de una sola sección.
 * Prioriza: 1) mejor similitud de nombre, 2) coincidencia del operador asignado como
 * desempate cuando hay nombres muy parecidos.
 *
 * @param {Array} candidatos filas { rowNumber, nombre, operadorAsignado, ... }
 * @param {string} nombreBuscado
 * @param {string} operadorBuscado
 * @param {number} threshold umbral mínimo de similitud aceptable
 * @returns {{ best: object|null, score: number, ties: Array, ambiguous: boolean }}
 */
function findBestMatch(candidatos, nombreBuscado, operadorBuscado, threshold = 0.72) {
  const scored = candidatos
    .map((c) => ({ candidato: c, score: similarity(c.nombre, nombreBuscado) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { best: null, score: 0, ties: [], ambiguous: false };
  }

  const topScore = scored[0].score;
  // Consideramos "empate" cualquier candidato a menos de 0.03 del mejor puntaje
  const ties = scored.filter((x) => topScore - x.score < 0.03);

  if (ties.length === 1) {
    return { best: ties[0].candidato, score: ties[0].score, ties, ambiguous: false };
  }

  // Desempate por operador asignado
  const normOperador = normalize(operadorBuscado);
  const porOperador = ties.filter((x) =>
    normalize(x.candidato.operadorAsignado || '').includes(normOperador) && normOperador
  );

  if (porOperador.length === 1) {
    return { best: porOperador[0].candidato, score: porOperador[0].score, ties, ambiguous: false };
  }

  // Sigue ambiguo: se reporta para revisión manual, pero se regresa el mejor puntaje como sugerencia
  return { best: ties[0].candidato, score: ties[0].score, ties, ambiguous: true };
}

module.exports = { normalize, levenshtein, similarity, findBestMatch };

// Motor de respuestas de Ito.
//
// Carga respuestas.json, lo valida y expone buscar(texto, anterior).
// El formato del JSON está documentado en README.md.
//
// Cómo decide:
//   1. El mensaje y las keywords pasan por la misma normalización: minúsculas,
//      sin acentos ni signos, plural -> singular aproximado y sinónimos.
//   2. Un tema aplica si TODAS las palabras de ALGUNA de sus alternativas
//      aparecen en el mensaje (en cualquier orden, con palabras de más).
//   3. Si una palabra del mensaje no existe en ningún tema, se acepta como
//      error de dedo de una keyword parecida (1 letra de diferencia).
//   4. Gana mayor prioridad; luego la alternativa con más palabras; luego la que
//      no necesitó corregir errores de dedo; luego la que va primero en el JSON.
//   5. Si nada aplica y hay un mensaje anterior reciente, se prueba de nuevo
//      juntando ambos ("¿dónde está la biblioteca?" + "¿y a qué hora abre?").

const fs = require('fs');

const CAMPOS_RAIZ = new Set(['mensajes', 'sinonimos', 'temas']);
const CAMPOS_TEMA = new Set(['id', 'categoria', 'prioridad', 'prefijo', 'keywords', 'respuesta']);

// Para corregir errores de dedo solo se consideran palabras de al menos
// este largo. Las cortas se confunden demasiado ("pago"/"paso").
const LARGO_MIN_ERROR_DEDO = 5;

// minúsculas, sin acentos (la ñ queda como n), sin signos ni emojis, y sin
// letras repetidas 3+ veces ("holaaaa" -> "hola").
function limpiar(texto) {
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/([a-z])\1{2,}/g, '$1')
        .trim();
}

// Plural -> singular aproximado, para que "tutoría", "tutorias" y "tutorías"
// sean la misma palabra.
function raiz(p) {
    if (p.length > 5 && /[rlndz]es$/.test(p)) return p.slice(0, -2); // profesores, salones, cuales
    if (p.length > 4 && p.endsWith('s')) return p.slice(0, -1);      // tutorias, materias
    return p;
}

// ¿a y b difieren en exactamente una edición? (letra de más, de menos,
// cambiada, o dos letras vecinas volteadas: "tutorais" -> "tutorias")
function unaEdicion(a, b) {
    if (a === b || Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) {
        if (a.slice(i + 1) === b.slice(i + 1)) return true;                       // cambiada
        return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // volteadas
    }
    const [corta, larga] = a.length < b.length ? [a, b] : [b, a];
    return corta.slice(i) === larga.slice(i + 1);                                 // de más / de menos
}

function validar(datos, ruta) {
    const errores = [];
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw new Error(`${ruta}: debe ser un objeto JSON con "mensajes", "sinonimos" y "temas"`);
    }
    for (const campo of Object.keys(datos)) {
        if (!CAMPOS_RAIZ.has(campo)) errores.push(`campo desconocido "${campo}" en la raíz`);
    }
    const { mensajes, sinonimos, temas } = datos;

    for (const clave of ['noEntendi', 'soloTexto']) {
        if (!mensajes || typeof mensajes[clave] !== 'string' || !mensajes[clave].trim()) {
            errores.push(`mensajes.${clave} falta o está vacío`);
        }
    }
    if (sinonimos !== undefined) {
        if (!sinonimos || typeof sinonimos !== 'object' || Array.isArray(sinonimos)) {
            errores.push('"sinonimos" debe ser un objeto, ej. {"maestro": "profesor"}');
        } else {
            for (const [de, a] of Object.entries(sinonimos)) {
                if (limpiar(de).split(/\s+/).length !== 1 || typeof a !== 'string' || limpiar(a).split(/\s+/).length !== 1) {
                    errores.push(`sinonimos."${de}": cada sinónimo debe ser una sola palabra -> una sola palabra`);
                }
            }
        }
    }
    if (!Array.isArray(temas) || temas.length === 0) {
        errores.push('"temas" debe ser una lista con al menos un tema');
    } else {
        const ids = new Set();
        temas.forEach((t, i) => {
            const donde = `temas[${i}]${t && t.id ? ` (${t.id})` : ''}`;
            if (!t || typeof t !== 'object') return errores.push(`${donde}: no es un objeto`);
            for (const campo of Object.keys(t)) {
                if (!CAMPOS_TEMA.has(campo)) errores.push(`${donde}: campo desconocido "${campo}" (¿error de dedo?)`);
            }
            if (typeof t.id !== 'string' || !t.id) errores.push(`${donde}: falta "id"`);
            else if (ids.has(t.id)) errores.push(`${donde}: "id" repetido`);
            else ids.add(t.id);
            if (typeof t.respuesta !== 'string' || !t.respuesta.trim()) errores.push(`${donde}: falta "respuesta"`);
            if (t.prioridad !== undefined && typeof t.prioridad !== 'number') errores.push(`${donde}: "prioridad" debe ser número`);
            if (t.prefijo !== undefined && typeof t.prefijo !== 'boolean') errores.push(`${donde}: "prefijo" debe ser true/false`);
            if (!Array.isArray(t.keywords) || t.keywords.length === 0) {
                errores.push(`${donde}: "keywords" debe ser una lista de listas, ej. [["donde", "biblioteca"]]`);
            } else {
                t.keywords.forEach((alt, j) => {
                    if (!Array.isArray(alt) || alt.length === 0 || alt.some(k => typeof k !== 'string' || !limpiar(k))) {
                        errores.push(`${donde}: keywords[${j}] debe ser una lista de palabras no vacía`);
                    }
                });
            }
        });
    }
    if (errores.length) {
        throw new Error(`${ruta} tiene ${errores.length} error(es):\n  - ${errores.join('\n  - ')}`);
    }
}

function crearMotor(datos, ruta = 'respuestas') {
    validar(datos, ruta);

    const sinonimos = {};
    for (const [de, a] of Object.entries(datos.sinonimos || {})) {
        sinonimos[raiz(limpiar(de))] = raiz(limpiar(a));
    }
    const normalizar = p => {
        const r = raiz(p);
        return sinonimos[p] ?? sinonimos[r] ?? r;
    };
    const palabras = texto => limpiar(texto).split(/\s+/).filter(Boolean).map(normalizar);

    // Pre-normalizamos keywords una sola vez. Una keyword con espacios
    // ("control escolar") se parte en varias palabras.
    const temas = datos.temas.map(t => ({
        id: t.id,
        prioridad: t.prioridad || 0,
        prefijo: Boolean(t.prefijo),
        respuesta: t.respuesta,
        alternativas: t.keywords.map(alt => [...new Set(alt.flatMap(palabras))]),
    }));

    // Todas las palabras que el bot conoce. Una palabra conocida nunca se trata
    // como error de dedo: "cuando" no debe convertirse en "cuanto".
    const vocabulario = new Set();
    for (const t of temas) if (!t.prefijo) t.alternativas.flat().forEach(k => vocabulario.add(k));
    const vocabularioLargo = [...vocabulario].filter(k => k.length >= LARGO_MIN_ERROR_DEDO);

    // opciones.nuevas: palabras del mensaje nuevo cuando se busca con contexto.
    //   Solo cuentan alternativas que usen al menos una, y gana la que use más.
    // opciones.excluir: id del tema anterior, para no repetirlo.
    function buscarSolo(texto, { nuevas = null, excluir = null } = {}) {
        const lista = palabras(texto);
        const exactas = new Set(lista);

        // keyword -> palabra mal escrita del mensaje que la "corrige"
        const corregidas = new Map();
        for (const p of exactas) {
            if (vocabulario.has(p) || p.length < LARGO_MIN_ERROR_DEDO) continue;
            for (const k of vocabularioLargo) if (unaEdicion(p, k)) corregidas.set(k, p);
        }

        let mejor = null;
        let mejorPuntaje = -Infinity;
        for (const tema of temas) {
            if (tema.id === excluir) continue;
            for (const alt of tema.alternativas) {
                let errores = 0;
                let deLoNuevo = 0;
                const aplica = alt.every(k => {
                    let origen;
                    if (tema.prefijo) origen = lista.find(p => p.startsWith(k));
                    else if (exactas.has(k)) origen = k;
                    else if (corregidas.has(k)) { origen = corregidas.get(k); errores++; }
                    if (origen === undefined) return false;
                    if (nuevas && nuevas.has(origen)) deLoNuevo++;
                    return true;
                });
                if (!aplica || (nuevas && deLoNuevo === 0)) continue;
                const puntaje = tema.prioridad * 1e6 + deLoNuevo * 1e3 + alt.length * 10 - errores;
                if (puntaje > mejorPuntaje) {
                    mejor = tema;
                    mejorPuntaje = puntaje;
                }
            }
        }
        return mejor;
    }

    // anterior = { texto, id } del último mensaje que SÍ se contestó en ese chat.
    // Devuelve { tema, usoContexto, texto } o null. "texto" es lo que se usó para
    // encontrar el tema; es lo que hay que guardar como "anterior" la próxima vez.
    function buscar(texto, anterior = null) {
        const tema = buscarSolo(texto);
        if (tema) return { tema, usoContexto: false, texto };
        if (!anterior || !anterior.texto) return null;

        // Juntamos ambos mensajes, pero el tema tiene que usar alguna palabra del
        // nuevo y no puede ser el mismo de antes ("jajaja", "ok" no aportan nada).
        // Solo las últimas palabras, para que en conversaciones largas no se acumule todo.
        const juntos = `${anterior.texto} ${texto}`.split(/\s+/).slice(-25).join(' ');
        const conContexto = buscarSolo(juntos, { nuevas: new Set(palabras(texto)), excluir: anterior.id });
        return conContexto ? { tema: conContexto, usoContexto: true, texto: juntos } : null;
    }

    return {
        mensajes: datos.mensajes,
        temas: datos.temas,
        palabras,
        buscar,
    };
}

function cargarMotor(ruta) {
    let datos;
    try {
        datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch (err) {
        throw new Error(`No se pudo leer ${ruta}: ${err.message}`);
    }
    return crearMotor(datos, ruta);
}

module.exports = { cargarMotor, crearMotor };

// Prueba el motor de respuestas sin abrir WhatsApp.
//
//   node probar.js                         -> corre todas las pruebas de pruebas.json
//   node probar.js "donde esta la biblioteca"
//                                          -> muestra qué respondería el bot
//   node probar.js "donde esta la biblioteca" "y a que hora abre"
//                                          -> simula una conversación (cada texto entre
//                                             comillas es un mensaje)
//   node probar.js --pendientes            -> resume las preguntas que el bot no supo
//                                             contestar (sin_respuesta.jsonl)
//
// Cada prueba es { "mensaje": "...", "esperado": "<id del tema>" | null }.
// null = el bot NO debe encontrar respuesta (contesta con mensajes.noEntendi).
// Con "anterior": "..." se prueba el contexto: ese mensaje se manda primero.

const fs = require('fs');
const path = require('path');
const { cargarMotor } = require('./motor');

const motor = cargarMotor(path.join(__dirname, 'respuestas.json'));
const args = process.argv.slice(2);

// Simula una conversación: cada mensaje recuerda el último que sí se contestó.
function conversar(mensajes) {
    let anterior = null;
    return mensajes.map(m => {
        const r = motor.buscar(m, anterior);
        if (r) anterior = { texto: r.texto, id: r.tema.id };
        return r;
    });
}

if (args[0] === '--pendientes') {
    const archivo = path.join(__dirname, 'sin_respuesta.jsonl');
    if (!fs.existsSync(archivo)) {
        console.log('Todavía no hay preguntas sin respuesta registradas.');
        process.exit(0);
    }
    // Agrupamos por texto normalizado para que "Donde esta X?" y "donde esta x"
    // cuenten como la misma pregunta.
    const grupos = new Map();
    for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
        if (!linea.trim()) continue;
        let registro;
        try { registro = JSON.parse(linea); } catch { continue; }
        const clave = motor.palabras(registro.texto).join(' ');
        const g = grupos.get(clave) || { veces: 0, ejemplo: registro.texto, ultima: registro.fecha };
        g.veces++;
        g.ultima = registro.fecha;
        grupos.set(clave, g);
    }
    const lista = [...grupos.values()].sort((a, b) => b.veces - a.veces);
    console.log(`${lista.length} preguntas distintas sin respuesta (las más repetidas primero):\n`);
    for (const g of lista.slice(0, 50)) {
        console.log(`${String(g.veces).padStart(4)}x  ${g.ejemplo}`);
    }
    process.exit(0);
}

if (args.length) {
    conversar(args).forEach((r, i) => {
        if (args.length > 1) console.log(`> ${args[i]}`);
        if (!r) console.log(`[sin coincidencia]\n${motor.mensajes.noEntendi}`);
        else console.log(`[${r.tema.id}]${r.usoContexto ? ' (usando el mensaje anterior)' : ''}\n${r.tema.respuesta}`);
        if (args.length > 1) console.log();
    });
    process.exit(0);
}

const pruebas = require('./pruebas.json');
const ids = new Set(motor.temas.map(t => t.id));
let fallas = 0;

for (const { mensaje, esperado, anterior } of pruebas) {
    if (esperado !== null && !ids.has(esperado)) {
        fallas++;
        console.log(`✗ "${mensaje}": el id esperado "${esperado}" no existe en respuestas.json`);
        continue;
    }
    const r = anterior ? conversar([anterior, mensaje])[1] : motor.buscar(mensaje);
    const obtenido = r?.tema.id ?? null;
    if (obtenido !== esperado) {
        fallas++;
        const previo = anterior ? ` (después de "${anterior}")` : '';
        console.log(`✗ "${mensaje}"${previo}\n    esperado: ${esperado}\n    obtenido: ${obtenido}`);
    }
}

console.log(`\n${pruebas.length - fallas}/${pruebas.length} pruebas pasaron.`);
process.exit(fallas ? 1 : 0);

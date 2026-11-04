// Ito: bot de WhatsApp con dudas frecuentes de la Facultad de Derecho.
//
// Las respuestas viven en respuestas.json y la lógica de búsqueda en motor.js.
// Para probar cambios al JSON sin abrir WhatsApp:  node probar.js

const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { cargarMotor } = require('./motor');

// Si respuestas.json tiene errores, el bot no arranca y dice exactamente cuáles.
const motor = cargarMotor(path.join(__dirname, 'respuestas.json'));

process.on('unhandledRejection', (razon) => {
    console.error('Promesa rechazada sin manejar:', razon);
});

// Tras una excepción no capturada el proceso queda en un estado indefinido, así
// que salimos y dejamos que quien lo ejecuta (pm2, systemd...) lo reinicie.
process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada, cerrando:', err);
    process.exit(1);
});

// Máximo de respuestas por chat dentro de la ventana de tiempo. Si alguien
// manda más, el bot lo ignora hasta que pase la ventana.
const LIMITE_RESPUESTAS = 8;
const VENTANA_MS = 60 * 1000;
const historial = new Map(); // chatId -> [timestamps]

function dentroDelLimite(chatId) {
    const ahora = Date.now();
    const recientes = (historial.get(chatId) || []).filter(t => ahora - t < VENTANA_MS);
    if (recientes.length >= LIMITE_RESPUESTAS) {
        historial.set(chatId, recientes);
        return false;
    }
    recientes.push(ahora);
    historial.set(chatId, recientes);
    return true;
}

// Contexto: lo último que se le contestó a cada chat, para entender preguntas
// de seguimiento como "¿y a qué hora abre?". Se olvida tras unos minutos.
const DURACION_CONTEXTO_MS = 5 * 60 * 1000;
const contextos = new Map(); // chatId -> { texto, id, t }

function contextoDe(chatId) {
    const c = contextos.get(chatId);
    return c && Date.now() - c.t < DURACION_CONTEXTO_MS ? c : null;
}

// Limpia de vez en cuando los chats que ya no están activos.
setInterval(() => {
    const ahora = Date.now();
    for (const [chatId, tiempos] of historial) {
        if (tiempos.every(t => ahora - t >= VENTANA_MS)) historial.delete(chatId);
    }
    for (const [chatId, c] of contextos) {
        if (ahora - c.t >= DURACION_CONTEXTO_MS) contextos.delete(chatId);
    }
}, 10 * VENTANA_MS).unref();

// Preguntas que el bot no supo contestar, una por línea, para revisarlas con
//   node probar.js --pendientes
// y agregar keywords a respuestas.json. No se guarda el número de quien pregunta.
const ARCHIVO_PENDIENTES = path.join(__dirname, 'sin_respuesta.jsonl');

function registrarSinRespuesta(texto) {
    const linea = JSON.stringify({ fecha: new Date().toISOString(), texto }) + '\n';
    fs.appendFile(ARCHIVO_PENDIENTES, linea, (err) => {
        if (err) console.error('No se pudo registrar la pregunta sin respuesta:', err.message);
    });
}

// Solo contestamos chats privados: nada de grupos, estados ni canales.
function esChatPrivado(chatId) {
    return !(
        chatId.endsWith('@g.us') ||
        chatId.endsWith('@broadcast') ||
        chatId.endsWith('@newsletter')
    );
}

const client = new Client({
    puppeteer: {
        // Ruta del navegador. Se puede cambiar sin tocar el código:
        //   CHROME_PATH=/usr/bin/chromium node main.js
        executablePath: process.env.CHROME_PATH || '/usr/bin/brave',
    },
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, 'sesion'),
    }),
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log(`Ito listo, ${motor.temas.length} temas cargados.`);
});

// Usamos 'message' (solo entrantes) y no 'message_create', que también se
// dispara con los mensajes del propio bot y lo hacía responderse en loop.
client.on('message', async (msg) => {
    try {
        if (msg.fromMe || !esChatPrivado(msg.from)) return;

        // Imágenes con texto (caption) llegan con body, así que se contestan normal.
        const texto = (msg.body || '').trim();

        if (!texto) {
            // Stickers: los ignoramos. Otros medios sin texto: avisamos.
            // No descargamos nada, eso era lo que crasheaba con los stickers.
            if (!msg.hasMedia || msg.type === 'sticker') return;
            if (dentroDelLimite(msg.from)) {
                await client.sendMessage(msg.from, motor.mensajes.soloTexto);
            }
            return;
        }

        if (!dentroDelLimite(msg.from)) return;

        const resultado = motor.buscar(texto, contextoDe(msg.from));
        if (resultado) {
            contextos.set(msg.from, { texto: resultado.texto, id: resultado.tema.id, t: Date.now() });
            await client.sendMessage(msg.from, resultado.tema.respuesta);
        } else {
            registrarSinRespuesta(texto);
            await client.sendMessage(msg.from, motor.mensajes.noEntendi);
        }
    } catch (err) {
        console.error(`Error respondiendo a ${msg.from}:`, err);
    }
});

client.initialize();

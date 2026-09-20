'use strict';

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const { ExcelManager } = require('./excelManager');
const { parseVoteMessage } = require('./messageParser');
const { TelegramNotifier } = require('./telegramNotifier');

const EXCEL_PATH = path.resolve(process.env.EXCEL_PATH || './data/Padron.xlsx');
const SECCIONES_VALIDAS = (process.env.SECCIONES_VALIDAS || 'A,B,C,D,E,F,G')
  .split(',')
  .map((s) => s.trim().toUpperCase());

const excelManager = new ExcelManager(EXCEL_PATH);
const telegram = new TelegramNotifier(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);

async function main() {
  await excelManager.load();
  console.log(`[Excel] Padrón cargado desde ${EXCEL_PATH}`);

  // A partir de ahora todo mensaje que llega es un voto por Alex salvo que
  // diga lo contrario, así que ya no llegarán reportes reales para Tomas o
  // Indeciso: la intención precargada en el padrón pasa a contar como el
  // voto confirmado de esa persona. Es idempotente: solo toca filas que
  // sigan sin confirmar, así que es seguro correrlo en cada arranque.
  const migradas = await excelManager.runExclusive(() => excelManager.confirmarIntencionesPrecargadas());
  if (migradas > 0) {
    await excelManager.save();
    console.log(`[Excel] ${migradas} fila(s) con intención precargada (Tomas/Indeciso) marcadas como CONFIRMADO.`);
    await telegram.send(`ℹ️ Migración inicial: ${migradas} voto(s) precargado(s) de Tomas/Indeciso se marcaron como confirmados.`);
  }

  const client = new Client({
    authStrategy: new LocalAuth(), // guarda la sesión para no escanear el QR cada vez
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // Si Puppeteer no pudo descargar su propio Chromium, se puede apuntar
      // a uno ya instalado en el sistema definiendo CHROME_PATH en .env
      // (ej. /usr/bin/chromium-browser o /usr/bin/google-chrome).
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    },
  });

  client.on('qr', (qr) => {
    console.log('Escanea este QR con WhatsApp (Dispositivos vinculados):');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('✅ Bot de WhatsApp conectado y listo para recibir votos.');
  });

  client.on('message', async (message) => {
    try {
      await handleIncomingMessage(message);
    } catch (err) {
      console.error('Error procesando mensaje:', err);
      await telegram.send(`🔥 Error interno procesando un mensaje: ${err.message}`);
    }
  });

  client.initialize();
}

/** El operador ya no se escribe en el mensaje: se toma del contacto de WhatsApp que reporta. */
async function resolveOperador(message) {
  try {
    const contact = await message.getContact();
    return contact.pushname || contact.name || contact.number || message.from;
  } catch (err) {
    console.warn('No se pudo resolver el contacto del mensaje, se usa message.from:', err.message);
    return message.from;
  }
}

async function handleIncomingMessage(message) {
  const body = message.body || '';
  const parsed = parseVoteMessage(body, SECCIONES_VALIDAS);

  if (!parsed.ok) {
    // Ignoramos silenciosamente mensajes que claramente no son reportes de voto
    // (por ejemplo saludos), pero avisamos si parece un intento fallido (contiene varias líneas).
    const looksLikeAttempt = body.split('\n').filter((l) => l.trim()).length >= 2;
    if (looksLikeAttempt) {
      await message.reply(
        `❌ ${parsed.error}\n\nFormato esperado:\nNombre\nSeccion\nGrado\nVoto (opcional, si se omite cuenta como Alex)\n\n` +
          `También se pueden mandar varios nombres juntos (uno por línea, misma Sección y Grado):\nNombre 1\nNombre 2\nSeccion\nGrado`
      );
      await telegram.notifyFormatoInvalido(parsed.error, message.from);
    }
    return;
  }

  const { nombres, seccion, grado, voto } = parsed.data;
  const operador = await resolveOperador(message);

  const registrados = [];
  // Evita mandar el mismo aviso de Telegram varias veces cuando la Sección o
  // el Grado del mensaje (compartidos por todos los nombres) no existen.
  const avisosUnicos = new Set();

  for (const nombre of nombres) {
    // Serializamos para evitar que dos mensajes casi simultáneos corrompan el archivo
    const result = await excelManager.runExclusive(() =>
      excelManager.processVote({ nombre, seccion, grado, voto, operador })
    );
    await procesarResultadoVoto(result, operador, registrados, avisosUnicos);
  }

  // La confirmación por WhatsApp se manda una sola vez, agrupando todos los
  // nombres que sí se registraron en este mensaje.
  if (registrados.length > 0) {
    const detalle = registrados
      .map((r) => `${r.grado} | Fila ${r.rowNumber} | ${r.nombreEnPadron} | Sección ${r.seccion} | Voto: ${r.voto}`)
      .join('\n');
    const encabezado = registrados.length === 1 ? '✅ Voto registrado.' : `✅ ${registrados.length} votos registrados.`;
    await message.reply(`${encabezado}\n${detalle}`);
  }
}

/** Aplica el resultado de un solo nombre: guarda el Excel si hace falta y notifica a Telegram según el caso. */
async function procesarResultadoVoto(result, operador, registrados, avisosUnicos) {
  switch (result.status) {
    case 'REGISTRADO':
      await excelManager.save();
      registrados.push(result);
      // La ambigüedad se resuelve/avisa solo por Telegram, no se le informa al operador por WhatsApp.
      if (result.ambiguous) await telegram.notifyAmbiguo(result);
      break;

    case 'DUPLICADO_IGNORADO':
      // Sin respuesta en WhatsApp (no-evento para el operador), pero sí se avisa
      // por Telegram para que quede registro de que llegó un reporte repetido.
      await telegram.notifyDuplicado(result);
      break;

    case 'DISCREPANCIA':
      await excelManager.save();
      // Sin respuesta en WhatsApp: el operador ya reportó su voto, el aviso es para
      // quien supervisa (Telegram), no para él.
      await telegram.notifyDiscrepancia(result);
      break;

    case 'NOMBRE_NO_ENCONTRADO':
      // Sin respuesta en WhatsApp: se revisa manualmente vía Telegram.
      await telegram.notifyNoEncontrado(result, operador);
      break;

    case 'SECCION_NO_ENCONTRADA': {
      // Misma Sección/Grado para todos los nombres del mensaje: si falla, falla
      // igual para todos, así que este aviso se manda una sola vez por mensaje.
      const key = `SECCION:${result.hoja}:${result.seccion}`;
      if (!avisosUnicos.has(key)) {
        avisosUnicos.add(key);
        await telegram.notifySeccionNoEncontrada(result);
      }
      break;
    }

    case 'GRADO_NO_ENCONTRADO': {
      const key = `GRADO:${result.grado}`;
      if (!avisosUnicos.has(key)) {
        avisosUnicos.add(key);
        await telegram.notifyGradoNoEncontrado(result);
      }
      break;
    }

    default:
      console.warn('Estado desconocido:', result);
  }
}

main().catch((err) => {
  console.error('Error fatal iniciando el bot:', err);
  process.exit(1);
});
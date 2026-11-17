'use strict';

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const { ExcelManager } = require('./excelManager');
const { parseVoteMessage } = require('./messageParser');
const { TelegramNotifier } = require('./telegramNotifier');

const EXCEL_PATH = path.resolve(process.env.EXCEL_PATH || './data/Padron.xlsx');
const SECCIONES_VALIDAS = (process.env.SECCIONES_VALIDAS || 'A,B,C,D,E,F,G')
  .split(',')
  .map((s) => s.trim().toUpperCase());
// Id del grupo donde se recogen los votos (termina en @g.us). Sin él el bot no arranca.
const GRUPO_ID = (process.env.VOTACION_GRUPO_ID || '').trim();

const FORMATO_AYUDA =
  'Formato:\nVOTO\nNombre completo\nSección\nGrado\nVoto (opcional; si se omite cuenta como Alex)\n\n' +
  'Varios nombres: uno por línea, misma Sección y Grado.';

const excelManager = new ExcelManager(EXCEL_PATH);
const telegram = new TelegramNotifier(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);

async function main() {
  if (!/@g\.us$/.test(GRUPO_ID)) {
    throw new Error('Define VOTACION_GRUPO_ID en .env con el id del grupo de votación (termina en @g.us).');
  }

  await excelManager.load();
  console.log(`[Excel] Padrón cargado desde ${EXCEL_PATH}`);

  // Copia de respaldo antes de tocar nada: protege ediciones manuales y votos previos al arranque.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const respaldo = EXCEL_PATH.replace(/\.xlsx$/, `.backup-${stamp}.xlsx`);
  fs.copyFileSync(EXCEL_PATH, respaldo);
  console.log(`[Excel] Respaldo creado: ${respaldo}`);

  // Precarga inicial: las intenciones Tomas/Indeciso del padrón cuentan como votos confirmados.
  // Idempotente: solo toca filas sin confirmar.
  const migradas = await excelManager.runExclusive(async () => {
    const n = excelManager.confirmarIntencionesPrecargadas();
    if (n > 0) await excelManager.save();
    return n;
  });
  if (migradas > 0) {
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
    const hora = new Date().toLocaleString('es-MX');
    console.log('✅ Bot de WhatsApp conectado y listo para recibir votos.');
    // Los mensajes enviados mientras el bot estaba caído no se procesan: se avisa la hora para revisar ese hueco.
    telegram.notifyConexion(`conectado a las ${hora}. Si hubo votos durante una caída, revisarlos en el grupo.`);
  });

  client.on('disconnected', (reason) => {
    console.error('WhatsApp desconectado:', reason);
    telegram.notifyConexion(`desconectado (${reason}). Los votos enviados ahora no se registran.`);
  });

  client.on('auth_failure', (msg) => {
    console.error('Fallo de autenticación:', msg);
    telegram.notifyConexion(`fallo de autenticación: ${msg}`);
  });

  // message_create incluye también los mensajes del propio número (el tuyo), que también cuentan como voto.
  client.on('message_create', async (message) => {
    try {
      await handleIncomingMessage(message);
    } catch (err) {
      console.error('Error procesando mensaje:', err);
      await telegram.send(`🔥 Error interno procesando un mensaje: ${err.message}`);
    }
  });

  client.initialize();
}

/** El operador no se escribe en el mensaje: se toma del contacto de WhatsApp que reporta. */
async function resolveOperador(message) {
  try {
    const contact = await message.getContact();
    // Solo el nombre: el desempate compara contra "Operador Asignado" del padrón, que son nombres.
    return contact.pushname || contact.name || contact.number || message.from;
  } catch (err) {
    console.warn('No se pudo resolver el contacto del mensaje, se usa message.from:', err.message);
    return message.from;
  }
}

async function handleIncomingMessage(message) {
  // Solo el grupo de votación. Se compara antes de pedir metadatos del chat.
  // Los mensajes de un grupo ya vienen de sus participantes, así que no se filtra por miembro:
  // message.author puede venir como LID y no coincidir con los números de chat.participants.
  const chatId = message.fromMe ? message.to : message.from;
  if (chatId !== GRUPO_ID) return;

  // Chat normal del grupo: si no empieza con VOTO, se ignora sin responder.
  const parsed = parseVoteMessage(message.body || '', SECCIONES_VALIDAS);
  if (parsed.ignorar) return;

  if (!parsed.ok) {
    await message.reply(`❌ ${parsed.error}\n\n${FORMATO_AYUDA}`);
    await telegram.notifyFormatoInvalido(parsed.error, message.author || message.from);
    return;
  }

  const { nombres, seccion, grado, voto } = parsed.data;
  const operador = await resolveOperador(message);

  const registrados = [];
  const noRegistrados = [];
  // Evita mandar el mismo aviso de Telegram varias veces cuando la Sección o
  // el Grado del mensaje (compartidos por todos los nombres) no existen.
  const avisosUnicos = new Set();

  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i];
    let result;
    try {
      result = await excelManager.runExclusive(async () => {
        // Si alguien editó el Excel a mano, se recarga antes de registrar: no se pisa su cambio.
        await excelManager.recargarSiCambio();
        const r = excelManager.processVote({ nombre, seccion, grado, voto, operador });
        if (r.status === 'REGISTRADO' || r.status === 'DISCREPANCIA') await excelManager.save();
        return r;
      });
    } catch (err) {
      // La memoria pudo quedar por delante del disco: se vuelve a leer lo que hay en el archivo.
      const pendientes = nombres.slice(i);
      const recuperado = await excelManager.runExclusive(() => excelManager.recuperar());
      if (!recuperado) await telegram.notifyRecargaFallida();
      await telegram.notifyFalloGuardado({ operador, nombres: pendientes, error: err.message });
      noRegistrados.push(...pendientes.map((n) => `${n}: no se pudo guardar; reenvía este nombre`));
      break;
    }
    await procesarResultadoVoto(result, registrados, noRegistrados, avisosUnicos);
  }

  // Una sola respuesta citada: lo registrado y lo que no, con el motivo, para que el operador sepa qué reenviar.
  const partes = [];
  if (registrados.length > 0) {
    const detalle = registrados
      .map((r) => `${r.grado} | Fila ${r.rowNumber} | ${r.nombreEnPadron} | Sección ${r.seccion} | Voto: ${r.voto}`)
      .join('\n');
    const encabezado = registrados.length === 1 ? '✅ Voto registrado.' : `✅ ${registrados.length} votos registrados.`;
    partes.push(`${encabezado}\n${detalle}`);
  }
  if (noRegistrados.length > 0) {
    partes.push(`⚠️ No registrados o para revisión:\n${noRegistrados.map((t) => `- ${t}`).join('\n')}`);
  }
  if (partes.length > 0) await message.reply(partes.join('\n\n'));
}

/** Aplica el resultado de un solo nombre: avisa a Telegram y deja constancia para la respuesta del grupo. */
async function procesarResultadoVoto(result, registrados, noRegistrados, avisosUnicos) {
  const nombre = result.nombre || result.nombreEnPadron;
  switch (result.status) {
    case 'REGISTRADO':
      registrados.push(result);
      // La ambigüedad se resuelve/avisa solo por Telegram.
      if (result.ambiguous) await telegram.notifyAmbiguo(result);
      break;

    case 'DUPLICADO_IGNORADO':
      noRegistrados.push(`${nombre}: ya estaba registrado con ese mismo voto`);
      await telegram.notifyDuplicado(result);
      break;

    case 'DISCREPANCIA':
      noRegistrados.push(`${nombre}: ya tenía otro voto contado; quedó marcado para revisión`);
      await telegram.notifyDiscrepancia(result);
      break;

    case 'NOMBRE_NO_ENCONTRADO':
      noRegistrados.push(`${nombre}: no está en el padrón (${result.grado}, sección ${result.seccion})`);
      await telegram.notifyNoEncontrado(result);
      break;

    case 'SECCION_NO_ENCONTRADA': {
      noRegistrados.push(`${nombre}: la sección ${result.seccion} no existe en ${result.hoja}`);
      const key = `SECCION:${result.hoja}:${result.seccion}`;
      if (!avisosUnicos.has(key)) {
        avisosUnicos.add(key);
        await telegram.notifySeccionNoEncontrada(result);
      }
      break;
    }

    case 'GRADO_NO_ENCONTRADO': {
      noRegistrados.push(`${nombre}: el grado "${result.grado}" no existe`);
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
  console.error('Error fatal iniciando el bot:', err.message);
  process.exit(1);
});

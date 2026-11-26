'use strict';

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const { ExcelManager, CANDIDATOS } = require('./excelManager');
const { parseVoteMessage } = require('./messageParser');
const { TelegramNotifier } = require('./telegramNotifier');

const EXCEL_PATH = path.resolve(process.env.EXCEL_PATH || './data/Padron.xlsx');
// Id del grupo donde se recogen los votos (termina en @g.us). Sin él el bot no arranca.
const GRUPO_ID = (process.env.VOTACION_GRUPO_ID || '').trim();

const FORMATO_AYUDA =
  'Formato (una persona por mensaje):\nVOTO\nNombre completo [grado] [salón]\nPor quién votas (opcional; si se omite cuenta como Aaron)\n\nGrado: Primero, Segundo, Tercero o Cuarto. Salón: una letra (A–G).';

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

  const client = new Client({
    authStrategy: new LocalAuth(), // guarda la sesión para no escanear el QR cada vez
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      // Si Puppeteer no pudo descargar su propio Chromium, se puede apuntar
      // a uno ya instalado en el sistema definiendo CHROME_PATH en .env
      // (ej. /usr/bin/chromium-browser, /usr/bin/google-chrome o /usr/bin/brave).
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
    // Solo el nombre: el desempate compara contra la columna "Operador" del Excel, que son nombres.
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
  const parsed = parseVoteMessage(message.body || '');
  if (parsed.ignorar) return;

  if (!parsed.ok) {
    await message.reply(`❌ ${parsed.error}\n\n${FORMATO_AYUDA}`);
    await telegram.notifyFormatoInvalido(parsed.error, message.author || message.from);
    return;
  }

  const { nombre, voto, grado, seccion } = parsed.data;
  const operador = await resolveOperador(message);

  // Sin VOTO, un nombre que no está en el padrón es charla del grupo: no se responde ni se anota.
  if (parsed.sinPrefijo) {
    const existe = await excelManager.runExclusive(async () => {
      await excelManager.recargarSiCambio();
      return excelManager.existePersona(nombre, operador);
    });
    if (!existe) return;
  }

  let result;
  try {
    result = await excelManager.runExclusive(async () => {
      // Si alguien editó el Excel a mano, se recarga antes de registrar: no se pisa su cambio.
      await excelManager.recargarSiCambio();
      let r = excelManager.processVote({ nombre, voto, operador, grado, seccion });
      // Nombre que no está en ningún grado: se anota en la hoja "No encontrados" para revisarlo a mano.
      if (r.status === 'NOMBRE_NO_ENCONTRADO') r = excelManager.registrarNoEncontrado({ nombre, voto, operador });
      if (['REGISTRADO', 'DISCREPANCIA', 'ANOTADO_NO_ENCONTRADO'].includes(r.status)) await excelManager.save();
      return r;
    });
  } catch (err) {
    // La memoria pudo quedar por delante del disco: se vuelve a leer lo que hay en el archivo.
    const recuperado = await excelManager.runExclusive(() => excelManager.recuperar());
    if (!recuperado) await telegram.notifyRecargaFallida();
    await telegram.notifyFalloGuardado({ operador, nombres: [nombre], error: err.message });
    await message.reply(`⚠️ No se pudo guardar el voto; reenvíalo.`);
    return;
  }

  await message.reply(await procesarResultadoVoto(result));
}

/** Qué pasó con la marca supuesta de la fila (la que estaba en el padrón antes de confirmar). */
function describirSupuesto({ supuestoPrevio, voto }) {
  if (supuestoPrevio === voto) return `Confirma el voto supuesto: ${voto}.`;
  if (supuestoPrevio) return `Cambia el voto supuesto "${supuestoPrevio}" por "${voto}".`;
  return 'Voto nuevo (no tenía voto supuesto).';
}

/** Avisa a Telegram cuando corresponde y devuelve el texto de respuesta para el grupo. */
async function procesarResultadoVoto(result) {
  switch (result.status) {
    case 'REGISTRADO':
      // La ambigüedad se resuelve/avisa solo por Telegram.
      if (result.ambiguous) await telegram.notifyAmbiguo(result);
      return `✅ Voto registrado.\n${result.nombreEnPadron} | ${result.grado} | Sección ${result.seccion} | Voto: ${result.voto}\n${describirSupuesto(result)}`;

    case 'DUPLICADO_IGNORADO':
      await telegram.notifyDuplicado(result);
      return `⚠️ ${result.nombre}: ya estaba registrado con ese mismo voto.`;

    case 'DISCREPANCIA':
      await telegram.notifyDiscrepancia(result);
      return `⚠️ ${result.nombre}: ya tenía otro voto contado; quedó marcado para revisión.`;

    case 'ANOTADO_NO_ENCONTRADO':
      await telegram.notifyNoEncontrado(result);
      return `❌ ${result.nombre}: no está en el padrón. Quedó anotado en la hoja "No encontrados", fila ${result.rowNumber}, para revisarlo.`;

    case 'CANDIDATO_NO_VALIDO':
      return `❌ "${result.voto}" no es una opción. Opciones: ${CANDIDATOS.join(', ')}.`;

    default:
      console.warn('Estado desconocido:', result);
      return '⚠️ No se pudo procesar el voto; reenvíalo.';
  }
}

main().catch((err) => {
  console.error('Error fatal iniciando el bot:', err.message);
  process.exit(1);
});

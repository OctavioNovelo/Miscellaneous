'use strict';

const TelegramBot = require('node-telegram-bot-api');

/** Telegram usa parse_mode HTML: todo dato que viene de WhatsApp debe escaparse o el envío falla. */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

class TelegramNotifier {
  constructor(token, chatId) {
    this.enabled = Boolean(token && chatId);
    if (this.enabled) {
      // polling:false porque solo enviamos mensajes, no recibimos comandos
      this.bot = new TelegramBot(token, { polling: false });
      this.chatId = chatId;
    } else {
      console.warn('[Telegram] Token o chatId no configurados: las notificaciones están desactivadas.');
    }
  }

  async send(text) {
    if (!this.enabled) {
      console.log('[Telegram deshabilitado] ' + text);
      return;
    }
    try {
      await this.bot.sendMessage(this.chatId, text, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[Telegram] Error enviando mensaje:', err.message);
    }
  }

  notifyDiscrepancia(result) {
    const msg =
      `⚠️ <b>DISCREPANCIA</b> — ${esc(result.grado)} | Fila ${result.rowNumber} (Sección ${esc(result.seccion)})\n` +
      `Nombre en padrón: ${esc(result.nombreEnPadron)}\n` +
      `Voto ya contado: <b>${esc(result.votoPrevio)}</b> (operador: ${esc(result.operadorPrevio)})\n` +
      `Nuevo reporte: <b>${esc(result.voto)}</b> (operador: ${esc(result.operador)})\n` +
      `Parámetros que discrepan:\n- ${result.discrepancias.map(esc).join('\n- ')}\n` +
      `El voto original se mantiene contado.`;
    return this.send(msg);
  }

  notifyDuplicado(result) {
    const msg =
      `🔁 <b>VOTO DUPLICADO (ignorado)</b> — ${esc(result.grado)} | Fila ${result.rowNumber} (Sección ${esc(result.seccion)})\n` +
      `Nombre en padrón: ${esc(result.nombreEnPadron)}\n` +
      `Voto ya contado: <b>${esc(result.votoPrevio)}</b> (operador original: ${esc(result.operadorPrevio || 'precarga inicial')})\n` +
      `Nuevo reporte: mismo voto <b>${esc(result.voto)}</b> (operador: ${esc(result.operador)})\n` +
      `No se modificó nada, es solo un aviso informativo.`;
    return this.send(msg);
  }

  notifyNoEncontrado(result) {
    const msg =
      `❌ <b>NOMBRE NO ENCONTRADO</b> (no se registró nada)\n` +
      `Nombre: ${esc(result.nombre)}\n` +
      `Voto reportado: ${esc(result.voto)}\n` +
      `Operador que reportó: ${esc(result.operador)}\n` +
      `Revisar manualmente en el padrón.`;
    return this.send(msg);
  }

  notifyAmbiguo(result) {
    const msg =
      `❓ <b>COINCIDENCIA AMBIGUA</b> — ${esc(result.grado)} | Fila usada: ${result.rowNumber} (Sección ${esc(result.seccion)})\n` +
      `Se encontraron varios nombres muy parecidos: ${result.candidatosAmbiguos.map(esc).join(' | ')}\n` +
      `Verificar manualmente que la fila ${result.rowNumber} sea la persona correcta.`;
    return this.send(msg);
  }

  notifyFormatoInvalido(error, from) {
    const msg = `⚠️ <b>MENSAJE CON FORMATO INVÁLIDO</b>\nDe: ${esc(from)}\n${esc(error)}`;
    return this.send(msg);
  }

  notifyFalloGuardado({ operador, nombres, error }) {
    const msg =
      `💾 <b>NO SE PUDO GUARDAR</b>\n` +
      `Operador: ${esc(operador)}\n` +
      `Pendientes (no registrados): ${nombres.map(esc).join(' | ')}\n` +
      `Error: ${esc(error)}\n` +
      `El padrón se recargó desde disco. Pedir al operador que reenvíe.`;
    return this.send(msg);
  }

  notifyRecargaFallida() {
    return this.send(`⚠️ <b>PADRÓN</b>: no se pudo recargar el Excel tras un fallo de guardado. Revisar el archivo antes de seguir.`);
  }

  notifyConexion(texto) {
    return this.send(`🔌 <b>WHATSAPP</b>: ${esc(texto)}`);
  }
}

module.exports = { TelegramNotifier };

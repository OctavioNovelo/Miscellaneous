'use strict';

const TelegramBot = require('node-telegram-bot-api');

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
      `⚠️ <b>DISCREPANCIA</b> — ${result.grado} | Fila ${result.rowNumber} (Sección ${result.seccion})\n` +
      `Nombre en padrón: ${result.nombreEnPadron}\n` +
      `Voto ya contado: <b>${result.votoPrevio}</b> (operador: ${result.operadorPrevio})\n` +
      `Nuevo reporte: <b>${result.voto}</b> (operador: ${result.operador})\n` +
      `Parámetros que discrepan:\n- ${result.discrepancias.join('\n- ')}\n` +
      `El voto original se mantiene contado.`;
    return this.send(msg);
  }

  notifyDuplicado(result) {
    const msg =
      `🔁 <b>VOTO DUPLICADO (ignorado)</b> — ${result.grado} | Fila ${result.rowNumber} (Sección ${result.seccion})\n` +
      `Nombre en padrón: ${result.nombreEnPadron}\n` +
      `Voto ya contado: <b>${result.votoPrevio}</b> (operador original: ${result.operadorPrevio || 'precarga inicial'})\n` +
      `Nuevo reporte: mismo voto <b>${result.voto}</b> (operador: ${result.operador})\n` +
      `No se modificó nada, es solo un aviso informativo.`;
    return this.send(msg);
  }

  notifyNoEncontrado(result, operadorEnMensaje) {
    const msg =
      `❌ <b>NO ENCONTRADO</b>\n` +
      `Nombre: ${result.nombre}\n` +
      `Grado: ${result.grado} | Sección: ${result.seccion}\n` +
      `Operador que reportó: ${operadorEnMensaje}\n` +
      `Revisar manualmente en el padrón.`;
    return this.send(msg);
  }

  notifySeccionNoEncontrada(result) {
    const msg = `❌ <b>SECCIÓN NO ENCONTRADA</b>: "${result.seccion}" no existe en la hoja "${result.hoja}".`;
    return this.send(msg);
  }

  notifyGradoNoEncontrado(result) {
    const msg =
      `❌ <b>GRADO NO ENCONTRADO</b>: "${result.grado}" no coincide con ninguna hoja del padrón ` +
      `(válidos: Primero, Segundo, Tercero, Cuarto, Quinto).`;
    return this.send(msg);
  }

  notifyAmbiguo(result) {
    const msg =
      `❓ <b>COINCIDENCIA AMBIGUA</b> — ${result.grado} | Fila usada: ${result.rowNumber} (Sección ${result.seccion})\n` +
      `Se encontraron varios nombres muy parecidos: ${result.candidatosAmbiguos.join(' | ')}\n` +
      `Verificar manualmente que la fila ${result.rowNumber} sea la persona correcta.`;
    return this.send(msg);
  }

  notifyFormatoInvalido(error, from) {
    const msg = `⚠️ <b>MENSAJE CON FORMATO INVÁLIDO</b>\nDe: ${from}\n${error}`;
    return this.send(msg);
  }
}

module.exports = { TelegramNotifier };
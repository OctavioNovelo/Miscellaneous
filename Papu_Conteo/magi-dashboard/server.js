'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const chokidar = require('chokidar');
const { Server } = require('socket.io');
const ExcelJS = require('exceljs');

// Mismo archivo que usa el bot (data/Padron.xlsx). Puedes overridear con
// DASHBOARD_EXCEL_PATH en un .env dentro de esta carpeta si vives en otro lado.
const EXCEL_PATH = path.resolve(
  process.env.DASHBOARD_EXCEL_PATH || process.env.EXCEL_PATH || '../data/Padron.xlsx'
);
const PORT = process.env.DASHBOARD_PORT || 4141;

const COL = {
  SECCION: 1,
  NOMBRE: 2,
  TELEFONO: 3,
  TOMAS: 4,
  ALEX: 5,
  INDECISO: 6,
  NOTAS: 7,
  OPERADOR_ASIGNADO: 8,
  CONFIRMADO: 9,
  VOTO_CONFIRMADO: 10,
  OPERADOR_CONFIRMO: 11,
  FECHA_HORA: 12,
  DISCREPANCIA: 13,
};

// Nombres "MAGI" para cada hoja/grado, en el orden en que aparecen en el Excel.
const MAGI_NAMES = ['MELCHIOR-1', 'BALTHASAR-2', 'CASPER-3'];

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

async function readStats() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);

  const grados = [];
  const actividad = [];
  let totales = { tomas: 0, alex: 0, indeciso: 0, confirmados: 0, padron: 0, discrepancias: 0, pendientes: 0 };
  let ultimaActualizacion = null;

  wb.worksheets.forEach((sheet, idx) => {
    let tomas = 0, alex = 0, indeciso = 0, confirmados = 0, padron = 0, discrepancias = 0;
    const seccionesSet = new Set();

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const nombre = cellText(row.getCell(COL.NOMBRE).value);
      if (!nombre) return;

      padron += 1;
      const seccion = cellText(row.getCell(COL.SECCION).value);
      if (seccion) seccionesSet.add(seccion);

      const confirmado = cellText(row.getCell(COL.CONFIRMADO).value).toUpperCase() === 'SI';
      const votoLabel = cellText(row.getCell(COL.VOTO_CONFIRMADO).value).toUpperCase();
      const discrepancia = cellText(row.getCell(COL.DISCREPANCIA).value);

      if (discrepancia) discrepancias += 1;

      if (confirmado) {
        confirmados += 1;
        if (votoLabel === 'TOMAS') tomas += 1;
        else if (votoLabel === 'ALEX') alex += 1;
        else indeciso += 1;

        const fechaRaw = row.getCell(COL.FECHA_HORA).value;
        const fecha = fechaRaw instanceof Date ? fechaRaw : (fechaRaw ? new Date(fechaRaw) : null);
        if (fecha && !isNaN(fecha.getTime())) {
          if (!ultimaActualizacion || fecha > ultimaActualizacion) ultimaActualizacion = fecha;
          actividad.push({
            fecha: fecha.toISOString(),
            hoja: sheet.name,
            seccion,
            nombre,
            voto: votoLabel,
            operador: cellText(row.getCell(COL.OPERADOR_CONFIRMO).value),
            discrepancia: Boolean(discrepancia),
          });
        }
      }
    });

    grados.push({
      hoja: sheet.name,
      magi: MAGI_NAMES[idx] || `MAGI-${idx + 1}`,
      padron,
      confirmados,
      pendientes: padron - confirmados,
      tomas,
      alex,
      indeciso,
      discrepancias,
      secciones: [...seccionesSet].sort(),
      turnout: padron > 0 ? confirmados / padron : 0,
    });

    totales.tomas += tomas;
    totales.alex += alex;
    totales.indeciso += indeciso;
    totales.confirmados += confirmados;
    totales.padron += padron;
    totales.discrepancias += discrepancias;
  });

  totales.pendientes = totales.padron - totales.confirmados;
  totales.turnout = totales.padron > 0 ? totales.confirmados / totales.padron : 0;

  // Actividad reciente: las 25 confirmaciones mas nuevas
  actividad.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return {
    generadoEn: new Date().toISOString(),
    ultimaActualizacion: ultimaActualizacion ? ultimaActualizacion.toISOString() : null,
    grados,
    totales,
    actividad: actividad.slice(0, 25),
  };
}

let broadcasting = false;
let pendingRebroadcast = false;

async function broadcastStats() {
  if (broadcasting) {
    pendingRebroadcast = true;
    return;
  }
  broadcasting = true;
  try {
    const stats = await readStats();
    io.emit('stats', stats);
    console.log(`[MAGI] Estadisticas emitidas — confirmados: ${stats.totales.confirmados}/${stats.totales.padron}`);
  } catch (err) {
    console.error('[MAGI] Error leyendo el Excel:', err.message);
    io.emit('error', { message: err.message });
  } finally {
    broadcasting = false;
    if (pendingRebroadcast) {
      pendingRebroadcast = false;
      broadcastStats();
    }
  }
}

// Watcher del archivo: el bot lo reescribe completo en cada voto, así que
// debounceamos un poco para no leer un archivo a medio escribir.
let debounceTimer = null;
function scheduleBroadcast() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(broadcastStats, 400);
}

chokidar
  .watch(EXCEL_PATH, { awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 } })
  .on('change', scheduleBroadcast)
  .on('error', (err) => console.error('[MAGI] Error observando el archivo:', err.message));

// Respaldo: si por lo que sea el watcher no detecta el cambio, refrescamos
// cada 10s de todas formas.
setInterval(broadcastStats, 10000);

io.on('connection', (socket) => {
  console.log('[MAGI] Cliente conectado al dashboard');
  broadcastStats();
});

server.listen(PORT, () => {
  console.log(`[MAGI] Sistema de conteo escuchando en http://localhost:${PORT}`);
  console.log(`[MAGI] Observando: ${EXCEL_PATH}`);
});

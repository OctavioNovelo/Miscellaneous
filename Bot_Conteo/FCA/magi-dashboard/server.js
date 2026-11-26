'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const chokidar = require('chokidar');
const { Server } = require('socket.io');
const ExcelJS = require('exceljs');
const { normalize } = require('../src/matcher');
const { GRADO_SHEETS } = require('../src/excelManager');

// Mismo archivo que usa el bot (data/Padron.xlsx). Puedes overridear con
// DASHBOARD_EXCEL_PATH en un .env dentro de esta carpeta. Las rutas relativas
// se resuelven desde esta carpeta, no desde el directorio de trabajo.
const EXCEL_PATH = path.resolve(__dirname, process.env.DASHBOARD_EXCEL_PATH || '../data/Padron.xlsx');
const PORT = process.env.DASHBOARD_PORT || 4141;

// Columnas por encabezado: el Excel combinado no tiene posiciones fijas y las de
// confirmación las agrega el bot al cargar (pueden faltar; entonces cuentan cero).
const HEADERS = {
  SECCION: ['SALON', 'SECCION'],
  NOMBRE: ['NOMBRE'],
  CONFIRMADO: ['CONFIRMADO'],
  VOTO_CONFIRMADO: ['VOTO CONFIRMADO'],
  OPERADOR_CONFIRMO: ['OPERADOR CONFIRMO'],
  FECHA_HORA: ['FECHA/HORA'],
  DISCREPANCIA: ['DISCREPANCIA'],
};

const CANDIDATOS = ['Voto Omar', 'NO voto por Omar', 'No ha votado'];
// Opción que cuenta a las personas sin confirmar (marca supuesta "No ha votado").
const PENDIENTE = 'No ha votado';
const CANDIDATO_POR_NORMA = new Map(CANDIDATOS.map((c) => [normalize(c), c]));

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);

function cellText(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('').trim();
    if ('result' in v) return cellText(v.result);
    if ('text' in v) return cellText(v.text);
  }
  return String(v).trim();
}

function colsOf(sheet) {
  const byHeader = new Map();
  sheet.getRow(1).eachCell((cell, col) => {
    const h = normalize(cellText(cell.value));
    if (h && !byHeader.has(h)) byHeader.set(h, col);
  });
  const cols = {};
  for (const [key, names] of Object.entries(HEADERS)) {
    cols[key] = names.map((n) => byHeader.get(n)).find(Boolean) || null;
  }
  // Columna de cada opción de voto: su marca (1) dice el voto vigente, confirmado o no.
  cols.marcas = Object.fromEntries(CANDIDATOS.map((c) => [c, byHeader.get(normalize(c)) || null]));
  return cols;
}

function votosEnCero() {
  return Object.fromEntries(CANDIDATOS.map((c) => [c, 0]));
}

function statsFromWorkbook(wb) {
  const grados = [];
  const actividad = [];
  const totales = { votos: votosEnCero(), otros: 0, confirmados: 0, padron: 0, discrepancias: 0, pendientes: 0 };
  let ultimaActualizacion = null;

  // Revisar_Manual no es un grado: no cuenta en el padrón.
  // Solo los grados: 'No encontrados' y cualquier otra hoja auxiliar no cuentan en el padrón.
  wb.worksheets.filter((s) => GRADO_SHEETS.includes(s.name)).forEach((sheet) => {
    const cols = colsOf(sheet);
    const get = (row, key) => (cols[key] ? cellText(row.getCell(cols[key]).value) : '');
    const votos = votosEnCero();
    let otros = 0, confirmados = 0, padron = 0, discrepancias = 0;
    const seccionesSet = new Set();

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const nombre = get(row, 'NOMBRE');
      if (!nombre) return;

      padron += 1;
      const seccion = get(row, 'SECCION');
      if (seccion) seccionesSet.add(seccion);

      const discrepancia = get(row, 'DISCREPANCIA');
      if (discrepancia) discrepancias += 1;

      // Sin confirmar: solo cuenta "No ha votado" (la marca supuesta de los demás no suma hasta confirmarse).
      if (normalize(get(row, 'CONFIRMADO')) !== 'SI') {
        const col = cols.marcas[PENDIENTE];
        if (col && cellText(row.getCell(col).value) === '1') votos[PENDIENTE] += 1;
        return;
      }

      confirmados += 1;
      // Confirmadas: cuentan por su voto confirmado; un valor que no es una de las 3 opciones va a "otros".
      const candidato = CANDIDATO_POR_NORMA.get(normalize(get(row, 'VOTO_CONFIRMADO'))) || null;
      if (candidato) votos[candidato] += 1;
      else otros += 1;

      const fechaRaw = cols.FECHA_HORA ? row.getCell(cols.FECHA_HORA).value : null;
      const fecha = fechaRaw instanceof Date ? fechaRaw : (fechaRaw ? new Date(cellText(fechaRaw)) : null);
      if (fecha && !isNaN(fecha.getTime())) {
        if (!ultimaActualizacion || fecha > ultimaActualizacion) ultimaActualizacion = fecha;
        actividad.push({
          fecha: fecha.toISOString(),
          hoja: sheet.name,
          seccion,
          nombre,
          voto: candidato || get(row, 'VOTO_CONFIRMADO'),
          candidato,
          operador: get(row, 'OPERADOR_CONFIRMO'),
          discrepancia: Boolean(discrepancia),
        });
      }
    });

    grados.push({
      hoja: sheet.name,
      padron,
      confirmados,
      pendientes: padron - confirmados,
      votos,
      otros,
      discrepancias,
      secciones: [...seccionesSet].sort(),
      turnout: padron > 0 ? confirmados / padron : 0,
    });

    for (const c of CANDIDATOS) totales.votos[c] += votos[c];
    totales.otros += otros;
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
    candidatos: CANDIDATOS,
    grados,
    totales,
    actividad: actividad.slice(0, 25),
  };
}

async function readStats() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  return statsFromWorkbook(wb);
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
    console.log(`[Conteo] Estadisticas emitidas — confirmados: ${stats.totales.confirmados}/${stats.totales.padron}`);
  } catch (err) {
    console.error('[Conteo] Error leyendo el Excel:', err.message);
    io.emit('error', { message: err.message });
  } finally {
    broadcasting = false;
    if (pendingRebroadcast) {
      pendingRebroadcast = false;
      broadcastStats();
    }
  }
}

function start() {
  // Watcher del archivo: el bot lo reescribe completo en cada voto, así que
  // debounceamos un poco para no leer un archivo a medio escribir.
  let debounceTimer = null;
  function scheduleBroadcast() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcastStats, 400);
  }

  // Se observa el directorio y se filtra el archivo: el bot escribe a un temporal y lo
  // renombra sobre el Excel, y al observar solo el archivo el watcher perdería el inodo.
  chokidar
    .watch(path.dirname(EXCEL_PATH), { ignoreInitial: true, depth: 0, awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 } })
    .on('all', (event, file) => {
      if (path.resolve(file) === EXCEL_PATH && (event === 'add' || event === 'change')) scheduleBroadcast();
    })
    .on('error', (err) => console.error('[Conteo] Error observando el directorio:', err.message));

  // Respaldo: si por lo que sea el watcher no detecta el cambio, refrescamos
  // cada 10s de todas formas.
  setInterval(broadcastStats, 10000);

  io.on('connection', (socket) => {
    console.log('[Conteo] Cliente conectado al dashboard');
    broadcastStats();
  });

  // Solo local: el padrón tiene nombres y operadores, no se expone a la red.
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Conteo] Dashboard escuchando en http://127.0.0.1:${PORT}`);
    console.log(`[Conteo] Observando: ${EXCEL_PATH}`);
  });
}

if (require.main === module) start();

module.exports = { statsFromWorkbook, colsOf, CANDIDATOS };

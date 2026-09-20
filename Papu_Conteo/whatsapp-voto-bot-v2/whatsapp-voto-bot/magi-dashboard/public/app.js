'use strict';

const socket = io();

const COLORS = {
  tomas: '#35c3ff',
  alex: '#ff5b7f',
  indeciso: '#ffb000',
};

let lastActivityKey = null;

// --- Reloj ---
function tickClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('es-MX', { hour12: false });
}
setInterval(tickClock, 1000);
tickClock();

// --- Conexión ---
socket.on('connect', () => {
  const el = document.getElementById('conn-status');
  el.textContent = 'ENLACE ACTIVO';
  el.classList.remove('status-off');
  el.classList.add('status-on');
});
socket.on('disconnect', () => {
  const el = document.getElementById('conn-status');
  el.textContent = 'SIN CONEXION';
  el.classList.remove('status-on');
  el.classList.add('status-off');
});

socket.on('error', (payload) => {
  console.error('Error del servidor MAGI:', payload.message);
});

socket.on('stats', (stats) => {
  safeRender('renderMagiUnits', () => renderMagiUnits(stats.grados));
  safeRender('renderTotals', () => renderTotals(stats.totales));
  safeRender('renderDoughnut', () => renderDoughnut(stats.totales));
  safeRender('renderBarChart', () => renderBarChart(stats.grados));
  safeRender('renderAlerts', () => renderAlerts(stats.grados));
  safeRender('renderActivity', () => renderActivity(stats.actividad));
  safeRender('renderFooter', () => renderFooter(stats));
});

// Antes, si renderCharts (o cualquiera) tiraba una excepción, todo lo que
// venía después en la misma llamada (Alertas, Registro de actividad) se
// quedaba sin ejecutar y esos paneles nunca se llenaban. Con esto, un fallo
// en un panel se loguea en consola pero no bloquea a los demás.
function safeRender(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[MAGI] Error renderizando "${name}":`, err);
  }
}

// --- Animación de conteo ---
function animateNumber(el, to) {
  const from = Number(el.dataset.value || 0);
  if (from === to) return;
  el.dataset.value = to;
  const duration = 500;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const val = Math.round(from + (to - from) * t);
    el.textContent = val;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function pct(n, total) {
  if (!total) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

// --- Unidades MAGI (una por grado) ---
function renderMagiUnits(grados) {
  const row = document.getElementById('magi-row');
  if (!row.dataset.built) {
    row.innerHTML = grados
      .map(
        (g, i) => `
      <div class="magi-unit" id="magi-${i}">
        <div class="magi-hex">${g.magi.split('-')[0]}</div>
        <div class="magi-name">${g.magi}</div>
        <div class="magi-sub">${g.hoja.toUpperCase()}</div>
        <div class="magi-stats">
          <div>CONF<span id="magi-${i}-conf">0</span></div>
          <div>TOTAL<span id="magi-${i}-total">0</span></div>
          <div>%<span id="magi-${i}-pct">0</span></div>
        </div>
        <div class="magi-bar" id="magi-${i}-bar"></div>
      </div>`
      )
      .join('');
    row.dataset.built = '1';
  }

  grados.forEach((g, i) => {
    const unit = document.getElementById(`magi-${i}`);
    animateNumber(document.getElementById(`magi-${i}-conf`), g.confirmados);
    animateNumber(document.getElementById(`magi-${i}-total`), g.padron);
    document.getElementById(`magi-${i}-pct`).textContent = Math.round(g.turnout * 100);

    const bar = document.getElementById(`magi-${i}-bar`);
    const total = g.tomas + g.alex + g.indeciso || 1;
    bar.innerHTML = `
      <div class="magi-bar-seg" style="width:${(g.tomas / total) * 100}%;background:${COLORS.tomas}"></div>
      <div class="magi-bar-seg" style="width:${(g.indeciso / total) * 100}%;background:${COLORS.indeciso}"></div>
      <div class="magi-bar-seg" style="width:${(g.alex / total) * 100}%;background:${COLORS.alex}"></div>
    `;

    unit.classList.toggle('has-alert', g.discrepancias > 0);
  });
}

// --- Totales centrales ---
function renderTotals(totales) {
  animateNumber(document.getElementById('total-tomas'), totales.tomas);
  animateNumber(document.getElementById('total-alex'), totales.alex);
  animateNumber(document.getElementById('total-indeciso'), totales.indeciso);

  const confirmadosTotal = totales.tomas + totales.alex + totales.indeciso;
  document.getElementById('pct-tomas').textContent = pct(totales.tomas, confirmadosTotal);
  document.getElementById('pct-alex').textContent = pct(totales.alex, confirmadosTotal);
  document.getElementById('pct-indeciso').textContent = pct(totales.indeciso, confirmadosTotal);

  document.getElementById('turnout-fraction').textContent = `${totales.confirmados} / ${totales.padron}`;
  const turnoutPct = totales.padron ? (totales.confirmados / totales.padron) * 100 : 0;
  document.getElementById('turnout-fill').style.width = `${turnoutPct}%`;
  document.getElementById('turnout-pct').textContent = `${turnoutPct.toFixed(1)}%`;
}

const LEGEND_ITEMS = [
  { key: 'tomas', label: 'Tomas', color: COLORS.tomas },
  { key: 'indeciso', label: 'Indeciso', color: COLORS.indeciso },
  { key: 'alex', label: 'Alex', color: COLORS.alex },
];

function legendHtml() {
  return LEGEND_ITEMS.map(
    (it) => `<span class="legend-item"><span class="legend-swatch" style="background:${it.color}"></span>${it.label}</span>`
  ).join('');
}

// --- Dona de distribución global (SVG puro, sin librerías) ---
function renderDoughnut(totales) {
  const svg = document.getElementById('doughnut-svg');
  const legend = document.getElementById('doughnut-legend');
  if (!legend.dataset.built) {
    legend.innerHTML = legendHtml();
    legend.dataset.built = '1';
  }

  const total = totales.tomas + totales.alex + totales.indeciso;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const segmentos = [
    { valor: totales.tomas, color: COLORS.tomas },
    { valor: totales.indeciso, color: COLORS.indeciso },
    { valor: totales.alex, color: COLORS.alex },
  ];

  let offset = 0;
  let circles = '';
  segmentos.forEach((seg) => {
    const fraccion = total > 0 ? seg.valor / total : 0;
    const dash = fraccion * circumference;
    circles += `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="26"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 100 100)" stroke-linecap="butt" />`;
    offset += dash;
  });

  svg.innerHTML = `
    <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#1a1000" stroke-width="26" />
    ${circles}
    <text x="100" y="96" text-anchor="middle" fill="#ffd166" font-family="Rajdhani, sans-serif" font-size="30" font-weight="700">${total}</text>
    <text x="100" y="118" text-anchor="middle" fill="#a56e00" font-family="Share Tech Mono, monospace" font-size="11">VOTOS CONF.</text>
  `;
}

// --- Barras por grado (HTML/CSS puro, sin librerías) ---
function renderBarChart(grados) {
  const legend = document.getElementById('bar-legend');
  if (!legend.dataset.built) {
    legend.className = 'chart-legend horizontal';
    legend.innerHTML = legendHtml();
    legend.dataset.built = '1';
  }

  const container = document.getElementById('bar-chart-container');
  container.innerHTML = grados
    .map((g) => {
      const total = g.tomas + g.alex + g.indeciso;
      const base = total || 1;
      const seg = (valor, color) => {
        const w = (valor / base) * 100;
        return `<div class="grado-bar-seg" style="width:${w}%;background:${color}">${valor > 0 && w > 8 ? valor : ''}</div>`;
      };
      return `
        <div class="grado-bar-row">
          <div class="grado-bar-toprow">
            <span class="grado-bar-label">${g.hoja}</span>
            <span class="grado-bar-total">${total} voto(s) confirmado(s)</span>
          </div>
          <div class="grado-bar-track">
            ${seg(g.tomas, COLORS.tomas)}${seg(g.indeciso, COLORS.indeciso)}${seg(g.alex, COLORS.alex)}
          </div>
        </div>`;
    })
    .join('');
}

// --- Alertas (discrepancias) ---
function renderAlerts(grados) {
  const list = document.getElementById('alert-list');
  const totalAlertas = grados.reduce((sum, g) => sum + g.discrepancias, 0);
  document.getElementById('alert-count').textContent = totalAlertas;

  if (totalAlertas === 0) {
    list.innerHTML = '<div class="empty-msg">Sin discrepancias registradas.</div>';
    return;
  }

  list.innerHTML = grados
    .filter((g) => g.discrepancias > 0)
    .map((g) => `<div class="alert-item">⚠ ${g.hoja}: ${g.discrepancias} discrepancia(s) pendiente(s) de revisión.</div>`)
    .join('');
}

// --- Ticker de actividad ---
function renderActivity(actividad) {
  const list = document.getElementById('activity-list');
  if (!actividad.length) {
    list.innerHTML = '<div class="empty-msg">Aún no hay votos confirmados.</div>';
    return;
  }

  const newestKey = actividad[0].fecha + actividad[0].nombre;
  const isFirstRender = lastActivityKey === null;

  list.innerHTML = actividad
    .map((a, i) => {
      const voteClass = `activity-voto-${a.voto.toLowerCase()}`;
      const hora = new Date(a.fecha).toLocaleTimeString('es-MX', { hour12: false });
      const flash = !isFirstRender && i === 0 && newestKey !== lastActivityKey ? 'new-flash' : '';
      return `<div class="activity-item ${flash}">[${hora}] <strong>${a.nombre}</strong> — ${a.hoja} Sec.${a.seccion} → <span class="${voteClass}">${a.voto}</span> (op. ${a.operador || '—'})</div>`;
    })
    .join('');

  lastActivityKey = newestKey;
}

function renderFooter(stats) {
  const updated = stats.ultimaActualizacion
    ? new Date(stats.ultimaActualizacion).toLocaleString('es-MX')
    : 'sin votos aún';
  document.getElementById('footer-updated').textContent = `Última actualización del padrón: ${updated}`;
  document.getElementById('footer-path').textContent = `Última lectura del sistema: ${new Date(stats.generadoEn).toLocaleTimeString('es-MX')}`;
}
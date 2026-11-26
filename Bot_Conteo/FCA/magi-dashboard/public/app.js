'use strict';

const socket = io();

// Los candidatos llegan del servidor; el color sale de la variable CSS --c-<clave>.
let CANDIDATOS = [];
const keyOf = (nombre) => String(nombre).toLowerCase().replace(/[^a-z0-9]/g, '');
const colorOf = (nombre) => `var(--c-${keyOf(nombre)}, var(--base))`;
const textOf = (nombre) => `var(--t-${keyOf(nombre)}, var(--on-base))`;
const sumVotos = (votos) => CANDIDATOS.reduce((sum, c) => sum + (votos?.[c] || 0), 0);

let lastActivityKey = null;

// Los nombres y operadores vienen de WhatsApp: se escapan antes de pasarlos a innerHTML.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Reloj ---
function tickClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('es-MX', { hour12: false });
}
setInterval(tickClock, 1000);
tickClock();

// --- Conexión ---
socket.on('connect', () => {
  const el = document.getElementById('conn-status');
  el.textContent = 'En vivo';
  el.classList.remove('status-off');
  el.classList.add('status-on');
});
socket.on('disconnect', () => {
  const el = document.getElementById('conn-status');
  el.textContent = 'Sin conexión';
  el.classList.remove('status-on');
  el.classList.add('status-off');
});

socket.on('error', (payload) => {
  console.error('Error del servidor:', payload.message);
});

socket.on('stats', (stats) => {
  CANDIDATOS = stats.candidatos || [];
  safeRender('renderGradoCards', () => renderGradoCards(stats.grados));
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
    console.error(`[Conteo] Error renderizando "${name}":`, err);
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

// --- Tarjetas por grado ---
function renderGradoCards(grados) {
  const row = document.getElementById('grado-row');
  if (!row.dataset.built) {
    row.innerHTML = grados
      .map(
        (g, i) => `
      <div class="grado-card" id="grado-${i}">
        <div class="grado-head"><span class="grado-name">${esc(g.hoja)}</span><span class="grado-alert-tag" id="grado-${i}-alert" hidden></span></div>
        <div class="grado-pct"><span id="grado-${i}-pct">0</span><small>%</small></div>
        <div class="grado-stats"><span id="grado-${i}-conf">0</span> de <span id="grado-${i}-total">0</span> confirmados</div>
        <div class="grado-bar" id="grado-${i}-bar"></div>
      </div>`
      )
      .join('');
    row.dataset.built = '1';
  }

  grados.forEach((g, i) => {
    const card = document.getElementById(`grado-${i}`);
    animateNumber(document.getElementById(`grado-${i}-conf`), g.confirmados);
    animateNumber(document.getElementById(`grado-${i}-total`), g.padron);
    document.getElementById(`grado-${i}-pct`).textContent = Math.round(g.turnout * 100);

    const bar = document.getElementById(`grado-${i}-bar`);
    const total = sumVotos(g.votos) || 1;
    bar.innerHTML = CANDIDATOS.map(
      (c) => `<div class="grado-bar-seg" style="width:${(g.votos[c] / total) * 100}%;background:${colorOf(c)}"></div>`
    ).join('');

    card.classList.toggle('has-alert', g.discrepancias > 0);
    const tag = document.getElementById(`grado-${i}-alert`);
    tag.hidden = g.discrepancias === 0;
    tag.textContent = `${g.discrepancias} disc.`;
  });
}

// --- Totales centrales ---
function renderTotals(totales) {
  const grid = document.getElementById('totals-grid');
  if (grid.dataset.built !== CANDIDATOS.join('|')) {
    grid.innerHTML = CANDIDATOS.map(
      (c, i) => `
      <div class="candidate-block" style="--swatch:${colorOf(c)}">
        <div class="candidate-name">${esc(c)}</div>
        <div class="candidate-count" id="total-c${i}">0</div>
        <div class="candidate-pct" id="pct-c${i}">0%</div>
      </div>`
    ).join('');
    grid.dataset.built = CANDIDATOS.join('|');
  }

  const votosTotal = sumVotos(totales.votos);
  CANDIDATOS.forEach((c, i) => {
    animateNumber(document.getElementById(`total-c${i}`), totales.votos[c] || 0);
    document.getElementById(`pct-c${i}`).textContent = pct(totales.votos[c] || 0, votosTotal);
  });

  animateNumber(document.getElementById('sum-confirmados'), totales.confirmados);
  animateNumber(document.getElementById('sum-pendientes'), totales.pendientes);
  animateNumber(document.getElementById('sum-discrepancias'), totales.discrepancias);
  animateNumber(document.getElementById('sum-otros'), totales.otros || 0);
  document.getElementById('sum-discrepancias-box').classList.toggle('is-warn', totales.discrepancias > 0);

  document.getElementById('turnout-fraction').textContent = `${totales.confirmados} / ${totales.padron}`;
  const turnoutPct = totales.padron ? (totales.confirmados / totales.padron) * 100 : 0;
  document.getElementById('turnout-fill').style.width = `${turnoutPct}%`;
  document.getElementById('turnout-pct').textContent = `${turnoutPct.toFixed(1)}%`;
}

function legendHtml() {
  return CANDIDATOS.map(
    (c) => `<span class="legend-item"><span class="legend-swatch" style="background:${colorOf(c)}"></span>${esc(c)}</span>`
  ).join('');
}

// Se reconstruye la leyenda solo si cambia la lista de candidatos.
function buildLegend(el) {
  const sig = CANDIDATOS.join('|');
  if (el.dataset.built === sig) return;
  el.innerHTML = legendHtml();
  el.dataset.built = sig;
}

// --- Dona de distribución global (SVG puro, sin librerías) ---
function renderDoughnut(totales) {
  const svg = document.getElementById('doughnut-svg');
  const legend = document.getElementById('doughnut-legend');
  buildLegend(legend);

  const total = sumVotos(totales.votos);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const segmentos = CANDIDATOS.map((c) => ({ valor: totales.votos[c] || 0, color: colorOf(c) }));

  let offset = 0;
  let circles = '';
  segmentos.forEach((seg) => {
    const fraccion = total > 0 ? seg.valor / total : 0;
    const dash = fraccion * circumference;
    circles += `<circle cx="100" cy="100" r="${radius}" fill="none" style="stroke:${seg.color}" stroke-width="24"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 100 100)" stroke-linecap="butt" />`;
    offset += dash;
  });

  svg.innerHTML = `
    <circle cx="100" cy="100" r="${radius}" fill="none" style="stroke:var(--track)" stroke-width="24" />
    ${circles}
    <text x="100" y="100" text-anchor="middle" style="fill:var(--text)" font-family="system-ui, sans-serif" font-size="34" font-weight="750">${total}</text>
    <text x="100" y="118" text-anchor="middle" style="fill:var(--muted)" font-family="system-ui, sans-serif" font-size="12">votos marcados</text>
  `;
}

// --- Barras por grado (HTML/CSS puro, sin librerías) ---
function renderBarChart(grados) {
  const legend = document.getElementById('bar-legend');
  legend.className = 'chart-legend horizontal';
  buildLegend(legend);

  const container = document.getElementById('bar-chart-container');
  container.innerHTML = grados
    .map((g) => {
      const total = sumVotos(g.votos);
      const base = total || 1;
      const seg = (valor, color, texto) => {
        const w = (valor / base) * 100;
        return `<div class="grado-bar-seg" style="width:${w}%;background:${color};color:${texto}">${valor > 0 && w > 8 ? valor : ''}</div>`;
      };
      return `
        <div class="grado-bar-row">
          <div class="grado-bar-toprow">
            <span class="grado-bar-label">${esc(g.hoja)}</span>
            <span class="grado-bar-total">${g.confirmados}/${g.padron} conf. · ${g.pendientes} pend. · ${g.discrepancias} disc. · ${Math.round(g.turnout * 100)}%</span>
          </div>
          <div class="grado-bar-track">
            ${CANDIDATOS.map((c) => seg(g.votos[c] || 0, colorOf(c), textOf(c))).join('')}
          </div>
        </div>`;
    })
    .join('');
}

// --- Alertas (discrepancias) ---
function renderAlerts(grados) {
  const list = document.getElementById('alert-list');
  const totalAlertas = grados.reduce((sum, g) => sum + g.discrepancias, 0);
  const badge = document.getElementById('alert-count');
  badge.textContent = totalAlertas;
  badge.classList.toggle('has-alerts', totalAlertas > 0);

  if (totalAlertas === 0) {
    list.innerHTML = '<div class="empty-msg">Sin discrepancias registradas.</div>';
    return;
  }

  list.innerHTML = grados
    .filter((g) => g.discrepancias > 0)
    .map((g) => `<div class="alert-item"><span class="alert-tag">REVISAR</span>${esc(g.hoja)}: ${g.discrepancias} discrepancia(s) pendiente(s) de revisión.</div>`)
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
      // Sin candidato válido se marca con texto, no solo con color.
      const hora = new Date(a.fecha).toLocaleTimeString('es-MX', { hour12: false });
      const flash = !isFirstRender && i === 0 && newestKey !== lastActivityKey ? 'new-flash' : '';
      return `<div class="activity-item ${flash}"><span class="activity-time">${hora}</span> <strong>${esc(a.nombre)}</strong> — ${esc(a.hoja)} Sec.${esc(a.seccion)} → ${a.candidato ? `<span class="activity-voto" style="--swatch:${colorOf(a.candidato)}">${esc(a.candidato)}</span>` : `<span class="activity-voto activity-sin-candidato">${esc(a.voto || '—')} (sin candidato)</span>`} <span class="activity-op">(op. ${esc(a.operador) || '—'})</span></div>`;
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
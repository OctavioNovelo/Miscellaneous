/* ============================================================
   CVV — NERV TERMINAL INTERFACE
   Edita las secciones marcadas "EDITA AQUÍ" para personalizar.
   ============================================================ */

/* ---------- 1. SECUENCIA DE ARRANQUE ---------- */

// EDITA AQUÍ: cambia estas líneas si quieres otro texto de arranque.
const BOOT_LINES = [
  { text: "INICIANDO TERMINAL MAGI...", type: "normal" },
  { text: "CARGANDO NÚCLEO CASPER · MELCHIOR · BALTHASAR", type: "normal" },
  { text: "VERIFICANDO INTEGRIDAD DE ARCHIVO...", type: "normal" },
  { text: "[OK] ARCHIVO DE PERSONAL LOCALIZADO", type: "ok" },
  { text: "[OK] CONEXIÓN A REPOSITORIO EXTERNO ESTABLECIDA", type: "ok" },
  { text: "DESCOMPRIMIENDO EXPEDIENTE: OCTAVIO NOVELO", type: "normal" },
  { text: "ADVERTENCIA: ALGUNOS CAMPOS REQUIEREN ENTRADA MANUAL", type: "warn" },
  { text: "ACCESO CONCEDIDO — NIVEL 1", type: "ok" },
];

const bootLogEl = document.getElementById("boot-log");
const bootScreenEl = document.getElementById("boot-screen");
const bootSkipEl = document.getElementById("boot-skip");
const appEl = document.getElementById("app");

let bootFinished = false;

function finishBoot() {
  if (bootFinished) return;
  bootFinished = true;
  bootScreenEl.classList.add("hidden");
  appEl.classList.remove("hidden");
  startClock();
  animateSync();
  typeRole();
}

async function runBoot() {
  for (const line of BOOT_LINES) {
    await typeLine(line.text, line.type);
    await wait(120);
  }
  await wait(400);
  finishBoot();
}

function typeLine(text, kind) {
  return new Promise((resolve) => {
    const row = document.createElement("div");
    if (kind === "ok") row.classList.add("line-ok");
    if (kind === "warn") row.classList.add("line-warn");
    bootLogEl.appendChild(row);

    let i = 0;
    const speed = 14;
    const timer = setInterval(() => {
      row.textContent = text.slice(0, i) + (i < text.length ? "▌" : "");
      i++;
      if (i > text.length) {
        clearInterval(timer);
        row.textContent = text;
        resolve();
      }
    }, speed);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

bootSkipEl.addEventListener("click", finishBoot);
// permite omitir con cualquier tecla o clic
window.addEventListener("keydown", finishBoot, { once: true });

runBoot();

/* ---------- 2. RELOJ EN VIVO ---------- */

function startClock() {
  const clockEl = document.getElementById("clock");
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- 3. NAVEGACIÓN ENTRE PANELES ---------- */

const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

function activatePanel(targetId) {
  panels.forEach((p) => p.classList.toggle("active", p.id === targetId));
  navItems.forEach((n) => n.classList.toggle("active", n.dataset.target === targetId));
  const panel = document.getElementById(targetId);
  if (panel) {
    animateSkillsIn(panel);
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

navItems.forEach((btn) => {
  btn.addEventListener("click", () => activatePanel(btn.dataset.target));
});

// enlaces internos (ej. botón "ABRIR_CANAL_COMMS" en el hero)
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href").replace("#", "");
    if (document.getElementById(targetId)) {
      e.preventDefault();
      activatePanel(targetId);
    }
  });
});

/* ---------- 4. BARRA DE SYNC RATIO (decorativa) ---------- */

function animateSync() {
  // EDITA AQUÍ: cambia este valor (0-100) si quieres otro número en el indicador decorativo.
  const target = 92.6;
  const fillEl = document.getElementById("syncFill");
  const valueEl = document.getElementById("syncValue");
  requestAnimationFrame(() => {
    fillEl.style.width = target + "%";
  });
  let current = 0;
  const step = () => {
    current += (target - current) * 0.12;
    if (target - current < 0.1) current = target;
    valueEl.textContent = current.toFixed(1) + "%";
    if (current < target) requestAnimationFrame(step);
  };
  step();
}

/* ---------- 5. BARRAS DE LENGUAJES ---------- */

function animateSkillsIn(panel) {
  const rows = panel.querySelectorAll(".skill-row");
  rows.forEach((row) => {
    const level = Number(row.dataset.level || 0);
    const fill = row.querySelector(".skill-fill");
    const pct = row.querySelector(".skill-pct");
    if (!fill || fill.dataset.animated === "true") return;
    fill.dataset.animated = "true";
    requestAnimationFrame(() => {
      fill.style.width = level + "%";
    });
    let current = 0;
    const step = () => {
      current += (level - current) * 0.15;
      if (level - current < 0.5) current = level;
      pct.textContent = Math.round(current) + "%";
      if (current < level) requestAnimationFrame(step);
    };
    step();
  });
}

// animar barras del panel activo al terminar el arranque
document.addEventListener("DOMContentLoaded", () => {
  const active = document.querySelector(".panel.active");
  if (active) animateSkillsIn(active);
});

/* ---------- 6. TIPEO DEL ROL EN LA PLACA DE IDENTIFICACIÓN ---------- */

// EDITA AQUÍ: cambia estos roles por los que te describan mejor.
const ROLES = ["INGENIERO DE SOFTWARE", "PROGRAMADOR COMPETITIVO", "APRENDIZ RAPIDO"];

function typeRole() {
  const el = document.getElementById("typedRole");
  if (!el) return;
  let roleIndex = 0;

  function typeOne(text, cb) {
    let i = 0;
    el.textContent = "";
    const timer = setInterval(() => {
      el.textContent = text.slice(0, i);
      i++;
      if (i > text.length) {
        clearInterval(timer);
        setTimeout(cb, 1400);
      }
    }, 45);
  }

  function eraseOne(cb) {
    let text = el.textContent;
    const timer = setInterval(() => {
      text = text.slice(0, -1);
      el.textContent = text;
      if (text.length === 0) {
        clearInterval(timer);
        cb();
      }
    }, 22);
  }

  function cycle() {
    typeOne(ROLES[roleIndex], () => {
      eraseOne(() => {
        roleIndex = (roleIndex + 1) % ROLES.length;
        cycle();
      });
    });
  }

  cycle();
}
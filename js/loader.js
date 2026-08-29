import { getLocale, txt } from './i18n.js';
import { UI } from './ui-strings.js';

const HELIX_MS = 1100;
const FINISH_MS = 320;
const HOLD_MS = 140;
const EXIT_MS = 720;
const MAX_MS = 1800;
const CRAWL_CAP = 0.86;

const VB_W = 1200;
const VB_H = 260;
const PAD_X = 88;
const CY = 130;
const AMP = 78;
const TURNS = 2.35;
const GROOVE_SHIFT = 14;
const PHASE_WORK = 0;
const PHASE_EDU = Math.PI;
const SPIN = Math.PI / 2;
const STRAND_STEPS = 110;
const PAIR_COUNT = 24;

const VIDEO_RE = /\.(mp4|webm|mov)(\?|$)/i;

let startedAt = performance.now();
let hidden = false;
let ready = false;
let readyAt = 0;
let timeoutId = 0;
let rafId = 0;
let locale = 'zh';
let holdFrom = 0;
let holdLoader = false;
let lastProgress = 0;
/** @type {number|null} */
let freezeProgress = null;
/** @type {ReturnType<typeof mountHelix>|null} */
let helix = null;

export function initPageLoader() {
  startedAt = performance.now();
  ready = false;
  readyAt = 0;
  hidden = false;
  holdFrom = 0;
  lastProgress = 0;
  const params = new URLSearchParams(location.search);
  holdLoader = params.has('hold-loader');
  const freezeRaw = params.get('loader-progress');
  freezeProgress = freezeRaw == null ? null : clamp(Number(freezeRaw), 0, 1);
  if (freezeProgress != null && Number.isNaN(freezeProgress)) freezeProgress = null;
  locale = getLocale();
  document.documentElement.classList.add('is-loading');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.getElementById('page-loader');
  if (el) {
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-valuenow', '0');
  }

  if (reduceMotion) {
    dismiss(true);
    return;
  }

  helix = mountHelix(document.getElementById('page-loader-helix'));
  applyLoaderCopy(locale);

  if (freezeProgress != null) {
    paintProgress(freezeProgress);
    return;
  }

  timeoutId = window.setTimeout(() => markAppReady(), MAX_MS);
  rafId = window.requestAnimationFrame(tick);
}

/** @param {import('./i18n.js').Locale} nextLocale */
export function updateLoaderCopy(nextLocale) {
  locale = nextLocale;
  applyLoaderCopy(locale);
  if (helix) paintProgress(freezeProgress ?? lastProgress);
}

export function markAppReady() {
  if (hidden) return;
  if (!ready) {
    ready = true;
    readyAt = performance.now();
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) dismiss(true);
}

/** @param {boolean} immediate */
function dismiss(immediate) {
  const el = document.getElementById('page-loader');
  if (!el || hidden) return;

  hidden = true;
  if (timeoutId) window.clearTimeout(timeoutId);
  if (rafId) window.cancelAnimationFrame(rafId);
  document.documentElement.classList.remove('is-loading');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (immediate || reduceMotion) {
    document.documentElement.dataset.loader = 'skip';
    el.classList.add('page-loader--gone');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-busy', 'false');
    return;
  }

  document.documentElement.dataset.loader = 'skip';
  el.classList.add('page-loader--exit');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-busy', 'false');
  window.setTimeout(() => el.classList.add('page-loader--gone'), EXIT_MS);
}

function tick(now) {
  if (hidden) return;
  const progress = computeProgress(now);
  paintProgress(progress);

  if (!holdLoader && ready && progress >= 0.995) {
    if (!holdFrom) holdFrom = now;
    if (now - holdFrom >= HOLD_MS) {
      dismiss(false);
      return;
    }
  }

  rafId = window.requestAnimationFrame(tick);
}

/** @param {number} now */
function computeProgress(now) {
  const elapsed = now - startedAt;
  const timed = easeInOutCubic(clamp(elapsed / HELIX_MS, 0, 1));

  if (!ready) return Math.min(CRAWL_CAP, timed);

  const readyDelay = readyAt - startedAt;
  if (readyDelay < HELIX_MS) return timed;

  const finishT = clamp((now - readyAt) / FINISH_MS, 0, 1);
  return CRAWL_CAP + (1 - CRAWL_CAP) * easeOutCubic(finishT);
}

/** @param {number} progress */
function paintProgress(progress) {
  lastProgress = progress;
  const el = document.getElementById('page-loader');
  const pct = Math.round(progress * 100);
  const pctLabel = String(pct).padStart(2, '0');

  if (el) {
    el.style.setProperty('--loader-progress', String(progress));
    el.setAttribute('aria-valuenow', String(pct));
    el.classList.toggle('is-paired', progress >= 0.58);
    el.classList.toggle('is-complete', progress >= 0.995);
  }

  const status = document.getElementById('page-loader-status');
  const pctEl = document.getElementById('page-loader-pct');
  if (pctEl) pctEl.textContent = pct >= 100 ? '100' : pctLabel;
  if (status) {
    status.textContent = progress >= 0.995
      ? txt(UI.loaderReady, locale)
      : txt(UI.loaderPairing, locale);
  }

  helix?.setProgress(progress);
}

/** @param {import('./i18n.js').Locale} nextLocale */
function applyLoaderCopy(nextLocale) {
  const work = document.getElementById('page-loader-work');
  const formation = document.getElementById('page-loader-formation');
  const hello = document.getElementById('page-loader-hello');
  const loop = document.getElementById('page-loader-loop');
  const helixMount = document.getElementById('page-loader-helix');

  if (work) work.textContent = txt(UI.loaderWork, nextLocale);
  if (formation) formation.textContent = txt(UI.loaderFormation, nextLocale);
  if (loop) loop.textContent = txt(UI.loaderLoop, nextLocale);
  if (hello) {
    const name = txt(UI.loaderHelloName, nextLocale);
    hello.innerHTML = highlightName(txt(UI.loaderHello, nextLocale), name);
  }
  if (helixMount) {
    helixMount.setAttribute('aria-label', txt(UI.loaderHelixAria, nextLocale));
  }
}

/** @param {string} text @param {string} name */
function highlightName(text, name) {
  if (!text || !name || !text.includes(name)) return escapeHtml(text);
  const mark = `<span class="text-gradient-blue page-loader__name">${escapeHtml(name)}</span>`;
  return text.split(name).map(escapeHtml).join(mark);
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** @param {HTMLElement|null} mount */
function mountHelix(mount) {
  if (!mount) return null;

  const workSegs = helixSegments(PHASE_WORK);
  const eduSegs = helixSegments(PHASE_EDU);
  const pairs = [];
  for (let i = 1; i < PAIR_COUNT; i++) {
    pairs.push(renderBasePair(i / PAIR_COUNT, i % 3 === 0));
  }

  const toPaths = (segs, kind) =>
    segs
      .map(
        (seg) =>
          `<path class="page-loader__strand page-loader__strand--${kind}${seg.front ? '' : ' is-back'}" d="${seg.d}" fill="none" />`
      )
      .join('');

  const work0 = helixPoint(0, PHASE_WORK);
  const work1 = helixPoint(1, PHASE_WORK);
  const edu0 = helixPoint(0, PHASE_EDU);
  const edu1 = helixPoint(1, PHASE_EDU);

  mount.innerHTML = `
    <svg class="page-loader__svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="page-loader-clip">
          <rect id="page-loader-clip-rect" x="0" y="0" width="0" height="${VB_H}"></rect>
        </clipPath>
      </defs>
      <line class="page-loader__axis" x1="${PAD_X}" y1="${CY}" x2="${VB_W - PAD_X}" y2="${CY}" />
      <g class="page-loader__ghost">
        ${toPaths(workSegs, 'work')}
        ${toPaths(eduSegs, 'edu')}
        ${pairs.join('')}
      </g>
      <g class="page-loader__live" clip-path="url(#page-loader-clip)">
        ${toPaths(workSegs, 'work')}
        ${toPaths(eduSegs, 'edu')}
        ${pairs.join('')}
      </g>
      <g class="page-loader__termini">
        <text class="page-loader__terminus" x="${(work0.x - 16).toFixed(1)}" y="${(work0.y + 4).toFixed(1)}" text-anchor="end">5′</text>
        <text class="page-loader__terminus" x="${(edu0.x - 16).toFixed(1)}" y="${(edu0.y + 4).toFixed(1)}" text-anchor="end">3′</text>
        <text class="page-loader__terminus" x="${(work1.x + 16).toFixed(1)}" y="${(work1.y + 4).toFixed(1)}" text-anchor="start">3′</text>
        <text class="page-loader__terminus" x="${(edu1.x + 16).toFixed(1)}" y="${(edu1.y + 4).toFixed(1)}" text-anchor="start">5′</text>
      </g>
      <g id="page-loader-fork" class="page-loader__fork">
        <line class="page-loader__fork-rule" x1="0" y1="${CY - AMP - 18}" x2="0" y2="${CY + AMP + 18}"></line>
        <circle class="page-loader__fork-dot page-loader__fork-dot--work" r="4.5" cx="0" cy="0"></circle>
        <circle class="page-loader__fork-dot page-loader__fork-dot--edu" r="4.5" cx="0" cy="0"></circle>
      </g>
    </svg>
  `;

  const clipRect = mount.querySelector('#page-loader-clip-rect');
  const fork = mount.querySelector('#page-loader-fork');
  const forkWork = mount.querySelector('.page-loader__fork-dot--work');
  const forkEdu = mount.querySelector('.page-loader__fork-dot--edu');

  return {
    /** @param {number} progress */
    setProgress(progress) {
      const t = clamp(progress, 0, 1);
      const x = axisX(t);
      clipRect?.setAttribute('width', String(t >= 0.995 ? VB_W : Math.max(0, x + 14)));
      const a = helixPoint(t, PHASE_WORK);
      const b = helixPoint(t, PHASE_EDU);
      fork?.setAttribute('transform', `translate(${x.toFixed(2)} 0)`);
      fork?.setAttribute('opacity', t > 0.97 ? '0' : '1');
      forkWork?.setAttribute('cx', String((a.x - x).toFixed(2)));
      forkWork?.setAttribute('cy', a.y.toFixed(2));
      forkEdu?.setAttribute('cx', String((b.x - x).toFixed(2)));
      forkEdu?.setAttribute('cy', b.y.toFixed(2));
    },
  };
}

function axisX(t) {
  return PAD_X + t * (VB_W - PAD_X * 2);
}

/** @param {number} t @param {number} phase */
function helixPoint(t, phase) {
  const groove = phase === PHASE_EDU ? GROOVE_SHIFT / 2 : -GROOVE_SHIFT / 2;
  const angle = t * TURNS * Math.PI * 2 + phase + SPIN;
  return {
    x: axisX(t) + groove,
    y: CY + AMP * Math.sin(angle),
    depth: Math.cos(angle),
  };
}

/** @param {number} phase */
function helixSegments(phase) {
  /** @type {{ front: boolean, d: string }[]} */
  const segs = [];
  let front = helixPoint(0, phase).depth >= 0;
  /** @type {{ x: number, y: number }[]} */
  let points = [];

  const flush = (nextFront) => {
    if (points.length < 2) return;
    segs.push({
      front,
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
    });
    const last = points[points.length - 1];
    points = [last];
    front = nextFront;
  };

  for (let i = 0; i <= STRAND_STEPS; i++) {
    const p = helixPoint(i / STRAND_STEPS, phase);
    const isFront = p.depth >= 0;
    if (isFront !== front && points.length) flush(isFront);
    points.push(p);
  }
  flush(front);
  return segs;
}

/** @param {{ x: number, y: number }} a @param {{ x: number, y: number }} b @param {number} u */
function lerpPt(a, b, u) {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** @param {number} t @param {boolean} triple */
function renderBasePair(t, triple) {
  const a = helixPoint(t, PHASE_WORK);
  const b = helixPoint(t, PHASE_EDU);
  const back = (a.depth + b.depth) / 2 < 0 ? ' is-back' : '';
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 10) {
    return `<line class="page-loader__pair${back}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" />`;
  }

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const bonds = triple ? 3 : 2;
  const mid = lerpPt(a, b, 0.5);
  const spread = bonds === 3 ? 3.1 : 2.6;
  const start = -((bonds - 1) / 2);
  const a0 = lerpPt(a, b, 0.12);
  const a1 = lerpPt(a, b, 0.38);
  const b0 = lerpPt(a, b, 0.62);
  const b1 = lerpPt(a, b, 0.88);

  const hBonds = [];
  for (let i = 0; i < bonds; i++) {
    const o = (start + i) * spread;
    const cx = mid.x + px * o;
    const cy = mid.y + py * o;
    const hx = ux * 5.2;
    const hy = uy * 5.2;
    hBonds.push(
      `<line class="page-loader__hbond${back}" x1="${(cx - hx).toFixed(1)}" y1="${(cy - hy).toFixed(1)}" x2="${(cx + hx).toFixed(1)}" y2="${(cy + hy).toFixed(1)}" />`
    );
  }

  return `
    <line class="page-loader__base page-loader__base--work${back}" x1="${a0.x.toFixed(1)}" y1="${a0.y.toFixed(1)}" x2="${a1.x.toFixed(1)}" y2="${a1.y.toFixed(1)}" />
    <line class="page-loader__base page-loader__base--edu${back}" x1="${b0.x.toFixed(1)}" y1="${b0.y.toFixed(1)}" x2="${b1.x.toFixed(1)}" y2="${b1.y.toFixed(1)}" />
    ${hBonds.join('')}
  `;
}

/** @param {number} value */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** @param {number} t */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/** @param {number} t */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/** @param {string[]} urls */
export function prefetchImages(urls) {
  const seen = new Set();
  for (const url of urls) {
    if (!url || VIDEO_RE.test(url) || seen.has(url)) continue;
    seen.add(url);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  }
}

/** @param {object|null} data */
export function warmupPortfolioMedia(data) {
  if (!data) return;

  const heroSoon = [];
  for (const slide of data.heroCarousel?.slides || []) {
    if (slide.blank || !slide.src || VIDEO_RE.test(slide.src)) continue;
    heroSoon.push(slide.src);
    break;
  }

  prefetchImages(heroSoon);
}

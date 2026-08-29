import { txt } from './i18n.js';
import { UI } from './ui-strings.js';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const RANGE_PADDING = 0.15;
const FOCUS_YEAR = 2024;
const LATE_SHARE = 0.64;

const VB_W = 1000;
const VB_H = 172;
const PAD_X = 76;
const CY = 86;
const AMP = 64;
const TURNS = 3.2;
const BP_PER_TURN = 10.5;
const GROOVE_SHIFT = 16;
const PHASE_WORK = 0;
const PHASE_EDU = Math.PI;
const STRAND_STEPS = 80;
const PAIR_COUNT = Math.round(TURNS * BP_PER_TURN);

/** IBM Carbon — launch (external link) */
const LAUNCH_ICON = `
  <svg focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor"
    width="12" height="12" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M26 6L6 26 8.1 28.1 26 10.2 26 22 28 22 28 6z"></path>
  </svg>`;

/** @param {string} value */
function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {string|undefined} value */
function parseDate(value) {
  if (!value || value === 'present') return null;
  const [year, month = '1'] = value.split('-');
  return { year: Number(year), month: Number(month) };
}

/** @param {{ year: number, month: number }|null} date */
function toFraction(date) {
  if (!date) return null;
  return date.year + (date.month - 1) / 12;
}

/**
 * @param {string|undefined} start
 * @param {import('./i18n.js').Locale} locale
 */
function formatPeriod(start, locale) {
  const s = parseDate(start);
  if (!s) return '';

  const months = locale === 'zh' ? MONTHS_ZH : MONTHS_EN;
  if (start?.includes('-')) {
    return locale === 'zh' ? `${s.year}年${months[s.month - 1]}` : `${months[s.month - 1]} ${s.year}`;
  }
  return String(s.year);
}

/**
 * @param {object[]} items
 * @param {import('./i18n.js').Locale} locale
 */
function buildTimelineModel(items, locale) {
  const now = new Date();
  const present = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const presentFrac = toFraction(present);

  const enriched = items.map((item) => {
    const start = parseDate(item.start);
    const end = item.end === 'present' ? present : parseDate(item.end);
    const realStart = toFraction(start);
    const realEnd = end ? toFraction(end) : presentFrac;

    return {
      ...item,
      kind: item.kind || 'work',
      org: txt(item.org, locale),
      title: txt(item.title, locale),
      period: item.period ? txt(item.period, locale) : formatPeriod(item.start, locale),
      url: item.url || '',
      icon: item.icon || '',
      realStart,
      realEnd,
    };
  });

  const rangeStart = Math.min(...enriched.map((i) => i.realStart)) - RANGE_PADDING;
  const rangeEnd = Math.max(...enriched.map((i) => i.realEnd)) + RANGE_PADDING;

  return {
    rangeStart,
    rangeEnd,
    items: enriched
      .map((item) => ({
        ...item,
        t0: toVisualT(item.realStart, rangeStart, rangeEnd),
        t1: toVisualT(item.realEnd, rangeStart, rangeEnd),
      }))
      .sort((a, b) => a.t0 - b.t0),
  };
}

/** Later time sits heavier on the helix: 0.32 at the origin → 1 at the living end. */
function timeWeight(t) {
  const x = Math.min(1, Math.max(0, t));
  const eased = x ** 1.2;
  return Number((0.32 + 0.68 * eased).toFixed(3));
}

/** Stretch years after 2024 so recent work occupies more of the helix. */
function toVisualT(real, rangeStart, rangeEnd) {
  const focus = Math.min(Math.max(FOCUS_YEAR, rangeStart + 0.05), rangeEnd - 0.05);
  if (real <= focus) {
    const span = focus - rangeStart;
    return span <= 0 ? 0 : (1 - LATE_SHARE) * ((real - rangeStart) / span);
  }
  const span = rangeEnd - focus;
  return span <= 0 ? 1 : (1 - LATE_SHARE) + LATE_SHARE * ((real - focus) / span);
}

/** B-DNA side view: right-handed, antiparallel, major/minor groove via axial offset. */
function helixPoint(t, phase, spin = 0) {
  const span = VB_W - PAD_X * 2;
  const groove = phase === PHASE_EDU ? GROOVE_SHIFT / 2 : -GROOVE_SHIFT / 2;
  const angle = t * TURNS * Math.PI * 2 + phase + spin;
  return {
    x: PAD_X + t * span + groove,
    y: CY + AMP * Math.sin(angle),
    depth: Math.cos(angle),
    angle,
  };
}

/** @param {{ x: number, y: number }} a @param {{ x: number, y: number }} b @param {number} u */
function lerpPt(a, b, u) {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** @param {object[]} items @param {number} t */
function isCoded(items, t) {
  return items.some((item) => t >= item.t0 && t <= item.t1);
}

/** @param {number} phase @param {number} [t0] @param {number} [t1] @param {number} [steps] @param {number} [spin] */
function helixPath(phase, t0 = 0, t1 = 1, steps = 96, spin = 0) {
  const parts = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps);
    const p = helixPoint(t, phase, spin);
    parts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return parts.join(' ');
}

/** @param {number} phase @param {number} [steps] @param {number} [spin] */
function helixSegments(phase, steps = 140, spin = 0) {
  /** @type {{ front: boolean, d: string }[]} */
  const segs = [];
  let front = helixPoint(0, phase, spin).depth >= 0;
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

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = helixPoint(t, phase, spin);
    const isFront = p.depth >= 0;
    if (isFront !== front && points.length) flush(isFront);
    points.push(p);
  }
  flush(front);
  return segs;
}

/**
 * One Watson–Crick pair: two bases + 2 (A–T) or 3 (G–C) hydrogen bonds.
 * Coded (experience) intervals use G–C — three bonds, a more stable duplex.
 * @param {number} t
 * @param {object[]} items
 */
function renderBasePair(t, items, spin = 0) {
  const a = helixPoint(t, PHASE_WORK, spin);
  const b = helixPoint(t, PHASE_EDU, spin);
  const depth = (a.depth + b.depth) / 2;
  const back = depth < 0 ? ' is-back' : '';
  const coded = isCoded(items, t);
  const pair = coded ? 'gc' : 'at';
  const bonds = pair === 'gc' ? 3 : 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);

  if (len < 7) {
    return `<line class="experience-timeline__pair-edge${back}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" />`;
  }

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const baseA0 = lerpPt(a, b, 0.1);
  const baseA1 = lerpPt(a, b, 0.38);
  const baseB0 = lerpPt(a, b, 0.62);
  const baseB1 = lerpPt(a, b, 0.9);
  const mid = lerpPt(a, b, 0.5);
  const bondHalf = Math.min(4.2, len * 0.08);
  const spread = bonds === 3 ? 2.6 : 2.2;
  const start = -((bonds - 1) / 2);

  const hBonds = [];
  for (let i = 0; i < bonds; i++) {
    const o = (start + i) * spread;
    const cx = mid.x + px * o;
    const cy = mid.y + py * o;
    hBonds.push(
      `<line class="experience-timeline__hbonds${back}" x1="${(cx - ux * bondHalf).toFixed(1)}" y1="${(cy - uy * bondHalf).toFixed(1)}" x2="${(cx + ux * bondHalf).toFixed(1)}" y2="${(cy + uy * bondHalf).toFixed(1)}" />`
    );
  }

  return `
    <line class="experience-timeline__base experience-timeline__base--work${back}" x1="${baseA0.x.toFixed(1)}" y1="${baseA0.y.toFixed(1)}" x2="${baseA1.x.toFixed(1)}" y2="${baseA1.y.toFixed(1)}" />
    ${hBonds.join('')}
    <line class="experience-timeline__base experience-timeline__base--education${back}" x1="${baseB0.x.toFixed(1)}" y1="${baseB0.y.toFixed(1)}" x2="${baseB1.x.toFixed(1)}" y2="${baseB1.y.toFixed(1)}" />`;
}

/** @param {{ x: number, y: number, depth: number }} p @param {string} kind */
function renderPhosphate(p, kind) {
  const back = p.depth < 0 ? ' is-back' : '';
  return `<circle class="experience-timeline__phosphate experience-timeline__phosphate--${kind}${back}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.15" />`;
}

/** @param {{ x: number, y: number }} p @param {string} label @param {'start'|'end'} side */
function renderTerminus(p, label, side) {
  const x = side === 'start' ? p.x - 16 : p.x + 16;
  const y = p.y < CY ? p.y - 8 : p.y + 12;
  const anchor = side === 'start' ? 'end' : 'start';
  return `<text class="experience-timeline__terminus" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${label}</text>`;
}

/** @param {object[]} items @param {number} rangeStart @param {number} rangeEnd */
function yearTicks(items, rangeStart, rangeEnd) {
  const minYear = Math.floor(Math.min(...items.map((i) => i.realStart)));
  const maxYear = Math.ceil(Math.max(...items.map((i) => i.realEnd)));
  const ticks = [];
  for (let year = minYear; year <= maxYear; year++) {
    ticks.push({
      year,
      t: toVisualT(year, rangeStart, rangeEnd),
    });
  }
  return ticks;
}

/** @param {object[]} entries */
function staggerLabels(entries) {
  const rows = { work: [], education: [] };
  for (const entry of entries) {
    rows[entry.kind === 'education' ? 'education' : 'work'].push(entry);
  }

  for (const row of Object.values(rows)) {
    row.sort((a, b) => a.t - b.t);
    let lastT = -1;
    let level = 0;
    for (const entry of row) {
      level = entry.t - lastT < 0.16 ? level + 1 : 0;
      entry.stagger = level;
      lastT = entry.t;
    }
  }

  return entries;
}

/**
 * @param {object} entry
 * @param {import('./i18n.js').Locale} locale
 */
function renderLabelCard(entry, locale) {
  const launchLabel =
    locale === 'zh' ? `访问${entry.org}官网（新窗口打开）` : `Visit ${entry.org} website (opens in new tab)`;
  const link = entry.url
    ? `<a class="experience-timeline__launch" href="${escapeAttr(entry.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(launchLabel)}">${LAUNCH_ICON}</a>`
    : '';
  return `
    <li class="experience-timeline__card experience-timeline__card--${entry.kind}"
        style="left:${(entry.x / VB_W) * 100}%; --stagger:${entry.stagger}; --weight:${entry.weight}"
             role="listitem">
      <p class="experience-timeline__period">${entry.period}</p>
      <p class="experience-timeline__org">
        <span class="experience-timeline__org-name">${entry.org}</span>${link}
      </p>
      <p class="experience-timeline__role">${entry.title}</p>
    </li>`;
}

/** Continuous depth fade — no front/back class swap, so rotation does not flicker. */
function depthOpacity(depth, back = 0.22, front = 1) {
  const u = Math.min(1, Math.max(0, (depth + 1) / 2));
  const s = u * u * (3 - 2 * u);
  return back + (front - back) * s;
}

function terminusPos(p, side) {
  return {
    x: side === 'start' ? p.x - 16 : p.x + 16,
    y: p.y < CY ? p.y - 8 : p.y + 12,
  };
}

/** @param {{ x: number, y: number }} a @param {{ x: number, y: number }} b @param {boolean} coded */
function pairCoords(a, b, coded) {
  const bonds = coded ? 3 : 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const mid = lerpPt(a, b, 0.5);
  const bondHalf = Math.min(4.2, len * 0.08);
  const spread = bonds === 3 ? 2.6 : 2.2;
  const start = -((bonds - 1) / 2);
  const h = [0, 1, 2].map((i) => {
    const on = i < bonds ? 1 : 0;
    const o = (start + Math.min(i, bonds - 1)) * spread;
    const cx = mid.x + px * o;
    const cy = mid.y + py * o;
    return {
      x1: cx - ux * bondHalf,
      y1: cy - uy * bondHalf,
      x2: cx + ux * bondHalf,
      y2: cy + uy * bondHalf,
      on,
    };
  });
  return {
    aw: lerpPt(a, b, 0.1),
    ae: lerpPt(a, b, 0.38),
    bw: lerpPt(a, b, 0.62),
    be: lerpPt(a, b, 0.9),
    h,
  };
}

function setLine(el, x1, y1, x2, y2, opacity) {
  el.setAttribute('x1', x1.toFixed(1));
  el.setAttribute('y1', y1.toFixed(1));
  el.setAttribute('x2', x2.toFixed(1));
  el.setAttribute('y2', y2.toFixed(1));
  if (opacity != null) el.setAttribute('opacity', opacity.toFixed(3));
}

/**
 * Fixed-topology helix so playback only mutates attributes.
 * @param {object[]} items
 * @param {number} [spin]
 */
function renderHelixScene(items, spin = 0) {
  const workLines = [];
  const eduLines = [];
  for (let i = 0; i < STRAND_STEPS; i++) {
    const a = helixPoint(i / STRAND_STEPS, PHASE_WORK, spin);
    const b = helixPoint((i + 1) / STRAND_STEPS, PHASE_WORK, spin);
    const c = helixPoint(i / STRAND_STEPS, PHASE_EDU, spin);
    const d = helixPoint((i + 1) / STRAND_STEPS, PHASE_EDU, spin);
    workLines.push(
      `<line class="experience-timeline__strand experience-timeline__strand--work" data-strand="work" data-i="${i}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" opacity="${depthOpacity((a.depth + b.depth) / 2).toFixed(3)}" />`
    );
    eduLines.push(
      `<line class="experience-timeline__strand experience-timeline__strand--education" data-strand="edu" data-i="${i}" x1="${c.x.toFixed(1)}" y1="${c.y.toFixed(1)}" x2="${d.x.toFixed(1)}" y2="${d.y.toFixed(1)}" opacity="${depthOpacity((c.depth + d.depth) / 2).toFixed(3)}" />`
    );
  }

  const pairs = [];
  const phosphates = [];
  for (let i = 1; i < PAIR_COUNT; i++) {
    const t = i / PAIR_COUNT;
    const a = helixPoint(t, PHASE_WORK, spin);
    const b = helixPoint(t, PHASE_EDU, spin);
    const geo = pairCoords(a, b, isCoded(items, t));
    const op = depthOpacity((a.depth + b.depth) / 2, 0.24, 1).toFixed(3);
    pairs.push(`
      <g data-pair="${i}" opacity="${op}">
        <line class="experience-timeline__base experience-timeline__base--work" data-part="base-w" x1="${geo.aw.x.toFixed(1)}" y1="${geo.aw.y.toFixed(1)}" x2="${geo.ae.x.toFixed(1)}" y2="${geo.ae.y.toFixed(1)}" />
        <line class="experience-timeline__hbonds" data-part="h0" x1="${geo.h[0].x1.toFixed(1)}" y1="${geo.h[0].y1.toFixed(1)}" x2="${geo.h[0].x2.toFixed(1)}" y2="${geo.h[0].y2.toFixed(1)}" opacity="${geo.h[0].on}" />
        <line class="experience-timeline__hbonds" data-part="h1" x1="${geo.h[1].x1.toFixed(1)}" y1="${geo.h[1].y1.toFixed(1)}" x2="${geo.h[1].x2.toFixed(1)}" y2="${geo.h[1].y2.toFixed(1)}" opacity="${geo.h[1].on}" />
        <line class="experience-timeline__hbonds" data-part="h2" x1="${geo.h[2].x1.toFixed(1)}" y1="${geo.h[2].y1.toFixed(1)}" x2="${geo.h[2].x2.toFixed(1)}" y2="${geo.h[2].y2.toFixed(1)}" opacity="${geo.h[2].on}" />
        <line class="experience-timeline__base experience-timeline__base--education" data-part="base-e" x1="${geo.bw.x.toFixed(1)}" y1="${geo.bw.y.toFixed(1)}" x2="${geo.be.x.toFixed(1)}" y2="${geo.be.y.toFixed(1)}" />
      </g>`);
    phosphates.push(
      `<circle class="experience-timeline__phosphate experience-timeline__phosphate--work" data-phos="w" data-i="${i}" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="2.15" opacity="${depthOpacity(a.depth, 0.22, 1).toFixed(3)}" />`,
      `<circle class="experience-timeline__phosphate experience-timeline__phosphate--education" data-phos="e" data-i="${i}" cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="2.15" opacity="${depthOpacity(b.depth, 0.22, 1).toFixed(3)}" />`
    );
  }

  const genes = items.map((item, index) => {
    const phase = item.kind === 'education' ? PHASE_EDU : PHASE_WORK;
    const weight = timeWeight((item.t0 + item.t1) / 2);
    return `<path class="experience-timeline__gene experience-timeline__gene--${item.kind}" data-gene="${index}" style="--weight:${weight}" d="${helixPath(phase, item.t0, item.t1, 28, spin)}" fill="none" />`;
  });

  const nodes = items.map((item, index) => {
    const phase = item.kind === 'education' ? PHASE_EDU : PHASE_WORK;
    const t = (item.t0 + item.t1) / 2;
    const weight = timeWeight(t);
    const p = helixPoint(t, phase, spin);
    const edgeY = item.kind === 'education' ? VB_H : 0;
    const radius = (4.1 + 2.3 * weight).toFixed(1);
    return `
      <g class="experience-timeline__locus" data-locus="${index}" style="--weight:${weight}" opacity="${depthOpacity(p.depth, 0.4, 1).toFixed(3)}">
        <line class="experience-timeline__lead experience-timeline__lead--${item.kind}" data-part="lead" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${edgeY}" />
        <circle class="experience-timeline__node experience-timeline__node--${item.kind}" data-part="node" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${radius}" />
      </g>`;
  });

  const ends = [
    { p: helixPoint(0, PHASE_WORK, spin), label: '5′', side: 'start' },
    { p: helixPoint(1, PHASE_WORK, spin), label: '3′', side: 'end' },
    { p: helixPoint(0, PHASE_EDU, spin), label: '3′', side: 'start' },
    { p: helixPoint(1, PHASE_EDU, spin), label: '5′', side: 'end' },
  ];
  const termini = ends
    .map((end, index) => {
      const pos = terminusPos(end.p, end.side);
      const anchor = end.side === 'start' ? 'end' : 'start';
      return `<text class="experience-timeline__terminus" data-terminus="${index}" x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="${anchor}">${end.label}</text>`;
    })
    .join('');

  return `
    <line class="experience-timeline__axis-line" x1="${PAD_X}" y1="${CY}" x2="${VB_W - PAD_X}" y2="${CY}" />
    <g class="experience-timeline__strands" data-layer="work">${workLines.join('')}</g>
    <g class="experience-timeline__strands" data-layer="edu">${eduLines.join('')}</g>
    <g class="experience-timeline__genes">${genes.join('')}</g>
    <g class="experience-timeline__pairs">${pairs.join('')}</g>
    <g class="experience-timeline__phosphates">${phosphates.join('')}</g>
    <g class="experience-timeline__nodes">${nodes.join('')}</g>
    <g class="experience-timeline__termini">${termini}</g>`;
}

/** @param {object} refs @param {object[]} items @param {number} spin */
function applyHelixSpin(refs, items, spin) {
  for (let i = 0; i < STRAND_STEPS; i++) {
    const a = helixPoint(i / STRAND_STEPS, PHASE_WORK, spin);
    const b = helixPoint((i + 1) / STRAND_STEPS, PHASE_WORK, spin);
    const c = helixPoint(i / STRAND_STEPS, PHASE_EDU, spin);
    const d = helixPoint((i + 1) / STRAND_STEPS, PHASE_EDU, spin);
    setLine(refs.workLines[i], a.x, a.y, b.x, b.y, depthOpacity((a.depth + b.depth) / 2));
    setLine(refs.eduLines[i], c.x, c.y, d.x, d.y, depthOpacity((c.depth + d.depth) / 2));
  }

  for (let i = 1; i < PAIR_COUNT; i++) {
    const t = i / PAIR_COUNT;
    const a = helixPoint(t, PHASE_WORK, spin);
    const b = helixPoint(t, PHASE_EDU, spin);
    const geo = pairCoords(a, b, isCoded(items, t));
    const pair = refs.pairs[i - 1];
    pair.root.setAttribute('opacity', depthOpacity((a.depth + b.depth) / 2, 0.24, 1).toFixed(3));
    setLine(pair.baseW, geo.aw.x, geo.aw.y, geo.ae.x, geo.ae.y);
    setLine(pair.baseE, geo.bw.x, geo.bw.y, geo.be.x, geo.be.y);
    setLine(pair.h0, geo.h[0].x1, geo.h[0].y1, geo.h[0].x2, geo.h[0].y2, geo.h[0].on);
    setLine(pair.h1, geo.h[1].x1, geo.h[1].y1, geo.h[1].x2, geo.h[1].y2, geo.h[1].on);
    setLine(pair.h2, geo.h[2].x1, geo.h[2].y1, geo.h[2].x2, geo.h[2].y2, geo.h[2].on);
    const pw = refs.phosW[i - 1];
    const pe = refs.phosE[i - 1];
    pw.setAttribute('cx', a.x.toFixed(1));
    pw.setAttribute('cy', a.y.toFixed(1));
    pw.setAttribute('opacity', depthOpacity(a.depth, 0.22, 1).toFixed(3));
    pe.setAttribute('cx', b.x.toFixed(1));
    pe.setAttribute('cy', b.y.toFixed(1));
    pe.setAttribute('opacity', depthOpacity(b.depth, 0.22, 1).toFixed(3));
  }

  items.forEach((item, index) => {
    const phase = item.kind === 'education' ? PHASE_EDU : PHASE_WORK;
    refs.genes[index].setAttribute('d', helixPath(phase, item.t0, item.t1, 28, spin));
    const t = (item.t0 + item.t1) / 2;
    const p = helixPoint(t, phase, spin);
    const locus = refs.loci[index];
    locus.root.setAttribute('opacity', depthOpacity(p.depth, 0.4, 1).toFixed(3));
    locus.lead.setAttribute('x1', p.x.toFixed(1));
    locus.lead.setAttribute('y1', p.y.toFixed(1));
    locus.lead.setAttribute('x2', p.x.toFixed(1));
    locus.node.setAttribute('cx', p.x.toFixed(1));
    locus.node.setAttribute('cy', p.y.toFixed(1));
  });

  const ends = [
    { p: helixPoint(0, PHASE_WORK, spin), side: 'start' },
    { p: helixPoint(1, PHASE_WORK, spin), side: 'end' },
    { p: helixPoint(0, PHASE_EDU, spin), side: 'start' },
    { p: helixPoint(1, PHASE_EDU, spin), side: 'end' },
  ];
  ends.forEach((end, index) => {
    const pos = terminusPos(end.p, end.side);
    refs.termini[index].setAttribute('x', pos.x.toFixed(1));
    refs.termini[index].setAttribute('y', pos.y.toFixed(1));
  });
}

/** @param {SVGElement} svg */
function cacheHelixRefs(svg) {
  return {
    workLines: [...svg.querySelectorAll('[data-strand="work"]')],
    eduLines: [...svg.querySelectorAll('[data-strand="edu"]')],
    pairs: [...svg.querySelectorAll('[data-pair]')].map((root) => ({
      root,
      baseW: root.querySelector('[data-part="base-w"]'),
      baseE: root.querySelector('[data-part="base-e"]'),
      h0: root.querySelector('[data-part="h0"]'),
      h1: root.querySelector('[data-part="h1"]'),
      h2: root.querySelector('[data-part="h2"]'),
    })),
    phosW: [...svg.querySelectorAll('[data-phos="w"]')],
    phosE: [...svg.querySelectorAll('[data-phos="e"]')],
    genes: [...svg.querySelectorAll('[data-gene]')],
    loci: [...svg.querySelectorAll('[data-locus]')].map((root) => ({
      root,
      lead: root.querySelector('[data-part="lead"]'),
      node: root.querySelector('[data-part="node"]'),
    })),
    termini: [...svg.querySelectorAll('[data-terminus]')],
  };
}

const PLAY_ICON = `
  <svg class="experience-timeline__play-icon" focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M7 28a1 1 0 0 1-1-1V5a1 1 0 0 1 1.5-.87l19 11a1 1 0 0 1 0 1.74l-19 11A1 1 0 0 1 7 28z"></path>
  </svg>`;

const PAUSE_ICON = `
  <svg class="experience-timeline__play-icon" focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M10 6h4v20h-4V6zm8 0h4v20h-4V6z"></path>
  </svg>`;

const VIEW_ICON = `
  <svg class="experience-timeline__play-icon" focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M30.94 15.66A16.69 16.69 0 0 0 16 5 16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68A16.69 16.69 0 0 0 16 27a16.69 16.69 0 0 0 14.94-10.66 1 1 0 0 0 0-.68zM16 25c-5.3 0-10.9-3.93-12.94-9C5.1 10.93 10.7 7 16 7s10.9 3.93 12.94 9C26.9 21.07 21.3 25 16 25z"></path>
    <circle cx="16" cy="16" r="4"></circle>
  </svg>`;

const VIEW_OFF_ICON = `
  <svg class="experience-timeline__play-icon" focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M5.24 22.31l1.43-1.42A14.06 14.06 0 0 1 3.06 16C5.1 10.93 10.7 7 16 7a12.2 12.2 0 0 1 4 .7l1.57-1.57A14.7 14.7 0 0 0 16 5 16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68 16 16 0 0 0 4.18 5.97z"></path>
    <path d="M16 10a6 6 0 0 0-6 6 6.07 6.07 0 0 0 .37 2.08l1.56-1.56A4 4 0 0 1 16 12a3.91 3.91 0 0 1 1.48.3l1.57-1.57A6 6 0 0 0 16 10z"></path>
    <path d="M30.94 15.66A16.69 16.69 0 0 0 16 5a14.7 14.7 0 0 0-2.58.24l1.7 1.7A12.2 12.2 0 0 1 16 7c5.3 0 10.9 3.93 12.94 9a14.06 14.06 0 0 1-2.61 3.89l1.43 1.42a16 16 0 0 0 4.18-5.97 1 1 0 0 0 0-.68z"></path>
    <path d="M16 22a6 6 0 0 0 6-6 6.07 6.07 0 0 0-.37-2.08l-1.56 1.56A4 4 0 0 1 16 20a3.91 3.91 0 0 1-1.48-.3l-1.57 1.57A6 6 0 0 0 16 22z"></path>
    <path d="M2 26.48L26.48 2l1.42 1.41L3.42 27.9z"></path>
  </svg>`;

const SPIN_PERIOD_MS = 16000;

/** @type {{ svg: SVGElement, figure: HTMLElement, button: HTMLButtonElement, items: object[], locale: import('./i18n.js').Locale, playing: boolean, spin: number, raf: number, lastTs: number, visible: boolean, observer: IntersectionObserver|null, onClick: (() => void)|null, onVis: (() => void)|null }|null} */
let helixPlayback = null;

/**
 * @param {object} timeline
 * @param {import('./i18n.js').Locale} locale
 * @returns {string}
 */
export function renderExperienceTimeline(timeline, locale) {
  if (!timeline?.items?.length) return '';

  const { rangeStart, rangeEnd, items } = buildTimelineModel(timeline.items, locale);
  const workLabel = txt(UI.sidebarWork, locale);
  const eduLabel = txt(UI.sidebarEducation, locale);
  const ticks = yearTicks(items, rangeStart, rangeEnd);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const labelEntries = staggerLabels(
    items.map((item) => {
      const phase = item.kind === 'education' ? PHASE_EDU : PHASE_WORK;
      const t = (item.t0 + item.t1) / 2;
      const p = helixPoint(t, phase);
      return {
        ...item,
        t,
        x: p.x,
        weight: timeWeight(t),
        stagger: 0,
      };
    })
  );

  const workEntries = labelEntries.filter((entry) => entry.kind !== 'education');
  const eduEntries = labelEntries.filter((entry) => entry.kind === 'education');
  const workCards = workEntries.map((entry) => renderLabelCard(entry, locale)).join('');
  const eduCards = eduEntries.map((entry) => renderLabelCard(entry, locale)).join('');
  const workStaggerMax = Math.max(0, ...workEntries.map((entry) => entry.stagger));
  const eduStaggerMax = Math.max(0, ...eduEntries.map((entry) => entry.stagger));

  const years = ticks
    .map((tick) => {
      const x = PAD_X + tick.t * (VB_W - PAD_X * 2);
      return `<span class="experience-timeline__tick" style="left:${(x / VB_W) * 100}%; --weight:${timeWeight(tick.t)}">${tick.year}</span>`;
    })
    .join('');

  helixSceneItems = items;
  helixSceneLocale = locale;

  const playBtn = reduceMotion
    ? ''
    : `<button type="button" class="experience-timeline__ctrl experience-timeline__play" aria-pressed="false" aria-label="${escapeAttr(txt(UI.helixPlay, locale))}">
        ${PLAY_ICON}<span class="experience-timeline__play-label">${txt(UI.helixPlay, locale)}</span>
      </button>`;
  const labelsBtn = `<button type="button" class="experience-timeline__ctrl experience-timeline__labels" aria-pressed="true" aria-label="${escapeAttr(txt(UI.helixLabelsHide, locale))}">
        ${VIEW_ICON}<span class="experience-timeline__labels-label">${txt(UI.helixLabelsHide, locale)}</span>
      </button>`;

  return `
    <figure class="experience-timeline experience-timeline--helix">
      <div class="experience-timeline__toolbar">
        <div class="experience-timeline__legend" aria-hidden="true">
          <span class="experience-timeline__legend-item experience-timeline__legend-item--work">${workLabel}</span>
          <span class="experience-timeline__legend-item experience-timeline__legend-item--education">${eduLabel}</span>
        </div>
        <div class="experience-timeline__actions">
          ${labelsBtn}
          ${playBtn}
        </div>
      </div>
      <ol class="experience-timeline__rail experience-timeline__rail--work" style="--stagger-max:${workStaggerMax}" role="list">${workCards}</ol>
      <div class="experience-timeline__stage">
        <svg class="experience-timeline__svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img"
             aria-label="${escapeAttr(txt(UI.helixAria, locale))}">
          ${renderHelixScene(items, 0)}
        </svg>
      </div>
      <ol class="experience-timeline__rail experience-timeline__rail--education" style="--stagger-max:${eduStaggerMax}" role="list">${eduCards}</ol>
      <div class="experience-timeline__axis" aria-hidden="true">${years}</div>
    </figure>`;
}

/** @type {object[]|null} */
let helixSceneItems = null;
/** @type {import('./i18n.js').Locale} */
let helixSceneLocale = 'zh';

function updatePlayButton(pb) {
  if (!pb.button) return;
  const playing = pb.playing;
  const label = txt(playing ? UI.helixPause : UI.helixPlay, pb.locale);
  pb.figure.classList.toggle('is-playing', playing);
  pb.button.setAttribute('aria-pressed', playing ? 'true' : 'false');
  pb.button.setAttribute('aria-label', label);
  pb.button.innerHTML = `${playing ? PAUSE_ICON : PLAY_ICON}<span class="experience-timeline__play-label">${label}</span>`;
}

function updateLabelsButton(pb) {
  if (!pb.labelsBtn) return;
  const shown = pb.labelsShown;
  const label = txt(shown ? UI.helixLabelsHide : UI.helixLabelsShow, pb.locale);
  pb.figure.classList.toggle('is-labels-hidden', !shown);
  pb.labelsBtn.setAttribute('aria-pressed', shown ? 'true' : 'false');
  pb.labelsBtn.setAttribute('aria-label', label);
  pb.labelsBtn.innerHTML = `${shown ? VIEW_ICON : VIEW_OFF_ICON}<span class="experience-timeline__labels-label">${label}</span>`;
}

function tickHelix(ts) {
  const pb = helixPlayback;
  if (!pb?.playing) return;
  if (!pb.lastTs) pb.lastTs = ts;
  const dt = Math.min(64, ts - pb.lastTs);
  pb.lastTs = ts;
  if (!document.hidden && pb.visible) {
    pb.spin = (pb.spin + (dt / SPIN_PERIOD_MS) * Math.PI * 2) % (Math.PI * 2);
    applyHelixSpin(pb.refs, pb.items, pb.spin);
  }
  pb.raf = requestAnimationFrame(tickHelix);
}

export function destroyExperienceHelix() {
  const pb = helixPlayback;
  if (!pb) return;
  if (pb.raf) cancelAnimationFrame(pb.raf);
  pb.observer?.disconnect();
  if (pb.onClick && pb.button) pb.button.removeEventListener('click', pb.onClick);
  if (pb.onLabels && pb.labelsBtn) pb.labelsBtn.removeEventListener('click', pb.onLabels);
  helixPlayback = null;
}

/** @param {HTMLElement} mount */
export function initExperienceHelix(mount) {
  destroyExperienceHelix();
  const figure = mount.querySelector('.experience-timeline--helix');
  const svg = mount.querySelector('.experience-timeline__svg');
  const button = mount.querySelector('.experience-timeline__play');
  const labelsBtn = mount.querySelector('.experience-timeline__labels');
  if (!figure || !svg || !helixSceneItems) return;

  const pb = {
    svg,
    figure,
    button,
    labelsBtn,
    items: helixSceneItems,
    locale: helixSceneLocale,
    refs: cacheHelixRefs(svg),
    playing: false,
    labelsShown: true,
    spin: 0,
    raf: 0,
    lastTs: 0,
    visible: true,
    observer: null,
    onClick: null,
    onLabels: null,
  };

  pb.onClick = () => {
    if (!pb.button) return;
    if (pb.playing) {
      pb.playing = false;
      if (pb.raf) cancelAnimationFrame(pb.raf);
      pb.raf = 0;
      updatePlayButton(pb);
      return;
    }
    pb.playing = true;
    pb.lastTs = 0;
    updatePlayButton(pb);
    pb.raf = requestAnimationFrame(tickHelix);
  };

  pb.onLabels = () => {
    pb.labelsShown = !pb.labelsShown;
    updateLabelsButton(pb);
  };

  button?.addEventListener('click', pb.onClick);
  labelsBtn?.addEventListener('click', pb.onLabels);
  pb.observer = new IntersectionObserver(
    (entries) => {
      pb.visible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.12 }
  );
  pb.observer.observe(figure);
  helixPlayback = pb;
}

import { sidebarLabel, txt } from './i18n.js';
import { UI } from './ui-strings.js';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const AXIS_MIN_GAP = 13;
const COMPACT_HEIGHT = 18;
const COMPACT_THRESHOLD = 7;
const GAP_COMPRESS_THRESHOLD = 0.75;
const GAP_COMPRESS_TO = 0.28;
const RANGE_PADDING = 0.15;

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
 * @param {string|undefined} end
 * @param {import('./i18n.js').Locale} locale
 */
function formatPeriod(start, end, locale) {
  const s = parseDate(start);
  const e = end === 'present' ? null : parseDate(end);
  if (!s) return '';

  const months = locale === 'zh' ? MONTHS_ZH : MONTHS_EN;
  const present = txt(UI.sidebarPresent, locale);
  const startHasMonth = start?.includes('-');
  const endHasMonth = end && end !== 'present' && end.includes('-');

  const fmt = (d, withMonth) => {
    if (!d) return present;
    if (withMonth) {
      return locale === 'zh' ? `${d.year}年${months[d.month - 1]}` : `${months[d.month - 1]} ${d.year}`;
    }
    return String(d.year);
  };

  const startLabel = fmt(s, Boolean(startHasMonth));
  const endLabel = end === 'present' ? present : fmt(e, Boolean(endHasMonth));
  const sep = locale === 'zh' ? ' — ' : ' — ';

  if (startLabel === endLabel) return startLabel;
  return `${startLabel}${sep}${endLabel}`;
}

/** @param {object[]} items */
function buildVisualMapper(items) {
  const bounds = [...new Set(items.flatMap((item) => [item.realStart, item.realEnd]))].sort(
    (a, b) => a - b
  );

  let visual = 0;
  /** @type {{ real: number, visual: number }[]} */
  const points = [{ real: bounds[0], visual: 0 }];

  for (let i = 1; i < bounds.length; i++) {
    const gap = bounds[i] - bounds[i - 1];
    visual += gap > GAP_COMPRESS_THRESHOLD ? GAP_COMPRESS_TO : gap;
    points.push({ real: bounds[i], visual });
  }

  /** @param {number} real */
  const toVisual = (real) => {
    if (real <= points[0].real) return points[0].visual;
    for (let i = 1; i < points.length; i++) {
      if (real <= points[i].real) {
        const prev = points[i - 1];
        const next = points[i];
        const ratio = (real - prev.real) / (next.real - prev.real);
        return prev.visual + ratio * (next.visual - prev.visual);
      }
    }
    return points[points.length - 1].visual;
  };

  return toVisual;
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
      org: txt(item.org, locale),
      title: txt(item.title, locale),
      period: item.period ? txt(item.period, locale) : formatPeriod(item.start, item.end, locale),
      url: item.url || '',
      icon: item.icon || '',
      realStart,
      realEnd,
    };
  });

  const mapRealToVisual = buildVisualMapper(enriched);
  const compressed = enriched.map((item) => ({
    ...item,
    startFrac: mapRealToVisual(item.realStart),
    endFrac: mapRealToVisual(item.realEnd),
  }));

  const rangeStart = Math.min(...compressed.map((i) => i.startFrac));
  const rangeEnd = Math.max(...compressed.map((i) => i.endFrac));

  return {
    rangeStart: rangeStart - RANGE_PADDING,
    rangeEnd: rangeEnd + RANGE_PADDING,
    mapRealToVisual,
    items: compressed.sort((a, b) => b.startFrac - a.startFrac),
  };
}

/**
 * @param {number} value @param {number} rangeStart @param {number} rangeEnd
 */
function toVerticalTop(value, rangeStart, rangeEnd) {
  const span = rangeEnd - rangeStart;
  if (span <= 0) return 0;
  return ((rangeEnd - value) / span) * 100;
}

/** @param {object} a @param {object} b */
function overlaps(a, b) {
  return a.startFrac < b.endFrac && b.startFrac < a.endFrac;
}

/**
 * @param {object[]} items
 * @returns {object[]}
 */
function layoutSwimlane(items) {
  const sorted = [...items].sort((a, b) => a.startFrac - b.startFrac);
  /** @type {object[][]} */
  const columns = [];

  for (const item of sorted) {
    let column = columns.findIndex((col) => !col.some((other) => overlaps(item, other)));
    if (column === -1) {
      columns.push([item]);
      column = columns.length - 1;
    } else {
      columns[column].push(item);
    }
    item.column = column;
  }

  const colCount = Math.max(columns.length, 1);
  const gap = colCount > 1 ? 2 : 0;
  const width = (100 - gap * (colCount - 1)) / colCount;

  return sorted.map((item) => ({
    ...item,
    colCount,
    blockWidth: width,
    blockLeft: item.column * (width + gap),
  }));
}

/** @param {object[]} items */
function collectMilestoneYears(items) {
  const presentYear = new Date().getFullYear();
  const years = new Set([presentYear]);

  for (const item of items) {
    years.add(Math.floor(item.realStart));
    years.add(item.end === 'present' ? presentYear : Math.floor(item.realEnd));
  }

  return [...years].sort((a, b) => b - a);
}

/**
 * @param {number[]} years @param {number} rangeStart @param {number} rangeEnd
 * @param {(real: number) => number} mapRealToVisual
 */
function thinAxisYears(years, rangeStart, rangeEnd, mapRealToVisual) {
  const kept = [];

  for (const year of years) {
    const top = toVerticalTop(mapRealToVisual(year), rangeStart, rangeEnd);
    const tooClose = kept.some((entry) => Math.abs(entry.top - top) < AXIS_MIN_GAP);
    if (!tooClose) kept.push({ year, top });
  }

  return kept;
}

/** @param {number} year */
function formatAxisYear(year) {
  return String(year);
}

/**
 * @param {number} rangeStart @param {number} rangeEnd @param {object[]} items
 * @param {(real: number) => number} mapRealToVisual
 */
function buildAxisTicks(rangeStart, rangeEnd, items, mapRealToVisual) {
  const presentYear = new Date().getFullYear();
  const minYear = Math.min(...items.map((item) => Math.floor(item.realStart)));
  const maxYear = Math.max(
    ...items.map((item) => (item.end === 'present' ? presentYear : Math.ceil(item.realEnd)))
  );
  const milestones = collectMilestoneYears(items).filter(
    (year) => year >= minYear && year <= maxYear
  );

  let ticks = thinAxisYears(milestones, rangeStart, rangeEnd, mapRealToVisual);

  if (ticks.length < 3) {
    const step = maxYear - minYear > 8 ? 3 : 2;
    const filled = new Set(ticks.map((t) => t.year));
    for (let year = maxYear; year >= minYear; year -= step) filled.add(year);
    ticks = thinAxisYears([...filled].sort((a, b) => b - a), rangeStart, rangeEnd, mapRealToVisual);
  }

  return ticks.map((tick) => ({
    year: tick.year,
    top: tick.top,
    label: formatAxisYear(tick.year),
  }));
}

/**
 * @param {object[]} items
 * @param {number} rangeStart
 * @param {number} rangeEnd
 */
function buildTimelineMarkers(items, rangeStart, rangeEnd) {
  return items
    .filter((item) => item.icon)
    .map((item) => ({
      icon: item.icon,
      top: toVerticalTop((item.startFrac + item.endFrac) / 2, rangeStart, rangeEnd),
      label: `${item.org} · ${item.title}`,
    }));
}

/**
 * @param {object} entry
 * @param {number} rangeStart
 * @param {number} rangeEnd
 */
function getBlockLayout(entry, rangeStart, rangeEnd) {
  const topStart = toVerticalTop(entry.startFrac, rangeStart, rangeEnd);
  const topEnd = toVerticalTop(entry.endFrac, rangeStart, rangeEnd);
  const rawHeight = topStart - topEnd;

  if (rawHeight < COMPACT_THRESHOLD) {
    const mid = toVerticalTop((entry.startFrac + entry.endFrac) / 2, rangeStart, rangeEnd);
    return { top: mid - COMPACT_HEIGHT / 2, height: COMPACT_HEIGHT, compact: true };
  }

  return { top: topEnd, height: rawHeight, compact: false };
}

/**
 * @param {object} entry
 * @param {number} rangeStart
 * @param {number} rangeEnd
 * @param {import('./i18n.js').Locale} locale
 */
function renderTimelineBlock(entry, rangeStart, rangeEnd, locale) {
  const kind = entry.kind || 'work';
  const { top, height, compact } = getBlockLayout(entry, rangeStart, rangeEnd);

  const launchLabel =
    locale === 'zh' ? `访问${entry.org}官网（新窗口打开）` : `Visit ${entry.org} website (opens in new tab)`;
  const link = entry.url
    ? `<a class="sidebar-timeline__launch" href="${escapeAttr(entry.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(launchLabel)}">${LAUNCH_ICON}</a>`
    : '';

  const tooltip = [entry.period, entry.org, entry.title].filter(Boolean).join(' · ');

  return `
    <article class="sidebar-timeline__block sidebar-timeline__block--${kind}${compact ? ' sidebar-timeline__block--compact' : ''}"
             style="top:${top.toFixed(2)}%;height:${height.toFixed(2)}%;left:${entry.blockLeft.toFixed(2)}%;width:${entry.blockWidth.toFixed(2)}%"
             title="${escapeAttr(tooltip)}"
             role="listitem">
      <div class="sidebar-timeline__block-inner">
        ${entry.period ? `<p class="sidebar-timeline__period">${entry.period}</p>` : ''}
        ${entry.org ? `<p class="sidebar-timeline__org"><span class="sidebar-timeline__org-name">${entry.org}</span>${link}</p>` : ''}
        ${entry.title ? `<p class="sidebar-timeline__role">${entry.title}</p>` : ''}
      </div>
    </article>`;
}

/**
 * @param {'work'|'education'} kind
 * @param {object[]} items
 * @param {number} rangeStart
 * @param {number} rangeEnd
 * @param {import('./i18n.js').Locale} locale
 */
function renderSwimlane(kind, items, rangeStart, rangeEnd, locale, laneLabel) {
  const laneItems = layoutSwimlane(items.filter((item) => (item.kind || 'work') === kind));
  const blocks = laneItems
    .map((entry) => renderTimelineBlock(entry, rangeStart, rangeEnd, locale))
    .join('');

  return `
    <div class="sidebar-timeline__swimlane sidebar-timeline__swimlane--${kind}" role="list">
      <span class="sidebar-timeline__swimlane-label">${laneLabel}</span>
      ${blocks}
    </div>`;
}

/**
 * @param {object} timeline
 * @param {import('./i18n.js').Locale} locale
 * @returns {string}
 */
export function renderSidebarTimelineHtml(timeline, locale) {
  if (!timeline?.items?.length) return '';

  const label = timeline.label ? txt(timeline.label, locale) : sidebarLabel('experience', locale);
  const workItems = timeline.items.filter((item) => (item.kind || 'work') === 'work');
  const model = buildTimelineModel(workItems, locale);
  const { rangeStart, rangeEnd, items, mapRealToVisual } = model;

  const axisTicks = buildAxisTicks(rangeStart, rangeEnd, items, mapRealToVisual);
  const axisLabel = txt(UI.sidebarYearAxis, locale);
  const markers = buildTimelineMarkers(items, rangeStart, rangeEnd);

  const axisHtml = [
    ...axisTicks.map(
      (tick) =>
        `<span class="sidebar-timeline__tick" style="top:${tick.top.toFixed(2)}%">${tick.label}</span>`
    ),
    ...markers.map(
      (marker) =>
        `<span class="sidebar-timeline__marker" style="top:${marker.top.toFixed(2)}%" title="${escapeAttr(marker.label)}" aria-hidden="true">${marker.icon}</span>`
    ),
  ].join('');

  const gridHtml = axisTicks
    .map((tick) => `<span class="sidebar-timeline__gridline" style="top:${tick.top.toFixed(2)}%"></span>`)
    .join('');

  const workLabel = txt(UI.sidebarWork, locale);
  const workLane = renderSwimlane('work', items, rangeStart, rangeEnd, locale, workLabel);

  return `
    <li class="page-navigation__section page-navigation__section--timeline">
      <button type="button" class="page-navigation__section-toggle" aria-expanded="true"
              aria-controls="sidebar-timeline">
        <span>${label}</span>
        <svg class="page-navigation__chevron" focusable="false" preserveAspectRatio="xMidYMid meet"
          fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 10L26 20H6z"></path>
        </svg>
      </button>
      <div class="sidebar-timeline page-navigation__sublist" id="sidebar-timeline" role="region"
           aria-label="${label}">
        <div class="sidebar-timeline__viz">
          <div class="sidebar-timeline__axis" aria-hidden="true">${axisHtml}</div>
          <div class="sidebar-timeline__canvas">
            <div class="sidebar-timeline__grid" aria-hidden="true">${gridHtml}</div>
            ${workLane}
          </div>
        </div>
        <div class="sidebar-timeline__legend" aria-hidden="true">
          <span class="sidebar-timeline__legend-year">${axisLabel}</span>
          <div class="sidebar-timeline__legend-items">
            <span class="sidebar-timeline__legend-item sidebar-timeline__legend-item--work">${workLabel}</span>
          </div>
        </div>
      </div>
    </li>`;
}

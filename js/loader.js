import { getItemPreviewSrc } from './card-preview.js';
import { txt } from './i18n.js';
import { UI } from './ui-strings.js';

const MIN_MS = 1100;
const MAX_MS = 2800;
const VIDEO_RE = /\.(mp4|webm|mov)(\?|$)/i;

let startedAt = performance.now();
let hidden = false;
let ready = false;
let timeoutId = 0;

export function initPageLoader() {
  startedAt = performance.now();
  document.documentElement.classList.add('is-loading');
  timeoutId = window.setTimeout(() => {
    ready = true;
    dismiss(false);
  }, MAX_MS);
}

/** @param {import('./i18n.js').Locale} locale */
export function updateLoaderCopy(locale) {
  const status = document.getElementById('page-loader-status');
  const kicker = document.getElementById('page-loader-kicker');
  const loop = document.getElementById('page-loader-loop');
  if (status) status.textContent = txt(UI.loading, locale);
  if (kicker) kicker.textContent = txt(UI.loaderKicker, locale);
  if (loop) loop.textContent = txt(UI.loaderLoop, locale);
}

export function markAppReady() {
  ready = true;
  dismiss(false);
}

/** @param {boolean} immediate */
function dismiss(immediate) {
  const el = document.getElementById('page-loader');
  if (!el || hidden) return;
  if (!immediate && !ready) return;

  hidden = true;
  if (timeoutId) window.clearTimeout(timeoutId);
  document.documentElement.classList.remove('is-loading');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (immediate || reduceMotion) {
    document.documentElement.dataset.loader = 'skip';
    el.classList.add('page-loader--gone');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-busy', 'false');
    return;
  }

  const wait = Math.max(0, MIN_MS - (performance.now() - startedAt));
  window.setTimeout(() => {
    document.documentElement.dataset.loader = 'skip';
    el.classList.add('page-loader--exit');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-busy', 'false');
    window.setTimeout(() => el.classList.add('page-loader--gone'), 720);
  }, wait);
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
    if (heroSoon.length >= 2) break;
  }

  const medical = (data.items || [])
    .filter((item) => item.section === 'medical')
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  const firstCovers = medical
    .slice(0, 4)
    .map((item) => getItemPreviewSrc(item, ''))
    .filter(Boolean);

  prefetchImages([...heroSoon, ...firstCovers]);

  const warmed = new Set([...heroSoon, ...firstCovers]);
  const rest = (data.items || [])
    .map((item) => getItemPreviewSrc(item, ''))
    .filter((src) => src && !warmed.has(src) && !VIDEO_RE.test(src));

  const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 600));
  idle(() => prefetchImages(rest), { timeout: 2000 });
}

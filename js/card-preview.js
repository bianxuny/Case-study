/** @param {object} item @param {string} [fallbackSrc] */
export function getItemPreviewSrc(item, fallbackSrc = '') {
  if (item.cover) return item.cover;
  if (item.images?.length) return item.images[0];
  if (item.poster) return item.poster;
  if (item.src && !/\.(mp4|webm|mov)(\?|$)/i.test(item.src)) return item.src;
  return fallbackSrc;
}

/** @param {object|undefined} heroCarousel */
export function getHeroFirstImageSrc(heroCarousel) {
  for (const slide of heroCarousel?.slides || []) {
    if (slide.blank || !slide.src) continue;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(slide.src)) {
      if (slide.poster) return slide.poster;
      continue;
    }
    return slide.src;
  }
  return '';
}

const PREVIEW_GAP = 12;
const VIEWPORT_PADDING = 8;

/** @param {HTMLElement} body */
function positionPreview(body, rail) {
  const rect = body.getBoundingClientRect();
  const railWidth = rail.offsetWidth;
  const railHeight = rail.offsetHeight;
  const headerOffset =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 48;

  let left = rect.right + PREVIEW_GAP;
  if (left + railWidth > window.innerWidth - VIEWPORT_PADDING) {
    left = rect.left - railWidth - PREVIEW_GAP;
  }
  left = Math.min(
    Math.max(left, VIEWPORT_PADDING),
    window.innerWidth - railWidth - VIEWPORT_PADDING
  );

  const minTop = headerOffset + VIEWPORT_PADDING;
  const maxTop = window.innerHeight - railHeight - VIEWPORT_PADDING;
  const top = Math.min(Math.max(rect.top, minTop), maxTop);

  rail.style.left = `${left}px`;
  rail.style.top = `${top}px`;
}

/** @param {HTMLElement} body @param {string} src @param {HTMLElement} rail @param {HTMLImageElement} img */
function showPreview(body, src, rail, img) {
  const srcChanged = rail.dataset.src !== src;
  if (srcChanged) {
    img.src = src;
    rail.dataset.src = src;
  }
  img.alt = body.closest('.content-card')?.getAttribute('aria-label') || '';
  rail.hidden = false;
  rail.classList.add('card-preview-rail--visible');
  positionPreview(body, rail);

  if (srcChanged && !img.complete) {
    img.onload = () => {
      if (!rail.hidden && rail.dataset.src === src) positionPreview(body, rail);
    };
  }
}

/** @param {HTMLElement} rail */
function hidePreview(rail) {
  rail.classList.remove('card-preview-rail--visible');
  rail.hidden = true;
  delete rail.dataset.src;
}

/** @param {HTMLElement|null} gallery */
export function initCardPreview(gallery) {
  if (!gallery) return;

  let rail = document.getElementById('card-preview-rail');
  if (!rail) {
    rail = document.createElement('aside');
    rail.id = 'card-preview-rail';
    rail.className = 'card-preview-rail';
    rail.hidden = true;
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<img class="card-preview-rail__img" alt="" decoding="async" />';
    document.body.appendChild(rail);
  }

  const img = rail.querySelector('.card-preview-rail__img');
  /** @type {HTMLElement|null} */
  let activeBody = null;

  gallery.addEventListener('mouseover', (e) => {
    if (
      document.body.classList.contains('project-panel-open') ||
      document.body.classList.contains('blog-panel-open')
    ) {
      return;
    }

    const body = e.target.closest('.content-card:not(.content-card--static) .content-card__body');
    if (!body) return;

    const card = body.closest('.content-card');
    const src = card?.dataset.previewSrc;
    if (!src) {
      if (activeBody) {
        hidePreview(rail);
        activeBody = null;
      }
      return;
    }

    activeBody = body;
    showPreview(body, src, rail, img);
  });

  gallery.addEventListener('mouseout', (e) => {
    const body = e.target.closest('.content-card:not(.content-card--static) .content-card__body');
    if (!body || body !== activeBody) return;

    const related = e.relatedTarget;
    if (related instanceof Node && body.contains(related)) return;
    if (related instanceof Element && related.closest('.content-card:not(.content-card--static) .content-card__body')) {
      return;
    }

    hidePreview(rail);
    activeBody = null;
  });

  window.addEventListener(
    'scroll',
    () => {
      if (activeBody && !rail.hidden) positionPreview(activeBody, rail);
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    if (activeBody && !rail.hidden) positionPreview(activeBody, rail);
  });
}

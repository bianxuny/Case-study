/** @param {object} item @param {string} [fallbackSrc] */
export function getItemCoverSrc(item, fallbackSrc = '') {
  if (item.cover) return item.cover;
  if (item.images?.length) return item.images[0];
  if (item.poster) return item.poster;
  if (item.src && !/\.(mp4|webm|mov)(\?|$)/i.test(item.src)) return item.src;
  return fallbackSrc;
}

/** Hover rail image; falls back to the card cover. */
export function getItemPreviewSrc(item, fallbackSrc = '') {
  if (item.hover) return item.hover;
  return getItemCoverSrc(item, fallbackSrc);
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

/** @param {HTMLElement} anchor */
function positionPreview(anchor, rail) {
  const rect = anchor.getBoundingClientRect();
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

/** @param {HTMLElement} anchor @param {string} src @param {HTMLElement} rail @param {HTMLImageElement} img */
function showPreview(anchor, src, rail, img) {
  const srcChanged = rail.dataset.src !== src;
  if (srcChanged) {
    img.src = src;
    rail.dataset.src = src;
  }
  img.alt = (anchor.closest('.content-card') || anchor).getAttribute('aria-label') || '';
  rail.hidden = false;
  rail.classList.add('card-preview-rail--visible');
  positionPreview(anchor, rail);

  if (srcChanged && !img.complete) {
    img.onload = () => {
      if (!rail.hidden && rail.dataset.src === src) positionPreview(anchor, rail);
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
  let activeCard = null;

  gallery.addEventListener('mouseover', (e) => {
    if (
      document.body.classList.contains('project-panel-open') ||
      document.body.classList.contains('blog-panel-open')
    ) {
      return;
    }

    const card = e.target.closest('.content-card');
    const src = card?.dataset.previewSrc;
    if (!src) {
      if (activeCard) {
        hidePreview(rail);
        activeCard = null;
      }
      return;
    }

    if (activeCard === card && rail.dataset.src === src) return;
    activeCard = card;
    showPreview(card, src, rail, img);
  });

  gallery.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.content-card');
    if (!card || card !== activeCard) return;

    const related = e.relatedTarget;
    if (related instanceof Node && card.contains(related)) return;
    if (related instanceof Element && related.closest('.content-card')?.dataset.previewSrc) {
      return;
    }

    hidePreview(rail);
    activeCard = null;
  });

  window.addEventListener(
    'scroll',
    () => {
      if (activeCard && !rail.hidden) positionPreview(activeCard, rail);
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    if (activeCard && !rail.hidden) positionPreview(activeCard, rail);
  });
}

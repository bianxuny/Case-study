import { txt } from './i18n.js';
import { UI } from './ui-strings.js';

/** @type {ReturnType<typeof setInterval> | null} */
let autoplayTimer = null;

/** @type {number} */
let currentIndex = 0;

/** @type {number} */
let slideCount = 0;

/** @type {number} */
let intervalMs = 5000;

/** @type {boolean} */
let isPaused = true;

/** @type {import('./i18n.js').Locale} */
let carouselLocale = 'zh';

/** @type {HTMLElement|null} */
let carouselRoot = null;

/** @param {string} value */
function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

const CHEVRON_LEFT = `
  <svg focusable="false" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M20 16L10 26L11.4 27.4L22.8 16L11.4 4.6L10 6z" transform="rotate(180 16 16)"></path>
  </svg>`;

const CHEVRON_RIGHT = `
  <svg focusable="false" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M20 16L10 26L11.4 27.4L22.8 16L11.4 4.6L10 6z"></path>
  </svg>`;

const ICON_PAUSE = `
  <svg focusable="false" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M12 8H8V24H12V8Z"></path>
    <path d="M24 8H20V24H24V8Z"></path>
  </svg>`;

const ICON_PLAY = `
  <svg focusable="false" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M12 8L26 16L12 24V8Z"></path>
  </svg>`;

/** @param {object} slide */
function isVideoSlide(slide) {
  return slide.type === 'video' || /\.(mp4|webm|mov)$/i.test(slide.src || '');
}

/**
 * @param {object} slide
 * @param {import('./i18n.js').Locale} locale
 * @param {number} index
 */
function buildSlide(slide, locale, index) {
  const active = index === 0;
  const activeClass = active ? ' hero-carousel__slide--active' : '';

  if (slide.blank) {
    return `
    <li class="hero-carousel__slide hero-carousel__slide--blank${activeClass}"
        role="listitem" aria-hidden="${active ? 'false' : 'true'}" data-index="${index}">
      <div class="hero-carousel__blank" aria-hidden="true"></div>
    </li>`;
  }

  const alt = txt(slide.alt, locale) || '';
  const media = isVideoSlide(slide)
    ? `<video data-src="${slide.src}"
         muted loop playsinline preload="none"
         aria-label="${escapeAttr(alt)}"></video>`
    : `<img src="${slide.src}" alt="${escapeAttr(alt)}"
         loading="${index <= 1 ? 'eager' : 'lazy'}" decoding="async" />`;

  return `
    <li class="hero-carousel__slide${activeClass}"
        role="listitem" aria-hidden="${active ? 'false' : 'true'}" data-index="${index}">
      ${media}
    </li>`;
}

/** @param {number} activeIndex */
function syncSlideMedia(activeIndex) {
  if (!carouselRoot) return;

  carouselRoot.querySelectorAll('.hero-carousel__slide').forEach((slide) => {
    const video = slide.querySelector('video');
    if (!video) return;

    const index = Number(slide.dataset.index);
    if (index === activeIndex) {
      if (video.dataset.src && !video.getAttribute('src')) {
        video.src = video.dataset.src;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

/** @param {number} index */
function updateSlideChrome(index) {
  const hero = document.getElementById('overview');
  if (!hero) return;
  hero.classList.toggle('page-hero-screen--media-slide', index > 0);
}

/** @param {HTMLElement|null} ui */
function updatePauseButton(ui) {
  const btn = ui?.querySelector('[data-action="toggle-pause"]');
  if (!btn) return;

  const pauseLabel = txt(UI.heroCarouselPause, carouselLocale);
  const playLabel = txt(UI.heroCarouselPlay, carouselLocale);

  btn.setAttribute('aria-label', isPaused ? playLabel : pauseLabel);
  btn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
  btn.innerHTML = isPaused ? ICON_PLAY : ICON_PAUSE;
}

/**
 * @param {object} [config]
 * @param {import('./i18n.js').Locale} locale
 */
export function renderHeroCarousel(config, locale) {
  const stack = document.getElementById('hero-carousel-stack');
  const mount = document.getElementById('hero-carousel');
  const ui = document.getElementById('hero-carousel-ui');
  if (!stack || !mount || !ui) return;

  stopAutoplay();
  carouselRoot = null;
  carouselLocale = locale;

  const slides = config?.slides?.filter((s) => s?.src || s?.blank) ?? [];
  if (!slides.length) {
    stack.hidden = true;
    stack.setAttribute('aria-hidden', 'true');
    ui.hidden = true;
    ui.setAttribute('aria-hidden', 'true');
    mount.innerHTML = '';
    ui.innerHTML = '';
    stack.classList.remove('page-shell__hero-stack--visible');
    ui.classList.remove('page-shell__carousel-ui--visible');
    updateSlideChrome(0);
    return;
  }

  stack.hidden = false;
  stack.setAttribute('aria-hidden', 'false');
  stack.classList.add('page-shell__hero-stack--visible');
  slideCount = slides.length;
  intervalMs = config?.interval ?? 5000;
  currentIndex = 0;
  isPaused = config?.autoplay !== true;

  const prevLabel = escapeAttr(txt(UI.heroCarouselPrev, locale));
  const nextLabel = escapeAttr(txt(UI.heroCarouselNext, locale));
  const regionLabel = escapeAttr(txt(UI.heroCarouselLabel, locale));
  const pauseLabel = escapeAttr(txt(UI.heroCarouselPause, locale));

  const slidesHtml = slides.map((slide, i) => buildSlide(slide, locale, i)).join('');

  mount.innerHTML = `
    <div class="hero-carousel${slides.length === 1 ? ' hero-carousel--single' : ''}"
         data-hero-carousel aria-label="${regionLabel}"
         ${slides.length > 1 ? `aria-roledescription="carousel"` : ''}>
      <div class="hero-carousel__viewport">
        <ul class="hero-carousel__track" role="list">${slidesHtml}</ul>
      </div>
    </div>`;

  carouselRoot = mount.querySelector('[data-hero-carousel]');

  if (slides.length === 1) {
    ui.hidden = true;
    ui.setAttribute('aria-hidden', 'true');
    ui.innerHTML = '';
    ui.classList.remove('page-shell__carousel-ui--visible');
    updateSlideChrome(0);
    return;
  }

  ui.hidden = false;
  ui.setAttribute('aria-hidden', 'false');
  ui.classList.add('page-shell__carousel-ui--visible');
  const playLabel = escapeAttr(txt(UI.heroCarouselPlay, locale));

  ui.innerHTML = `
    <button type="button" class="hero-carousel__pause"
            aria-label="${isPaused ? playLabel : pauseLabel}" aria-pressed="${isPaused ? 'true' : 'false'}" data-action="toggle-pause">${isPaused ? ICON_PLAY : ICON_PAUSE}</button>
    <button type="button" class="hero-carousel__nav hero-carousel__nav--prev"
            aria-label="${prevLabel}" data-nav="prev">${CHEVRON_LEFT}</button>
    <button type="button" class="hero-carousel__nav hero-carousel__nav--next"
            aria-label="${nextLabel}" data-nav="next">${CHEVRON_RIGHT}</button>
    <div class="hero-carousel__dots" role="tablist" aria-label="${regionLabel}">
      ${slides
        .map(
          (_, i) => `
        <button type="button" class="hero-carousel__dot${i === 0 ? ' hero-carousel__dot--active' : ''}"
                role="tab" aria-selected="${i === 0 ? 'true' : 'false'}"
                aria-label="${i + 1} / ${slides.length}" data-index="${i}"></button>`
        )
        .join('')}
    </div>`;

  bindCarousel(carouselRoot, ui);
  bindMediaLoad(carouselRoot);
  goTo(0, false);
  updatePauseButton(ui);
  if (isPaused) {
    stopAutoplay();
    carouselRoot?.querySelectorAll('video').forEach((video) => video.pause());
  } else {
    startAutoplay();
  }
}

/** @param {HTMLElement|null} root */
function bindMediaLoad(root) {
  if (!root) return;

  root.querySelectorAll('img, video').forEach((media) => {
    const onReady = () => {
      if (media.closest('.hero-carousel__slide--active')) syncSlideMedia(currentIndex);
    };
    if (media.tagName === 'VIDEO') {
      media.addEventListener('loadedmetadata', onReady);
    } else if (!media.complete) {
      media.addEventListener('load', onReady);
    }
  });
}

/** @param {HTMLElement|null} root @param {HTMLElement|null} ui */
function bindCarousel(root, ui) {
  if (!root || !ui) return;

  ui.querySelector('[data-action="toggle-pause"]')?.addEventListener('click', () => {
    isPaused = !isPaused;
    updatePauseButton(ui);
    if (isPaused) stopAutoplay();
    else startAutoplay();
  });

  ui.querySelector('[data-nav="prev"]')?.addEventListener('click', () => {
    goTo(currentIndex - 1);
    restartAutoplay();
  });

  ui.querySelector('[data-nav="next"]')?.addEventListener('click', () => {
    goTo(currentIndex + 1);
    restartAutoplay();
  });

  ui.querySelectorAll('.hero-carousel__dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.index));
      restartAutoplay();
    });
  });

  const stack = document.getElementById('hero-carousel-stack');
  stack?.addEventListener('mouseenter', () => {
    if (!isPaused) stopAutoplay();
  });
  stack?.addEventListener('mouseleave', () => {
    if (!isPaused) startAutoplay();
  });
  stack?.addEventListener('focusin', () => {
    if (!isPaused) stopAutoplay();
  });
  stack?.addEventListener('focusout', (e) => {
    if (!stack.contains(e.relatedTarget) && !isPaused) startAutoplay();
  });

  ui.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(currentIndex - 1);
      restartAutoplay();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(currentIndex + 1);
      restartAutoplay();
    }
  });
}

/** @param {number} index @param {boolean} [animate] */
function goTo(index, animate = true) {
  if (!carouselRoot || slideCount < 2) return;

  const next = ((index % slideCount) + slideCount) % slideCount;
  if (next === currentIndex && animate) return;

  const slides = carouselRoot.querySelectorAll('.hero-carousel__slide');
  const dots = document.querySelectorAll('#hero-carousel-ui .hero-carousel__dot');

  slides.forEach((slide, i) => {
    const active = i === next;
    slide.classList.toggle('hero-carousel__slide--active', active);
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  });

  dots.forEach((dot, i) => {
    const active = i === next;
    dot.classList.toggle('hero-carousel__dot--active', active);
    dot.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  currentIndex = next;
  updateSlideChrome(next);
  syncSlideMedia(next);
}

function startAutoplay() {
  if (slideCount < 2 || isPaused) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  stopAutoplay();
  autoplayTimer = setInterval(() => goTo(currentIndex + 1), intervalMs);
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function restartAutoplay() {
  stopAutoplay();
  startAutoplay();
}

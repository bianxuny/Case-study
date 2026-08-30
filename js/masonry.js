import { txt } from './i18n.js';
import { getItemCoverSrc, getItemPreviewSrc } from './card-preview.js';
import { UI } from './ui-strings.js';
import { carbonIconLocked } from './carbon-icons.js';

/** @param {object} item @param {import('./i18n.js').Locale} locale @param {string} [previewFallback] */
export function createPortfolioCard(item, locale, previewFallback = '') {
  const title = txt(item.title, locale);
  const cardDescription = txt(item.summary, locale) || txt(item.description, locale);
  const tags = item.tags?.[locale] || item.tags || [];
  const coverSrc = getItemCoverSrc(item, previewFallback);
  const previewSrc = getItemPreviewSrc(item, previewFallback);
  const hasCover = Boolean(coverSrc);

  const card = document.createElement('article');
  const locked = Boolean(item.confidential);
  card.className = hasCover
    ? 'masonry__item content-card content-card--cover'
    : 'masonry__item content-card content-card--text';
  if (locked) card.classList.add('content-card--static', 'content-card--confidential');
  card.dataset.id = item.id;
  if (!locked) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
  }
  card.setAttribute('aria-label', locked ? `${title} · ${txt(UI.confidentialLabel, locale)}` : title);

  if (previewSrc) card.dataset.previewSrc = previewSrc;

  const tagsHtml = tags
    .map((tag) => `<span class="content-card__tag">${tag}</span>`)
    .join('');

  const cardBadge = item.confidential
    ? `<span class="content-card__badge content-card__badge--confidential text-label-01">${carbonIconLocked(12)}${txt(UI.confidentialLabel, locale)}</span>`
    : item.featured
      ? `<span class="content-card__badge content-card__badge--featured text-label-01">${txt(UI.featuredLabel, locale)}</span>`
      : '';

  const coverHtml = hasCover
    ? `<div class="content-card__image-wrap">${cardBadge}<img src="${coverSrc}" alt="" loading="lazy" decoding="async" /></div>`
    : '';

  card.innerHTML = `
    ${coverHtml}
    <div class="content-card__body">
      <h3 class="content-card__title text-heading-03">${title}</h3>
      ${cardDescription ? `<p class="content-card__description text-body-02 text-text-secondary">${cardDescription}</p>` : ''}
      ${tagsHtml ? `<div class="content-card__tags">${tagsHtml}</div>` : ''}
    </div>
  `;

  return card;
}

/** @param {object} section @param {object[]} items @param {import('./i18n.js').Locale} locale @param {string} emptyLabel @param {string} [previewFallback] */
export function createGallerySection(section, items, locale, emptyLabel, previewFallback = '') {
  const el = document.createElement('section');
  el.className = 'page-section-wrapper page-section-wrapper--white page-section-wrapper--pt page-section-wrapper--pb';
  el.id = section.id;
  el.setAttribute('aria-labelledby', `${section.id}-title`);

  const sortedItems = [...items].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  const masonry = document.createElement('div');
  masonry.className = 'masonry masonry--gallery';
  masonry.setAttribute('role', 'list');

  if (sortedItems.length === 0) {
    masonry.innerHTML = `<div class="empty-state"><p class="text-body-02 text-text-secondary">${emptyLabel}</p></div>`;
  } else {
    sortedItems.forEach((item) => {
      const card = createPortfolioCard(item, locale, previewFallback);
      card.setAttribute('role', 'listitem');
      masonry.appendChild(card);
    });
  }

  el.innerHTML = `
    <div class="cds-grid">
      <div class="section-header col-span-16">
        <h2 class="section-header__title text-heading-05" id="${section.id}-title">${txt(section.title, locale)}</h2>
        <div class="section-header__descriptions">
          ${section.subtitle ? `<p class="content-description__copy text-body-02 text-text-secondary">${txt(section.subtitle, locale)}</p>` : ''}
        </div>
      </div>
      <div class="col-span-16">${masonry.outerHTML}</div>
    </div>`;

  return el;
}

export function initVideoHoverPlay() {
  /* cover cards use images — no-op */
}

export function initScrollReveal() {
  /* no-op */
}

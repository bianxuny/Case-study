import {
  createGallerySection,
  initVideoHoverPlay,
  initScrollReveal,
} from './masonry.js';
import { getHeroFirstImageSrc, initCardPreview } from './card-preview.js';
import {
  buildNavItems,
  buildNavStructure,
  renderPageNavigation,
  initPageNavigationToggle,
  initPageNavigationSections,
  initPageNavigationHighlight,
} from './page-navigation.js';
import { renderHeroCarousel } from './hero-carousel.js';
import {
  renderExperienceTimeline,
  initExperienceHelix,
  destroyExperienceHelix,
} from './timeline.js';
import { getLocale, setLocale, sidebarLabel, txt } from './i18n.js';
import { getTheme, toggleTheme } from './theme.js';
import { initPageLoader, markAppReady, updateLoaderCopy, warmupPortfolioMedia } from './loader.js';
import { UI } from './ui-strings.js';
import {
  renderSkillPipeline,
  destroySkillPipeline,
} from './skill-pipeline.js';
import {
  registerBlogPosts,
  getDefaultBlogId,
  initBlogPanel,
  openBlogPanel,
  getOpenBlogId,
  closeBlogPanel,
  renderBlogSection,
} from './blog.js';

/** @type {object|null} */
let portfolioData = null;

/** @type {object|null} */
let blogData = null;

/** @type {import('./i18n.js').Locale} */
let currentLocale = getLocale();

/** @type {Map<string, object>} */
const itemsById = new Map();

/** @type {string|null} */
let openPanelId = null;

async function init() {
  initPageLoader();
  setLocale(currentLocale);
  updateLoaderCopy(currentLocale);

  try {
    const [portfolio, blog] = await Promise.all([loadPortfolio(), loadBlog()]);
    portfolioData = portfolio;
    blogData = blog;
    registerBlogPosts(blogData);
    renderSidebar(portfolioData, currentLocale);
    renderPageContent(portfolioData, currentLocale);
    initLangSwitcher();
    initThemeToggle();
    initProjectPanel();
    initProjectTriggers();
    initBlogPanel();

    document.getElementById('site-nav-open')?.addEventListener('click', () => {
      document.getElementById('page-nav-toggle')?.click();
    });

    initScrollReveal();
    const gallery = document.getElementById('gallery-sections');
    initVideoHoverPlay(gallery);
    initCardPreview(gallery);
    warmupPortfolioMedia(portfolioData);
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    showLoadError(currentLocale);
  }

  document.getElementById('year').textContent = new Date().getFullYear();
  markAppReady();
}

/** @param {object} data @param {import('./i18n.js').Locale} locale */
function renderSidebar(data, locale) {
  const navItems = buildNavItems(locale);
  const navStructure = buildNavStructure(locale);
  renderPageNavigation(navItems, navStructure, data.about, locale);
  initPageNavigationToggle();
  initPageNavigationSections();
  initPageNavigationHighlight(navItems);
}

/** @param {object} data @param {import('./i18n.js').Locale} locale */
function renderPageContent(data, locale) {
  applyMeta(data.meta, locale);
  renderHeroCarousel(data.heroCarousel, locale);
  renderStats(data.stats, locale);
  renderHighlights(data.highlights, locale);
  renderAbout(data.about, locale);
  renderGallery(data.sections, data.items, locale, getHeroFirstImageSrc(data.heroCarousel));
  renderSkillPipeline(data.skillPipeline, locale);
  renderExperience(data.timeline, locale);
  renderBlogSection(blogData, locale);
  renderContactFooter(data, locale);
  updateLangSwitcher(locale);
  updateThemeToggle(locale);
}

async function loadPortfolio() {
  const res = await fetch('data/portfolio.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadBlog() {
  try {
    const res = await fetch('data/blog.json');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** @param {object} meta @param {import('./i18n.js').Locale} locale */
function applyMeta(meta, locale) {
  const name = txt(meta.name, locale);
  document.title = `${name} — Portfolio`;

  const desc = txt(meta.description, locale);
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && desc) metaDesc.content = `${name} — ${meta.role}. ${desc}`;

  document.querySelectorAll('[data-field]').forEach((el) => {
    const path = el.dataset.field.split('.');
    if (path[0] !== 'meta') return;
    const key = path[1];
    const value = meta[key];
    if (value == null) return;

    if (key === 'tagline' && meta.taglineAccent) {
      applyTaglineAccent(el, value, meta.taglineAccent, locale);
      return;
    }

    el.textContent = txt(value, locale);
  });
}

/** @param {HTMLElement} el @param {object|string} tagline @param {object|string} accent @param {import('./i18n.js').Locale} locale */
function applyTaglineAccent(el, tagline, accent, locale) {
  const full = txt(tagline, locale);
  const accentText = txt(accent, locale);
  const index = full.indexOf(accentText);

  if (index < 0) {
    el.textContent = full;
    return;
  }

  const before = full.slice(0, index);
  const after = full.slice(index + accentText.length);
  el.innerHTML = `${before}<span class="text-gradient-blue">${accentText}</span>${after}`;
}

/** @param {object[]} stats @param {import('./i18n.js').Locale} locale */
function renderStats(stats, locale) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = stats
    .map(
      (stat) => `
      <li class="stats-list__item">
        <p class="stats-list__label text-body-02 text-text-secondary">${txt(stat.label, locale)}</p>
        <p class="stats-list__value text-fluid-heading-05 text-text-primary text-heading-06">
          ${stat.value}${txt(stat.suffix, locale) || ''}
        </p>
        ${stat.footnote ? `<p class="stats-list__footnote text-text-helper text-label-01">${txt(stat.footnote, locale)}</p>` : ''}
      </li>`
    )
    .join('');
}

/** @param {object[]} highlights @param {import('./i18n.js').Locale} locale */
function renderHighlights(highlights, locale) {
  const grid = document.getElementById('highlights-grid');
  if (!grid || !highlights) return;
  grid.innerHTML = highlights
    .map(
      (h) => `
      <article class="masonry__item content-card content-card--text content-card--static" role="listitem">
        <div class="content-card__body">
          <span class="content-card__tag content-card__tag--index">${h.index}</span>
          <h3 class="content-card__title text-heading-03">${txt(h.title, locale)}</h3>
          <p class="content-card__description text-body-02 text-text-secondary">${txt(h.text, locale)}</p>
        </div>
      </article>`
    )
    .join('');
}

/** @param {object} timeline @param {import('./i18n.js').Locale} locale */
function renderExperience(timeline, locale) {
  const section = document.getElementById('experience');
  const mount = document.getElementById('experience-timeline');
  const title = document.getElementById('experience-title');
  if (!section || !mount) return;

  destroyExperienceHelix();

  if (!timeline?.items?.length) {
    section.setAttribute('hidden', '');
    mount.innerHTML = '';
    return;
  }

  section.removeAttribute('hidden');
  if (title) {
    title.textContent = txt(timeline.label, locale) || sidebarLabel('experience', locale);
  }
  mount.innerHTML = renderExperienceTimeline(timeline, locale);
  initExperienceHelix(mount);
}

/** @param {object} about @param {import('./i18n.js').Locale} locale */
function renderAbout(about, locale) {
  if (!about) return;
  const title = document.getElementById('about-title');
  if (title) title.textContent = txt(UI.aboutTitle, locale);

  const bio = document.querySelector('[data-about="bio"]');
  if (bio) bio.textContent = txt(about.bio, locale);

  const descriptions = document.querySelector('#about .section-header__descriptions');
  let moreLink = document.getElementById('about-more-link');
  if (!moreLink && descriptions) {
    moreLink = document.createElement('button');
    moreLink.type = 'button';
    moreLink.id = 'about-more-link';
    moreLink.className = 'about-more-link text-label-01';
    descriptions.appendChild(moreLink);
  }
  if (moreLink) {
    moreLink.textContent = txt(UI.sidebarMoreAbout, locale);
    moreLink.hidden = !getDefaultBlogId();
  }

  const focus = document.getElementById('about-focus');
  if (focus && about.focus) {
    const list = about.focus[locale] || about.focus;
    focus.innerHTML = list
      .map((f) => `<li class="about-tags__item text-label-01">${f}</li>`)
      .join('');
  }

  const footerRole = document.getElementById('footer-role');
  if (footerRole) footerRole.textContent = txt(UI.footerRole, locale);
}

/** @param {object[]} sections @param {object[]} items @param {import('./i18n.js').Locale} locale @param {string} [previewFallback] */
function renderGallery(sections, items, locale, previewFallback = '') {
  const container = document.getElementById('gallery-sections');
  container.innerHTML = '';
  itemsById.clear();
  items.forEach((item) => itemsById.set(item.id, item));
  sections.forEach((section) => {
    const sectionItems = items.filter((item) => item.section === section.id);
    container.appendChild(
      createGallerySection(section, sectionItems, locale, txt(UI.emptyProjects, locale), previewFallback)
    );
  });
}

function initLangSwitcher() {
  const btnZh = document.getElementById('lang-zh');
  const btnEn = document.getElementById('lang-en');
  if (!btnZh || !btnEn) return;

  btnZh.addEventListener('click', () => switchLocale('zh'));
  btnEn.addEventListener('click', () => switchLocale('en'));
  updateLangSwitcher(currentLocale);
}

/** @param {import('./i18n.js').Locale} locale */
function switchLocale(locale) {
  if (locale === currentLocale || !portfolioData) return;
  currentLocale = locale;
  setLocale(locale);
  updateLoaderCopy(locale);
  destroySkillPipeline();
  destroyExperienceHelix();
  renderSidebar(portfolioData, locale);
  renderPageContent(portfolioData, locale);
  if (openPanelId) openProjectPanel(openPanelId);
  const openBlog = getOpenBlogId();
  if (openBlog) openBlogPanel(openBlog, locale);
  else closeBlogPanel();
  renderBlogSection(blogData, locale);
}

/** @param {import('./i18n.js').Locale} locale */
function updateLangSwitcher(locale) {
  const btnZh = document.getElementById('lang-zh');
  const btnEn = document.getElementById('lang-en');
  btnZh?.classList.toggle('site-header__lang-btn--active', locale === 'zh');
  btnEn?.classList.toggle('site-header__lang-btn--active', locale === 'en');
  btnZh?.setAttribute('aria-pressed', locale === 'zh' ? 'true' : 'false');
  btnEn?.setAttribute('aria-pressed', locale === 'en' ? 'true' : 'false');
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    toggleTheme();
    updateThemeToggle(currentLocale);
  });
  updateThemeToggle(currentLocale);
}

/** @param {import('./i18n.js').Locale} locale */
function updateThemeToggle(locale) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const isDark = getTheme() === 'dark';
  btn.setAttribute('aria-label', txt(isDark ? UI.switchToLight : UI.switchToDark, locale));
  btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  btn.title = txt(isDark ? UI.switchToLight : UI.switchToDark, locale);
}

function initProjectPanel() {
  const panel = document.getElementById('project-panel');
  const backdrop = document.getElementById('project-panel-backdrop');
  const closeBtn = document.getElementById('project-panel-close');
  const gallery = document.getElementById('gallery-sections');
  if (!panel || !gallery) return;

  gallery.addEventListener('click', (e) => {
    const card = e.target.closest('.content-card:not(.content-card--static)');
    if (!card?.dataset.id) return;
    openProjectPanel(card.dataset.id);
  });

  gallery.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.content-card:not(.content-card--static)');
    if (!card?.dataset.id) return;
    e.preventDefault();
    openProjectPanel(card.dataset.id);
  });

  closeBtn?.addEventListener('click', closeProjectPanel);
  backdrop?.addEventListener('click', closeProjectPanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openPanelId) closeProjectPanel();
  });
}

function initProjectTriggers() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-project]');
    if (!trigger?.dataset.openProject) return;
    e.preventDefault();
    openProjectPanel(trigger.dataset.openProject);
  });
}

/** @param {object} item @param {import('./i18n.js').Locale} locale */
function buildCaseStudyHtml(item, locale) {
  const cs = item.caseStudy;
  if (!cs) return '';

  const metaItems = [
    cs.role && { label: txt(UI.caseStudyRole, locale), value: txt(cs.role, locale) },
    cs.timeline && { label: txt(UI.caseStudyTimeline, locale), value: txt(cs.timeline, locale) },
    cs.team && { label: txt(UI.caseStudyTeam, locale), value: txt(cs.team, locale) },
  ].filter(Boolean);

  const metaHtml = metaItems.length
    ? `<dl class="project-panel__meta">${metaItems
        .map(
          (entry) => `
        <div class="project-panel__meta-item">
          <dt class="project-panel__meta-label text-label-01 text-text-helper">${entry.label}</dt>
          <dd class="project-panel__meta-value text-body-02">${entry.value}</dd>
        </div>`
        )
        .join('')}</dl>`
    : '';

  const problemHtml = cs.problem
    ? `<section class="project-panel__case-block">
        <h3 class="project-panel__case-heading text-heading-03">${txt(UI.caseStudyProblem, locale)}</h3>
        <p class="project-panel__case-text text-body-02 text-text-secondary">${txt(cs.problem, locale)}</p>
      </section>`
    : '';

  const approachHtml = cs.approach
    ? `<section class="project-panel__case-block">
        <h3 class="project-panel__case-heading text-heading-03">${txt(UI.caseStudyApproach, locale)}</h3>
        <p class="project-panel__case-text text-body-02 text-text-secondary">${txt(cs.approach, locale)}</p>
      </section>`
    : '';

  const impactItems = cs.impact?.map((entry) => txt(entry, locale)).filter(Boolean) || [];
  const impactHtml = impactItems.length
    ? `<section class="project-panel__case-block">
        <h3 class="project-panel__case-heading text-heading-03">${txt(UI.caseStudyImpact, locale)}</h3>
        <ul class="project-panel__impact-list">${impactItems.map((entry) => `<li>${entry}</li>`).join('')}</ul>
      </section>`
    : '';

  if (!metaHtml && !problemHtml && !approachHtml && !impactHtml) return '';

  return `<div class="project-panel__case">${metaHtml}${problemHtml}${approachHtml}${impactHtml}</div>`;
}

/** @param {object} data @param {import('./i18n.js').Locale} locale */
function renderContactFooter(data, locale) {
  const openEl = document.getElementById('footer-open-to-work');
  const linksEl = document.getElementById('footer-links');
  if (!linksEl) return;

  const openToWork = txt(data.contact?.openToWork, locale);
  if (openEl) {
    openEl.textContent = openToWork;
    openEl.hidden = !openToWork;
  }

  const contact = data.contact || {};
  const instagram = data.about?.instagram || '';
  const links = [
    contact.email && {
      href: `mailto:${contact.email}`,
      label: txt(UI.footerEmail, locale),
      external: false,
    },
    contact.linkedin && {
      href: contact.linkedin,
      label: txt(UI.footerLinkedIn, locale),
      external: true,
    },
    contact.resume && {
      href: contact.resume,
      label: txt(UI.footerResume, locale),
      external: true,
    },
    instagram && {
      href: instagram,
      label: txt(UI.footerInstagram, locale),
      external: true,
    },
  ].filter(Boolean);

  linksEl.innerHTML = links.length
    ? links
        .map(
          (link) => `
        <a class="site-footer__link" href="${link.href}"${link.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          ${link.label}
        </a>`
        )
        .join('')
    : '';
}

/** @param {string} id */
function openProjectPanel(id) {
  const item = itemsById.get(id);
  if (!item) return;

  const panel = document.getElementById('project-panel');
  const title = document.getElementById('project-panel-title');
  const media = document.getElementById('project-panel-media');
  const body = document.getElementById('project-panel-body');
  if (!panel || !title || !media || !body) return;

  openPanelId = id;
  title.textContent = txt(item.title, currentLocale);

  if (item.src || item.images?.length) {
    media.hidden = false;
    media.innerHTML = buildPanelMedia(item);
    media.querySelector('video')?.play().catch(() => {});
  } else {
    media.hidden = true;
    media.innerHTML = '';
  }

  const tags = item.tags?.[currentLocale] || item.tags || [];
  const tagsHtml = tags.map((tag) => `<span class="content-card__tag">${tag}</span>`).join('');
  const highlightsHtml = buildPanelHighlights(item.highlights, currentLocale);
  const linkHtml = item.link
    ? `<p class="project-panel__external"><a class="project-panel__external-link text-label-01" href="${item.link}" target="_blank" rel="noopener noreferrer">${txt(UI.viewLiveProject, currentLocale)}</a></p>`
    : '';

  body.innerHTML = `
    ${buildCaseStudyHtml(item, currentLocale)}
    ${linkHtml}
    ${item.description ? `<p class="project-panel__description text-body-02 text-text-secondary">${txt(item.description, currentLocale)}</p>` : ''}
    ${highlightsHtml}
    ${tagsHtml ? `<div class="content-card__tags">${tagsHtml}</div>` : ''}`;

  document.querySelectorAll('.content-card--selected').forEach((el) => {
    el.classList.remove('content-card--selected');
  });
  document.querySelector(`.content-card[data-id="${id}"]`)?.classList.add('content-card--selected');

  panel.classList.add('project-panel--open');
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('project-panel-open');
  document.getElementById('project-panel-close')?.focus();
}

function closeProjectPanel() {
  const panel = document.getElementById('project-panel');
  const media = document.getElementById('project-panel-media');
  const body = document.getElementById('project-panel-body');
  if (!panel) return;

  panel?.querySelectorAll('video').forEach((v) => v.pause());
  media && (media.innerHTML = '', media.hidden = true);
  if (body) body.innerHTML = '';

  document.querySelectorAll('.content-card--selected').forEach((el) => {
    el.classList.remove('content-card--selected');
  });

  panel.classList.remove('project-panel--open');
  panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('project-panel-open');
  openPanelId = null;
}

/** @param {{ type?: string, src?: string, poster?: string }} item */
function buildPanelMediaSlot(item) {
  if (item.type === 'video') {
    return `<div class="project-panel__media-slot"><video src="${item.src}" ${item.poster ? `poster="${item.poster}"` : ''} controls playsinline></video></div>`;
  }
  return `<div class="project-panel__media-slot"><img src="${item.src}" alt="" /></div>`;
}

/** @param {{ type?: string, src?: string, poster?: string }|Array<{ type?: string, src?: string, poster?: string }>|undefined} media */
function buildHighlightMedia(media) {
  if (!media) return '';
  const items = Array.isArray(media) ? media : [media];
  const slots = items.filter((item) => item?.src).map(buildPanelMediaSlot);
  if (!slots.length) return '';
  return `<div class="project-panel__media-stack">${slots.join('')}</div>`;
}

/** @param {object[]|undefined} highlights @param {import('./i18n.js').Locale} locale */
function buildPanelHighlights(highlights, locale) {
  if (!highlights?.length) return '';
  return `
    <ul class="project-panel__highlights" role="list">
      ${highlights
        .map(
          (h) => `
        <li class="project-panel__highlight" role="listitem">
          ${h.title ? `<h3 class="project-panel__highlight-title text-heading-03">${txt(h.title, locale)}</h3>` : ''}
          <p class="project-panel__highlight-text text-body-02 text-text-secondary">${txt(h.text, locale)}</p>
          ${buildHighlightMedia(h.media)}
        </li>`
        )
        .join('')}
    </ul>`;
}

/** @param {object} item */
function buildPanelMedia(item) {
  if (item.type === 'video' && item.src) {
    return `<div class="project-panel__media-stack"><div class="project-panel__media-slot"><video src="${item.src}" ${item.poster ? `poster="${item.poster}"` : ''} controls autoplay playsinline></video></div></div>`;
  }

  const sources = item.images?.length ? item.images : item.src ? [item.src] : [];
  if (!sources.length) return '';

  const alt = txt(item.title, currentLocale);
  const slots = sources
    .map((src) => `<div class="project-panel__media-slot"><img src="${src}" alt="${alt}" /></div>`)
    .join('');
  return `<div class="project-panel__media-stack">${slots}</div>`;
}

/** @param {import('./i18n.js').Locale} locale */
function showLoadError(locale) {
  document.getElementById('gallery-sections').innerHTML = `
    <section class="page-section-wrapper page-section-wrapper--white page-section-wrapper--pt">
      <div class="cds-grid"><div class="col-span-16 empty-state">
        <p class="text-body-02">${txt(UI.loadError, locale)}</p>
        <p class="text-caption">Run: <code>npx serve .</code></p>
      </div></div>
    </section>`;
}

init();

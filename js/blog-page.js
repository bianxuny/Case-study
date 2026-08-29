import { getLocale, setLocale, txt } from './i18n.js';
import { getTheme, toggleTheme } from './theme.js';
import { UI } from './ui-strings.js';
import {
  buildNavItems,
  buildNavStructure,
  renderPageNavigation,
  initPageNavigationToggle,
  initPageNavigationSections,
  initPageNavigationHighlight,
} from './page-navigation.js';
import { renderContactFooter } from './contact-footer.js';
import {
  registerBlogPosts,
  getBlogMeta,
  getBlogPost,
  getListedPosts,
  renderCoverCard,
  renderContentBlocks,
  formatBlogByline,
  postMatchesTopic,
  initBlogPanel,
} from './blog.js';

/** @type {object|null} */
let portfolioData = null;

/** @type {object|null} */
let blogData = null;

/** @type {import('./i18n.js').Locale} */
let currentLocale = getLocale();

/** @type {string} */
let activeTopic = 'all';

async function init() {
  setLocale(currentLocale);
  document.documentElement.dataset.loader = 'skip';

  try {
    const [portfolio, blog] = await Promise.all([loadJson('data/portfolio.json'), loadJson('data/blog.json')]);
    portfolioData = portfolio;
    blogData = blog;
    registerBlogPosts(blogData);
    renderChrome();
    renderBlogPage();
    initLangSwitcher();
    initThemeToggle();
    initBlogPanel();
    initFilters();

    document.getElementById('site-nav-open')?.addEventListener('click', () => {
      document.getElementById('page-nav-toggle')?.click();
    });
  } catch (err) {
    console.error('Failed to load blog:', err);
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}

/** @param {string} url */
async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderChrome() {
  const navItems = buildNavItems(currentLocale);
  renderPageNavigation(navItems, buildNavStructure(currentLocale), portfolioData?.about, currentLocale);
  initPageNavigationToggle();
  initPageNavigationSections();
  initPageNavigationHighlight(navItems);
  renderContactFooter(portfolioData, currentLocale);
  applyPageTitle();
  updateLangSwitcher(currentLocale);
  updateThemeToggle(currentLocale);

  const name = txt(portfolioData?.meta?.name, currentLocale);
  document.querySelectorAll('[data-field="meta.name"]').forEach((el) => {
    if (name) el.textContent = name;
  });
}

function applyPageTitle() {
  const meta = getBlogMeta();
  const site = txt(portfolioData?.meta?.name, currentLocale) || "Jiayi's Case Study";
  const blogLabel = txt(meta?.title, currentLocale) || txt(UI.blogTitle, currentLocale);
  const id = new URLSearchParams(window.location.search).get('id');
  const post = id ? getBlogPost(id) : null;
  document.title = post
    ? `${txt(post.title, currentLocale)} — ${site}`
    : `${site} — ${blogLabel}`;
}

function renderBlogPage() {
  const meta = getBlogMeta();
  const title = document.getElementById('blog-page-title');
  const subtitle = document.getElementById('blog-page-subtitle');
  if (title) title.textContent = txt(meta?.title, currentLocale) || txt(UI.blogTitle, currentLocale);
  if (subtitle) subtitle.textContent = txt(meta?.subtitle, currentLocale);

  const postId = new URLSearchParams(window.location.search).get('id');
  const post = postId ? getBlogPost(postId) : null;

  const indexEl = document.getElementById('blog-page-index');
  const articleEl = document.getElementById('blog-page-article');
  if (!indexEl || !articleEl) return;

  if (post) {
    indexEl.hidden = true;
    articleEl.hidden = false;
    renderArticle(post);
  } else {
    articleEl.hidden = true;
    indexEl.hidden = false;
    renderFilters();
    renderGrid();
  }

  applyPageTitle();
}

function renderFilters() {
  const host = document.getElementById('blog-filters');
  if (!host) return;

  const filters = getBlogMeta()?.filters || [];
  const listed = getListedPosts();
  const used = new Set(listed.flatMap((p) => p.topics || []));

  host.setAttribute('aria-label', txt(UI.blogFilterAria, currentLocale));
  host.innerHTML = filters
    .filter((f) => f.id === 'all' || used.has(f.id))
    .map((f) => {
      const active = f.id === activeTopic;
      return `<button type="button" class="blog-filter${active ? ' blog-filter--active' : ''}" data-topic="${f.id}" aria-pressed="${active}">${txt(f.label, currentLocale)}</button>`;
    })
    .join('');
}

function renderGrid() {
  const list = document.getElementById('blog-grid');
  if (!list) return;
  const posts = getListedPosts().filter((p) => postMatchesTopic(p, activeTopic));
  list.innerHTML = posts.length
    ? posts.map((post) => renderCoverCard(post, currentLocale)).join('')
    : `<p class="text-body-02 text-text-secondary">${txt(UI.blogEmpty, currentLocale)}</p>`;
}

/** @param {object} post */
function renderArticle(post) {
  const host = document.getElementById('blog-page-article');
  if (!host) return;

  const title = txt(post.title, currentLocale);
  const byline = formatBlogByline(post, currentLocale);
  const tags = post.tags?.[currentLocale] || post.tags || [];
  const tagsHtml = (Array.isArray(tags) ? tags : [])
    .map((t) => `<span class="blog-card__tag">${t}</span>`)
    .join('');
  const blocks = post.content?.[currentLocale] || post.content?.zh || [];
  const cover = post.cover
    ? `<div class="blog-article-page__cover"><img src="${post.cover}" alt="" /></div>`
    : '';

  host.innerHTML = `
    <article class="blog-article-page">
      <a class="blog-article-page__back text-label-01" href="blog.html">${txt(UI.blogBack, currentLocale)}</a>
      ${cover}
      <h1 class="blog-article-page__title text-heading-05">${title}</h1>
      ${byline ? `<p class="blog-article-page__byline text-label-01 text-text-helper">${byline}</p>` : ''}
      ${tagsHtml ? `<div class="blog-card__tags">${tagsHtml}</div>` : ''}
      <div class="blog-article">${renderContentBlocks(blocks, currentLocale)}</div>
    </article>`;
}

function initFilters() {
  document.getElementById('blog-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn) return;
    activeTopic = btn.dataset.topic || 'all';
    renderFilters();
    renderGrid();
  });
}

function initLangSwitcher() {
  document.getElementById('lang-zh')?.addEventListener('click', () => switchLocale('zh'));
  document.getElementById('lang-en')?.addEventListener('click', () => switchLocale('en'));
  updateLangSwitcher(currentLocale);
}

/** @param {import('./i18n.js').Locale} locale */
function switchLocale(locale) {
  if (locale === currentLocale) return;
  currentLocale = locale;
  setLocale(locale);
  renderChrome();
  renderBlogPage();
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

init();

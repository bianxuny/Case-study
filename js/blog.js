import { txt } from './i18n.js';
import { UI } from './ui-strings.js';

/** @type {Map<string, object>} */
const postsById = new Map();

/** @type {string|null} */
let openBlogId = null;

/** @type {string|null} */
let defaultPostId = null;

/** @type {object|null} */
let blogMeta = null;

export function isBlogPage() {
  return document.body?.dataset?.page === 'blog';
}

/** @param {string} id */
export function blogPostHref(id) {
  return isBlogPage() ? `?id=${encodeURIComponent(id)}` : `blog.html?id=${encodeURIComponent(id)}`;
}

/**
 * @param {object|null} blog
 * @returns {string|null}
 */
export function registerBlogPosts(blog) {
  postsById.clear();
  defaultPostId = null;
  blogMeta = blog?.meta ?? null;
  if (!blog?.posts?.length) return null;

  const published = blog.posts.filter((p) => p.status !== 'draft');
  published.forEach((post) => postsById.set(post.id, post));
  defaultPostId =
    published.find((p) => p.featuredInAbout)?.id ?? published[0]?.id ?? null;
  return defaultPostId;
}

export function getBlogMeta() {
  return blogMeta;
}

/** @param {string} id */
export function getBlogPost(id) {
  return postsById.get(id) || null;
}

/** @returns {object[]} */
export function getListedPosts() {
  return [...postsById.values()]
    .filter((post) => post.listInSection !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/** @returns {string|null} */
export function getDefaultBlogId() {
  return defaultPostId;
}

/** @param {string} date @param {import('./i18n.js').Locale} locale */
export function formatBlogDate(date, locale) {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, m - 1, d));
}

/** @param {string} value */
function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {object} post @param {import('./i18n.js').Locale} locale */
export function formatBlogByline(post, locale) {
  const dateText = txt(post.dateLabel, locale) || formatBlogDate(post.date, locale);
  const author = txt(post.author, locale) || txt(blogMeta?.defaultAuthor, locale);
  if (dateText && author) return `${dateText} · ${author}`;
  return dateText || author;
}

/** @param {object[]} blocks @param {import('./i18n.js').Locale} locale */
export function renderContentBlocks(blocks, locale) {
  if (!blocks?.length) return '';
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `<h${block.level || 2} class="blog-article__heading text-heading-03">${block.text}</h${block.level || 2}>`;
        case 'list':
          return `<ul class="blog-article__list">${(block.items || []).map((item) => `<li>${item}</li>`).join('')}</ul>`;
        case 'quote':
          return `<blockquote class="blog-article__quote text-body-02">${block.text}</blockquote>`;
        case 'timeline':
          return `<ol class="blog-timeline" role="list">${(block.steps || [])
            .map(
              (step) => `
            <li class="blog-timeline__step" role="listitem">
              <h4 class="blog-timeline__step-title text-heading-03">${step.title}</h4>
              ${step.image ? `<img class="blog-timeline__step-image" src="${escapeAttr(step.image)}" alt="" loading="lazy" decoding="async" />` : ''}
              ${step.text ? `<p class="blog-timeline__step-text text-body-02 text-text-secondary">${step.text}</p>` : ''}
            </li>`
            )
            .join('')}</ol>`;
        case 'framework':
          return `<ol class="blog-timeline blog-timeline--framework" role="list">${(block.steps || [])
            .map(
              (step) => `
            <li class="blog-timeline__step" role="listitem">
              <h4 class="blog-timeline__step-title text-heading-03">${step.title}</h4>
              ${step.image ? `<img class="blog-timeline__step-image" src="${escapeAttr(step.image)}" alt="" loading="lazy" decoding="async" />` : ''}
              ${step.text ? `<p class="blog-timeline__step-text text-body-02 text-text-secondary">${step.text}</p>` : ''}
            </li>`
            )
            .join('')}</ol>`;
        case 'paragraph':
        default:
          return `<p class="blog-article__paragraph text-body-02 text-text-secondary">${block.text || ''}</p>`;
      }
    })
    .join('');
}

/**
 * @param {object} post
 * @param {import('./i18n.js').Locale} locale
 */
export function renderCoverCard(post, locale) {
  const tags = post.tags?.[locale] || post.tags || [];
  const tagsHtml = (Array.isArray(tags) ? tags : [])
    .slice(0, 3)
    .map((tag) => `<span class="blog-card__tag">${tag}</span>`)
    .join('');
  const title = txt(post.title, locale);
  const byline = formatBlogByline(post, locale);
  const href = blogPostHref(post.id);
  const cover = post.cover
    ? `<div class="blog-card__image-wrap"><img src="${escapeAttr(post.cover)}" alt="" loading="lazy" decoding="async" /></div>`
    : `<div class="blog-card__image-wrap blog-card__image-wrap--empty" aria-hidden="true"></div>`;

  return `
    <a class="blog-card blog-card--cover" role="listitem" href="${escapeAttr(href)}" aria-label="${escapeAttr(title)}">
      ${cover}
      <div class="blog-card__body">
        <h3 class="blog-card__title text-heading-03">${title}</h3>
        ${byline ? `<p class="blog-card__byline text-label-01 text-text-helper">${byline}</p>` : ''}
        ${tagsHtml ? `<div class="blog-card__tags">${tagsHtml}</div>` : ''}
      </div>
    </a>`;
}

/** @param {object} post @param {string} topicId */
export function postMatchesTopic(post, topicId) {
  if (!topicId || topicId === 'all') return true;
  const topics = post.topics || [];
  return topics.includes(topicId);
}

const HOME_WINDOW_COUNT = 4;

/** @param {object|null} blog @param {import('./i18n.js').Locale} locale */
export function renderBlogSection(blog, locale) {
  const section = document.getElementById('writing');
  const list = document.getElementById('blog-list');
  const title = document.getElementById('writing-title');
  const subtitle = document.getElementById('writing-subtitle');
  const allLink = document.getElementById('blog-window-all');
  if (!section || !list) return;

  const posts = getListedPosts().slice(0, HOME_WINDOW_COUNT);
  const meta = blog?.meta ?? blogMeta;

  if (title) title.textContent = txt(meta?.title, locale) || txt(UI.blogTitle, locale);
  if (subtitle) subtitle.textContent = txt(meta?.subtitle, locale);
  if (allLink) {
    allLink.textContent = txt(UI.blogViewAll, locale);
    allLink.hidden = !getListedPosts().length;
  }

  if (!posts.length) {
    section.hidden = true;
    list.innerHTML = '';
    return;
  }

  section.hidden = false;
  list.classList.add('blog-grid');
  list.innerHTML = posts.map((post) => renderCoverCard(post, locale)).join('');
}

/** @param {string} id @param {import('./i18n.js').Locale} locale */
export function openBlogPanel(id, locale) {
  const post = postsById.get(id);
  if (!post) return;

  const panel = document.getElementById('blog-panel');
  const title = document.getElementById('blog-panel-title');
  const meta = document.getElementById('blog-panel-meta');
  const body = document.getElementById('blog-panel-body');
  if (!panel || !title || !meta || !body) return;

  openBlogId = id;
  title.textContent = txt(post.title, locale);

  const tags = post.tags?.[locale] || post.tags || [];
  const tagsHtml = (Array.isArray(tags) ? tags : [])
    .map((t) => `<span class="blog-panel__tag">${t}</span>`)
    .join('');
  const byline = formatBlogByline(post, locale);
  meta.innerHTML = `
    ${byline ? `<p class="blog-panel__date text-label-01 text-text-helper">${byline}</p>` : ''}
    ${tagsHtml ? `<div class="blog-panel__tags">${tagsHtml}</div>` : ''}`;

  const blocks = post.content?.[locale] || post.content?.zh || [];
  body.innerHTML = `<article class="blog-article">${renderContentBlocks(blocks, locale)}</article>`;

  panel.classList.add('blog-panel--open');
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('blog-panel-open');
  document.getElementById('blog-panel-close')?.focus();
}

export function closeBlogPanel() {
  const panel = document.getElementById('blog-panel');
  if (!panel) return;

  panel.classList.remove('blog-panel--open');
  panel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('blog-panel-open');
  openBlogId = null;

  const body = document.getElementById('blog-panel-body');
  if (body) body.innerHTML = '';
}

export function initBlogPanel() {
  const panel = document.getElementById('blog-panel');
  const backdrop = document.getElementById('blog-panel-backdrop');
  const closeBtn = document.getElementById('blog-panel-close');

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.about-more-link');
    if (!trigger || !defaultPostId) return;
    if (trigger.tagName === 'A' && trigger.getAttribute('href')) return;
    e.preventDefault();
    window.location.href = blogPostHref(defaultPostId);
  });

  if (!panel) return;

  closeBtn?.addEventListener('click', closeBlogPanel);
  backdrop?.addEventListener('click', closeBlogPanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openBlogId) closeBlogPanel();
  });
}

/** @returns {string|null} */
export function getOpenBlogId() {
  return openBlogId;
}

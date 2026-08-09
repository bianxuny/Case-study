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

/** @returns {object[]} */
function getSectionPosts() {
  return [...postsById.values()].filter((post) => post.listInSection !== false);
}

/** @returns {string|null} */
export function getDefaultBlogId() {
  return defaultPostId;
}

/** @param {string} date @param {import('./i18n.js').Locale} locale */
function formatDate(date, locale) {
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
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {object[]} blocks @param {import('./i18n.js').Locale} locale */
function renderContentBlocks(blocks, locale) {
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

/** @param {object} post @param {import('./i18n.js').Locale} locale */
function renderBlogCard(post, locale) {
  const tags = post.tags?.[locale] || post.tags || [];
  const tagsHtml = tags
    .slice(0, 2)
    .map((tag) => `<span class="blog-card__tag">${tag}</span>`)
    .join('');
  const dateText = txt(post.dateLabel, locale) || formatDate(post.date, locale);

  return `
    <article class="blog-card" role="listitem" tabindex="0" data-blog-id="${escapeAttr(post.id)}">
      <div class="blog-card__body">
        <div class="blog-card__meta">
          ${dateText ? `<time class="blog-card__date text-label-01 text-text-helper" datetime="${post.date || ''}">${dateText}</time>` : ''}
          ${tagsHtml ? `<div class="blog-card__tags">${tagsHtml}</div>` : ''}
        </div>
        <h3 class="blog-card__title text-heading-03">${txt(post.title, locale)}</h3>
        <p class="blog-card__summary text-body-02 text-text-secondary">${txt(post.summary, locale)}</p>
        <span class="blog-card__cta text-label-01">${txt(UI.blogReadMore, locale)}</span>
      </div>
    </article>`;
}

/** @param {object|null} blog @param {import('./i18n.js').Locale} locale */
export function renderBlogSection(blog, locale) {
  const section = document.getElementById('writing');
  const list = document.getElementById('blog-list');
  const title = document.getElementById('writing-title');
  const subtitle = document.getElementById('writing-subtitle');
  if (!section || !list) return;

  const posts = getSectionPosts();
  const meta = blog?.meta ?? blogMeta;

  if (title) title.textContent = txt(meta?.title, locale) || txt(UI.blogTitle, locale);
  if (subtitle) subtitle.textContent = txt(meta?.subtitle, locale);

  if (!posts.length) {
    section.hidden = true;
    list.innerHTML = '';
    return;
  }

  section.hidden = false;
  list.innerHTML = posts.map((post) => renderBlogCard(post, locale)).join('');
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
  const tagsHtml = tags.map((t) => `<span class="blog-panel__tag">${t}</span>`).join('');
  const dateText = txt(post.dateLabel, locale) || formatDate(post.date, locale);
  meta.innerHTML = `
    <time class="blog-panel__date text-label-01 text-text-helper" datetime="${post.date || ''}">${dateText}</time>
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

/** @param {import('./i18n.js').Locale} locale */
function openDefaultBlog(locale) {
  if (defaultPostId) openBlogPanel(defaultPostId, locale);
}

/** @param {import('./i18n.js').Locale} locale */
function openBlogFromCard(card, locale) {
  const id = card?.dataset?.blogId;
  if (id) openBlogPanel(id, locale);
}

export function initBlogPanel() {
  const panel = document.getElementById('blog-panel');
  const backdrop = document.getElementById('blog-panel-backdrop');
  const closeBtn = document.getElementById('blog-panel-close');
  if (!panel) return;

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.blog-card');
    if (card) {
      const locale = document.documentElement.lang === 'en' ? 'en' : 'zh';
      openBlogFromCard(card, locale);
      return;
    }

    const trigger = e.target.closest('.about-more-link');
    if (!trigger || !defaultPostId) return;
    e.preventDefault();
    const locale = document.documentElement.lang === 'en' ? 'en' : 'zh';
    openDefaultBlog(locale);
  });

  document.addEventListener('keydown', (e) => {
    const card = e.target.closest('.blog-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const locale = document.documentElement.lang === 'en' ? 'en' : 'zh';
      openBlogFromCard(card, locale);
    }
  });

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

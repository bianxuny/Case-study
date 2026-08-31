import { renderSidebarAboutHtml } from './sidebar-about.js';
import { sidebarLabel } from './i18n.js';

const MENU_ICON = `
  <svg focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor"
    width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M4 6H22V8H4z"></path>
    <path d="M4 12H22V14H4z"></path>
    <path d="M4 18H22V20H4z"></path>
    <path d="M4 24H22V26H4z"></path>
    <path d="M26 6H28V8H26z"></path>
    <path d="M26 12H28V14H26z"></path>
    <path d="M26 18H28V20H26z"></path>
    <path d="M26 24H28V26H26z"></path>
  </svg>
`;

export function isBlogPage() {
  return document.body?.dataset?.page === 'blog';
}

function homeHref(id) {
  return isBlogPage() ? `index.html#${id}` : `#${id}`;
}

/** @param {import('./i18n.js').Locale} locale */
export function buildNavItems(locale) {
  return [
    { id: 'overview', label: sidebarLabel('overview', locale), href: homeHref('overview') },
    { id: 'skills', label: sidebarLabel('skills', locale), href: homeHref('skills') },
    { id: 'experience', label: sidebarLabel('experience', locale), href: homeHref('experience') },
    { id: 'about', label: sidebarLabel('about', locale), href: homeHref('about') },
  ];
}

/** @param {import('./i18n.js').Locale} locale */
export function buildNavStructure(locale) {
  return {
    topLinks: [
      {
        id: 'overview',
        label: sidebarLabel('overview', locale),
        href: homeHref('overview'),
      },
    ],
  };
}

/**
 * @param {object[]} navItems
 * @param {object} structure
 * @param {object} [about]
 * @param {import('./i18n.js').Locale} locale
 */
export function renderPageNavigation(navItems, structure, about, locale) {
  const nav = document.getElementById('page-navigation');
  if (!nav) return;

  const topHtml = structure.topLinks
    .map(
      (item) => `
      <li class="page-navigation__list__item">
        <a class="page-navigation__list__item__link${
          item.id === 'overview' && !isBlogPage() ? ' page-navigation__list__item__link--selected' : ''
        }"
           href="${item.href || homeHref(item.id)}" data-nav-id="${item.id}">
          ${item.label}
        </a>
      </li>`
    )
    .join('');

  const aboutHtml = renderSidebarAboutHtml(about, locale);
  const skillsLabel = sidebarLabel('skills', locale);
  const skillsLinkHtml = `
      <li class="page-navigation__list__item">
        <a class="page-navigation__list__item__link" href="${homeHref('skills')}" data-nav-id="skills">${skillsLabel}</a>
      </li>`;
  const experienceLabel = sidebarLabel('experience', locale);
  const experienceLinkHtml = `
      <li class="page-navigation__list__item">
        <a class="page-navigation__list__item__link" href="${homeHref('experience')}" data-nav-id="experience">${experienceLabel}</a>
      </li>`;
  nav.className = 'page-navigation page-navigation--sidebar';
  nav.innerHTML = `
    <button type="button" class="page-navigation__backdrop" id="page-nav-backdrop" aria-label="Close menu"></button>
    <div class="page-navigation__inner">
      <div class="page-navigation__header-item" id="page-nav-toggle" role="button" tabindex="0"
           aria-expanded="false" aria-controls="page-nav-list">
        <span id="page-nav-current">${navItems[0].label}</span>
        ${MENU_ICON}
      </div>
      <ul class="page-navigation__list" id="page-nav-list">
        ${topHtml}
        ${skillsLinkHtml}
        ${experienceLinkHtml}
        ${aboutHtml}
      </ul>
    </div>
  `;
}

export function initPageNavigationToggle() {
  const nav = document.getElementById('page-navigation');
  const toggle = document.getElementById('page-nav-toggle');
  const backdrop = document.getElementById('page-nav-backdrop');
  const list = document.getElementById('page-nav-list');
  if (!nav || !toggle || !list) return;

  const open = () => {
    nav.classList.add('page-navigation--open');
    backdrop?.classList.add('page-navigation__backdrop--visible');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const close = () => {
    nav.classList.remove('page-navigation--open');
    backdrop?.classList.remove('page-navigation__backdrop--visible');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    nav.classList.contains('page-navigation--open') ? close() : open();
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      nav.classList.contains('page-navigation--open') ? close() : open();
    }
  });

  backdrop?.addEventListener('click', close);

  list.addEventListener('click', (e) => {
    const link = e.target.closest('.page-navigation__list__item__link');
    if (link && window.matchMedia('(max-width: 65.98rem)').matches) close();
  });
}

export function initPageNavigationSections() {
  document.querySelectorAll('.page-navigation__section-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const sublist = document.getElementById(btn.getAttribute('aria-controls'));
      sublist?.classList.toggle('page-navigation__sublist--collapsed', expanded);
      btn.querySelector('.page-navigation__chevron')?.classList.toggle(
        'page-navigation__chevron--collapsed',
        expanded
      );
    });
  });
}

/** @type {IntersectionObserver|null} */
let sectionObserver = null;

/** @param {object[]} navItems */
export function initPageNavigationHighlight(navItems) {
  sectionObserver?.disconnect();

  const links = document.querySelectorAll('.page-navigation__list__item__link');
  const currentLabel = document.getElementById('page-nav-current');

  const sections = navItems
    .map((item) => document.getElementById(item.id))
    .filter(Boolean);

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        links.forEach((l) => l.classList.remove('page-navigation__list__item__link--selected'));
        document
          .querySelector(`.page-navigation__list__item__link[data-nav-id="${entry.target.id}"]`)
          ?.classList.add('page-navigation__list__item__link--selected');

        const match = navItems.find((n) => n.id === entry.target.id);
        if (match && currentLabel) currentLabel.textContent = match.label;
      });
    },
    { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
  );

  sections.forEach((s) => sectionObserver.observe(s));
}

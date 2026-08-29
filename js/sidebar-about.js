import { sidebarLabel, txt } from './i18n.js';
import { UI } from './ui-strings.js';
import { formatPhoneDisplay, phoneTelHref } from './contact-footer.js';

/** IBM Carbon — logo--instagram */
const INSTAGRAM_ICON = `
  <svg focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor"
    width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16,9.8378A6.1622,6.1622,0,1,0,22.1622,16,6.1622,6.1622,0,0,0,16,9.8378ZM16,20a4,4,0,1,1,4-4A4,4,0,0,1,16,20Z"></path>
    <path d="M16,6.1622c3.2041,0,3.5837.0122,4.849.07a6.6418,6.6418,0,0,1,2.2283.4132,3.9748,3.9748,0,0,1,2.2774,2.2774,6.6418,6.6418,0,0,1,.4132,2.2283c.0577,1.2653.07,1.6449.07,4.849s-.0122,3.5837-.07,4.849a6.6418,6.6418,0,0,1-.4132,2.2283,3.9748,3.9748,0,0,1-2.2774,2.2774,6.6418,6.6418,0,0,1-2.2283.4132c-1.2652.0577-1.6446.07-4.849.07s-3.5838-.0122-4.849-.07a6.6418,6.6418,0,0,1-2.2283-.4132,3.9748,3.9748,0,0,1-2.2774-2.2774,6.6418,6.6418,0,0,1-.4132-2.2283c-.0577-1.2653-.07-1.6449-.07-4.849s.0122-3.5837.07-4.849a6.6418,6.6418,0,0,1,.4132-2.2283A3.9748,3.9748,0,0,1,8.9227,6.6453a6.6418,6.6418,0,0,1,2.2283-.4132c1.2653-.0577,1.6449-.07,4.849-.07M16,4c-3.259,0-3.6677.0138-4.9476.0722A8.8068,8.8068,0,0,0,8.14,4.63,6.1363,6.1363,0,0,0,4.63,8.14a8.8068,8.8068,0,0,0-.5578,2.9129C4.0138,12.3323,4,12.741,4,16s.0138,3.6677.0722,4.9476A8.8074,8.8074,0,0,0,4.63,23.8605a6.1363,6.1363,0,0,0,3.51,3.51,8.8068,8.8068,0,0,0,2.9129.5578C12.3323,27.9862,12.741,28,16,28s3.6677-.0138,4.9476-.0722a8.8074,8.8074,0,0,0,2.9129-.5578,6.1363,6.1363,0,0,0,3.51-3.51,8.8074,8.8074,0,0,0,.5578-2.9129C27.9862,19.6677,28,19.259,28,16s-.0138-3.6677-.0722-4.9476A8.8068,8.8068,0,0,0,27.37,8.14a6.1363,6.1363,0,0,0-3.51-3.5095,8.8074,8.8074,0,0,0-2.9129-.5578C19.6677,4.0138,19.259,4,16,4Z"></path>
    <circle cx="22.406" cy="9.594" r="1.44"></circle>
  </svg>`;

/** IBM Carbon — logo--linkedin */
const LINKEDIN_ICON = `
  <svg focusable="false" preserveAspectRatio="xMidYMid meet" fill="currentColor"
    width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M26.21 4H5.79A1.8 1.8 0 0 0 4 5.79V26.2a1.8 1.8 0 0 0 1.79 1.79H26.2A1.8 1.8 0 0 0 28 26.21V5.79A1.8 1.8 0 0 0 26.21 4zM11.11 24.41H7.59V13h3.52zm-1.76-13a2.04 2.04 0 1 1 0-4.08 2.04 2.04 0 0 1 0 4.08zM24.41 24.41h-3.51v-5.55c0-1.32 0-3-1.84-3s-2.12 1.44-2.12 2.92v5.63h-3.52V13h3.37v1.56h.05a3.7 3.7 0 0 1 3.33-1.84c3.57 0 4.22 2.35 4.22 5.39z"></path>
  </svg>`;

/** @param {string} value */
function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** @param {string} text @param {string} name */
function highlightName(text, name) {
  if (!text || !name || !text.includes(name)) return text;
  const mark = `<span class="text-gradient-blue sidebar-about__name">${name}</span>`;
  return text.split(name).join(mark);
}

/**
 * @param {object} about
 * @param {import('./i18n.js').Locale} locale
 * @returns {string}
 */
export function renderSidebarAboutHtml(about, locale) {
  if (!about) return '';

  const label = sidebarLabel('about', locale);
  const imageSrc = about.sidebarImage || 'assets/images/about.png';
  const imageAlt = txt(about.sidebarImageAlt, locale) || txt({ zh: '钱加义', en: 'Jiayi Qian' }, locale);
  const name = txt(about.sidebarName, locale) || 'Jiayi';
  const greeting = highlightName(txt(about.sidebarGreeting, locale), name);
  const summary = txt(about.sidebarSummary, locale);
  const moreLabel = txt(UI.sidebarMoreAbout, locale);
  const instagramLabel = txt(UI.sidebarInstagram, locale);
  const linkedinLabel = txt(UI.sidebarLinkedIn, locale);
  const instagramUrl = about.instagram || '';
  const linkedinUrl = about.linkedin || '';

  const socials = [
    instagramUrl &&
      `<a class="sidebar-about__social" href="${escapeAttr(instagramUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(instagramLabel)}">${INSTAGRAM_ICON}</a>`,
    linkedinUrl &&
      `<a class="sidebar-about__social" href="${escapeAttr(linkedinUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(linkedinLabel)}">${LINKEDIN_ICON}</a>`,
  ]
    .filter(Boolean)
    .join('');

  const socialsHtml = socials ? `<div class="sidebar-about__socials">${socials}</div>` : '';

  const email = about.email || '';
  const phone = about.phone || '';
  const contactItems = [
    email &&
      `<a class="sidebar-about__contact-link" href="mailto:${escapeAttr(email)}">${escapeAttr(email)}</a>`,
    phone &&
      `<a class="sidebar-about__contact-link" href="${escapeAttr(phoneTelHref(phone))}">${escapeAttr(formatPhoneDisplay(phone))}</a>`,
  ].filter(Boolean);
  const contactHtml = contactItems.length
    ? `<div class="sidebar-about__contact">${contactItems.join('')}</div>`
    : '';

  const collapsed = document.body?.dataset?.page === 'blog';

  return `
    <li class="page-navigation__section page-navigation__section--about">
      <button type="button" class="page-navigation__section-toggle" aria-expanded="${collapsed ? 'false' : 'true'}"
              aria-controls="sidebar-about">
        <span>${label}</span>
        <svg class="page-navigation__chevron${collapsed ? ' page-navigation__chevron--collapsed' : ''}" focusable="false" preserveAspectRatio="xMidYMid meet"
          fill="currentColor" width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 10L26 20H6z"></path>
        </svg>
      </button>
      <div class="sidebar-about page-navigation__sublist${collapsed ? ' page-navigation__sublist--collapsed' : ''}" id="sidebar-about" role="region"
           aria-label="${label}">
        <img class="sidebar-about__photo" src="${imageSrc}" alt="${imageAlt}" width="758" height="968"
             loading="lazy" decoding="async" />
        ${greeting ? `<p class="sidebar-about__hello">${greeting}</p>` : ''}
        ${summary ? `<p class="sidebar-about__summary">${summary}</p>` : ''}
        ${contactHtml}
        ${socialsHtml}
        <button type="button" class="sidebar-about__link about-more-link">${moreLabel}</button>
      </div>
    </li>`;
}

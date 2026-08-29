import { txt } from './i18n.js';
import { UI } from './ui-strings.js';

/** @param {string} phone */
export function formatPhoneDisplay(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return phone || '';
}

/** @param {string} phone */
export function phoneTelHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11) return `tel:+86${digits}`;
  return digits ? `tel:${digits}` : '';
}

/** @param {object} data @param {import('./i18n.js').Locale} locale */
export function renderContactFooter(data, locale) {
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
      label: contact.email,
      external: false,
      mono: true,
    },
    contact.phone && {
      href: phoneTelHref(contact.phone),
      label: formatPhoneDisplay(contact.phone),
      external: false,
      mono: true,
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
        <a class="site-footer__link${link.mono ? ' site-footer__link--mono' : ''}" href="${link.href}"${link.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>
          ${link.label}
        </a>`
        )
        .join('')
    : '';

  const footerRole = document.getElementById('footer-role');
  if (footerRole) footerRole.textContent = txt(UI.footerRole, locale);
}

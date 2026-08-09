const STORAGE_KEY = 'portfolio-locale';

/** @typedef {'zh' | 'en'} Locale */

/** @returns {Locale} */
export function getLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'zh') return saved;
  return 'zh';
}

/** @param {Locale} locale */
export function setLocale(locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
}

/**
 * @param {string | { zh?: string, en?: string } | undefined} value
 * @param {Locale} locale
 */
export function txt(value, locale) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.zh ?? '';
}

/** Sidebar nav labels */
export const SIDEBAR = {
  overview: { zh: '概览', en: 'Overview' },
  experience: { zh: '经历', en: 'Experience' },
  skills: { zh: '我的用户旅程', en: 'My Journey' },
  about: { zh: '关于', en: 'About' },
  writing: { zh: '写作', en: 'Writing' },
};

/** @param {keyof typeof SIDEBAR} key @param {Locale} locale */
export function sidebarLabel(key, locale) {
  return txt(SIDEBAR[key], locale);
}

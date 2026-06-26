// Sticky site header: brand (logo + title + slogan) on the left, in-page tab menu in the
// middle (anchor-style links that switch tabs without reloading), Edit button on the right.

import { el } from '../util.js';
import { brandLogo, icon } from '../assets/icons.js';

export function buildHeader(config, opts = {}) {
  const h = config.header || {};
  const logo = h.logoData
    ? el('span', { class: 'ap-brand__logo' }, [el('img', { src: h.logoData, alt: h.title || 'Logo' })])
    : el('span', { class: 'ap-brand__logo' }, [brandLogo(40)]);

  const hasText = !!(h.title || h.slogan);
  const brand = el('div', { class: 'ap-brand' + (opts.editing ? ' ap-editable' : '') }, [
    logo,
    hasText ? el('div', { class: 'ap-brand__text' }, [
      h.title ? el('span', { class: 'ap-brand__name', text: h.title }) : null,
      h.slogan ? el('span', { class: 'ap-brand__slogan', text: h.slogan }) : null,
    ]) : null,
    opts.editing ? el('span', { class: 'ap-edit-tag', text: 'header' }) : null,
  ]);
  if (opts.editing) brand.addEventListener('click', () => opts.onEditHeader?.());

  const tabItems = (config.tabs || []).map((t) =>
    el('button', { class: 'ap-nav__link' + (t.id === opts.activeTabId ? ' is-active' : ''),
      dataset: { tab: t.id }, text: (config.header?.menu?.find((m) => m.tab === t.id)?.label) || t.title,
      onClick: () => opts.onNav?.(t.id) }));
  const urlItems = (config.header?.menuLinks || []).filter((l) => l.label).map((l) =>
    el('a', { class: 'ap-nav__link', href: l.href || '#', target: l.newTab === false ? null : '_blank', rel: 'noopener', text: l.label }));
  const nav = el('nav', { class: 'ap-nav', id: 'ap-nav' }, [...tabItems, ...urlItems]);

  const actions = el('div', { class: 'ap-header__actions' }, [
    opts.onToggleTheme
      ? el('button', { class: 'ap-btn ap-btn--icon', 'aria-label': 'Toggle dark / light', title: 'Toggle dark / light',
          onClick: () => opts.onToggleTheme() }, [icon(opts.mode === 'dark' ? 'sun' : 'moon')])
      : null,
    el('button', { class: 'ap-btn ap-btn--icon ap-burger', 'aria-label': 'Menu',
      onClick: () => nav.classList.toggle('is-open') }, [icon('menu')]),
    !opts.editing
      ? el('button', { class: 'ap-btn ap-btn--primary', onClick: () => opts.onEdit?.() }, [icon('edit'), 'Edit'])
      : null,
  ]);

  return el('header', { class: 'ap-header' }, [brand, nav, actions]);
}

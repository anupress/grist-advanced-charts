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
  // The site name is the page's <h1>. Nothing else can be: hero headlines belong to a tab, and
  // every inactive tab is [hidden] — so on a tab without a hero the page had no top-level heading
  // at all, leaving heading navigation with nothing to start from. Styling is by class, so this
  // is a semantics change with no visual one, and the hero (now h2) still reads as the loudest
  // thing on the page.
  const brand = el('div', { class: 'ap-brand' + (opts.editing ? ' ap-editable' : '') }, [
    logo,
    hasText ? el('div', { class: 'ap-brand__text' }, [
      h.title ? el('h1', { class: 'ap-brand__name', text: h.title }) : null,
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
    // Re-read the tables behind this page without reloading the widget. Grist pushes no change
    // notification a custom widget can subscribe to, so the data a block shows is whatever was
    // fetched when the page was drawn — this is how you get today's numbers after editing rows in
    // the document next door, short of reloading the whole widget.
    opts.onRefresh && !opts.editing ? refreshButton(opts) : null,
    opts.onToggleTheme
      ? el('button', { class: 'ap-btn ap-btn--icon', 'aria-label': 'Toggle dark / light', title: 'Toggle dark / light',
          onClick: () => opts.onToggleTheme() }, [icon(opts.mode === 'dark' ? 'sun' : 'moon')])
      : null,
    el('button', { class: 'ap-btn ap-btn--icon ap-burger', 'aria-label': 'Menu',
      onClick: () => nav.classList.toggle('is-open') }, [icon('menu')]),
    !opts.editing ? editButton(opts) : null,
  ]);

  return el('header', { class: 'ap-header' }, [brand, nav, actions]);
}

// onEdit (startEdit in main.js) can take a while — it waits on Grist's own permission prompt,
// which renders outside this widget's iframe and is easy to miss. Without feedback here, a
// click that's actually in flight looks identical to a click that silently failed. Disabling
// the button and swapping its label makes "your click registered, we're waiting on something"
// visible even when that something is happening off-screen.
// Spins while the fetch is in flight and reports the outcome, because a button that re-reads data
// and then draws exactly the same numbers is indistinguishable from one that did nothing.
function refreshButton(opts) {
  const btn = el('button', { class: 'ap-btn ap-btn--icon ap-refresh', 'aria-label': 'Refresh data', title: 'Refresh data from your tables' }, [icon('refresh')]);
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('is-spinning');
    try { await opts.onRefresh(); } finally {
      // A successful refresh re-renders the whole header, so this button is gone by now; only
      // reset it when it is somehow still on the page (a failed fetch, no rows to reload).
      if (btn.isConnected) { btn.disabled = false; btn.classList.remove('is-spinning'); }
    }
  });
  return btn;
}

function editButton(opts) {
  const btn = el('button', { class: 'ap-btn ap-btn--primary' }, [icon('edit'), 'Edit']);
  btn.addEventListener('click', async () => {
    if (btn.disabled || !opts.onEdit) return;
    btn.disabled = true;
    btn.textContent = 'Opening…';
    try {
      await opts.onEdit();
    } finally {
      // If onEdit succeeded, this header is torn down by the switch into the builder UI and
      // the button is no longer in the document — only reset it when we're still showing it
      // (consent declined, access denied, etc.).
      if (btn.isConnected) { btn.disabled = false; btn.replaceChildren(icon('edit'), 'Edit'); }
    }
  });
  return btn;
}

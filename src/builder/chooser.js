// The "Add Element" picker — a categorized, searchable, icon-tile grid with a per-tile (i) help
// popover, modeled on Elementor's Elements panel but adapted to this app's block model (no
// generic "Layout/Container" category — there's no section-container primitive here).
//
// Knows nothing about tabs/working-config/etc: it only offers a block *type* back to the caller
// via onPick, plus onGuided for the existing "not sure? let me help" wizard entry point and
// onTemplates for the industry template picker. New block types (later phases) just need an
// entry in block-catalog.js — nothing here needs to change as the catalog grows.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, ghostBtn, infoButton } from './ui.js';
import { CATEGORIES, BLOCK_CATALOG } from './block-catalog.js';

export function openBlockChooser({ onPick, onGuided, onTemplates }) {
  let query = '';
  render();

  function render() {
    openDrawer({ title: 'Add Element', body: body(), footer: [ghostBtn('Cancel', () => closeDrawer())] });
    document.querySelector('.ap-el-search')?.focus();
  }

  function body() {
    const guided = el('button', { class: 'ap-addtile ap-addtile--wizard', onClick: () => onGuided() }, [
      el('span', { class: 'ap-addtile__icon' }, [icon('sparkles')]),
      el('div', { class: 'ap-addtile__text' }, [
        el('div', { class: 'ap-addtile__title', text: 'Not sure? Let me help' }),
        el('div', { class: 'ap-addtile__desc', text: 'A guided 3-step wizard — great if you don\'t know statistics' }),
      ]),
    ]);
    const templatesLink = el('button', { class: 'ap-el-templink', onClick: () => onTemplates() }, [
      icon('copy'), el('span', { text: 'Or start a whole page from an industry template' }),
    ]);

    const search = el('input', { class: 'ap-input ap-el-search', type: 'search', placeholder: 'Search elements…', value: query });
    const list = el('div', { class: 'ap-el-categories' });
    search.addEventListener('input', () => { query = search.value; refreshList(); });

    function refreshList() {
      const q = query.trim().toLowerCase();
      const matches = (b) => !q || b.title.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q);
      const sections = CATEGORIES.map((cat) => categorySection(cat, matches)).filter(Boolean);
      list.replaceChildren(...(sections.length ? sections : [el('div', { class: 'ap-muted', style: { padding: '10px 2px' }, text: 'No elements match your search.' })]));
    }
    refreshList();

    return el('div', { style: { display: 'grid', gap: '14px' } }, [
      guided,
      templatesLink,
      el('div', { class: 'ap-addtile-sep' }, ['or pick a specific element']),
      search,
      el('div', { class: 'ap-el-legend' }, [
        el('span', { class: 'ap-el-legend__star', text: '★' }),
        el('span', { text: 'Starred elements are the ones most pages start with' }),
      ]),
      list,
    ]);
  }

  function categorySection(cat, matches) {
    const items = BLOCK_CATALOG.filter((b) => b.category === cat.id && matches(b));
    if (!items.length) return null;
    return el('details', { class: 'ap-el-cat', open: true }, [
      el('summary', { class: 'ap-el-cat__head' }, [
        el('span', { class: 'ap-el-cat__label', text: cat.label }),
        el('span', { class: 'ap-el-cat__count', text: String(items.length) }),
      ]),
      el('div', { class: 'ap-el-grid' }, items.map(tile)),
    ]);
  }

  function tile(b) {
    const btn = el('button', {
      class: 'ap-eltile' + (b.star ? ' is-starred' : ''), title: b.star ? `${b.title} — a good place to start` : b.title,
      onClick: () => onPick(b.type),
    }, [
      // A star on the handful of blocks most pages are actually built from, so a newcomer facing
      // twenty-four tiles has an obvious entry point. `title` carries the same cue for screen
      // readers, which cannot see the glyph.
      b.star ? el('span', { class: 'ap-eltile__star', 'aria-hidden': 'true', text: '★' }) : null,
      el('span', { class: 'ap-eltile__icon' }, [icon(b.icon)]),
      el('span', { class: 'ap-eltile__title', text: b.title }),
      el('span', { class: 'ap-eltile__desc', text: b.desc }),
    ]);
    // The (i) button is a sibling, not a child of the tile <button> — nesting an interactive
    // control inside another is invalid HTML and an accessibility anti-pattern (screen readers
    // announce it as "button within button"). Positioned via CSS instead (top-right corner).
    return el('div', { class: 'ap-eltile-wrap' }, [btn, infoButton(b.info)]);
  }
}

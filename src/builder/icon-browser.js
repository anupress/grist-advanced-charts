// The full icon library, as something to look through rather than something to query.
//
// The picker in the block editor is a search box: type a word, get matches. That is the fast path
// when you already know what you want, and useless when you do not — you cannot search for an idea
// you have not had yet. Five hundred glyphs are worth browsing, and a 420px drawer is not where
// that happens, so this is a full-window overlay: every category, every icon, names visible,
// with a jump list down the side.
//
// Deliberately a separate surface from the drawer that opened it. The drawer keeps its state and
// is still there underneath, so choosing an icon here returns you to the block you were editing
// rather than starting again.

import { el, debounce } from '../util.js';
import { icon, ICON_CATEGORIES, ICON_SEARCH_TERMS, allIconNames } from '../assets/icons.js';

/**
 * @param {object} opts
 * @param {string|null} opts.current  the icon name currently chosen, highlighted on open
 * @param {(name: string) => void} opts.onPick  called with the chosen name; the overlay closes
 */
export function openIconBrowser(opts = {}) {
  const { current = null, onPick } = opts;

  // One at a time. Opening a second would stack two dialogs and leave the first unreachable.
  document.querySelectorAll('.ap-iconbrowser').forEach((n) => n.remove());

  const state = { query: '', group: null };
  const grid = el('div', { class: 'ap-ib__body' });
  const countEl = el('span', { class: 'ap-muted', style: { fontSize: '12px' } });

  const search = el('input', {
    class: 'ap-input ap-ib__search', type: 'search',
    placeholder: `Search ${allIconNames().length} icons by name or by what they mean…`,
  });

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };

  function pick(name) {
    onPick?.(name);
    close();
  }

  // A tile carries its NAME as well as its glyph. In a 34px chip the name lives in a tooltip,
  // which is fine when you are confirming a guess and no help at all when you are browsing.
  function tile(name) {
    const btn = el('button', {
      class: 'ap-ib__tile' + (name === current ? ' is-active' : ''), type: 'button', title: name,
    }, [
      el('span', { class: 'ap-ib__glyph' }, [icon(name)]),
      el('span', { class: 'ap-ib__name', text: name }),
    ]);
    btn.addEventListener('click', () => pick(name));
    return btn;
  }

  function visibleGroups() {
    const q = state.query.trim().toLowerCase();
    return ICON_CATEGORIES
      .filter((c) => !state.group || c.id === state.group)
      .map((c) => ({
        ...c,
        icons: !q ? c.icons : c.icons.filter((n) =>
          n.toLowerCase().includes(q) || (ICON_SEARCH_TERMS[n] || '').toLowerCase().includes(q)),
      }))
      .filter((c) => c.icons.length);
  }

  function draw() {
    const groups = visibleGroups();
    const total = groups.reduce((n, g) => n + g.icons.length, 0);
    grid.replaceChildren();

    if (!total) {
      grid.append(el('div', { class: 'ap-ib__empty' }, [
        el('div', { style: { fontWeight: 700, marginBottom: '4px' }, text: `Nothing matches “${state.query}”` }),
        el('div', { class: 'ap-muted', text: 'Try a broader word — most icons answer to several.' }),
      ]));
    }
    for (const g of groups) {
      grid.append(
        // id on the heading is what the side list scrolls to.
        el('h3', { class: 'ap-ib__group', id: 'ap-ib-' + g.id }, [
          el('span', { text: g.name }),
          el('span', { class: 'ap-ib__groupn', text: String(g.icons.length) }),
        ]),
        el('div', { class: 'ap-ib__grid' }, g.icons.map(tile)),
      );
    }
    countEl.textContent = state.query || state.group
      ? `${total} icon${total === 1 ? '' : 's'}`
      : `${allIconNames().length} icons in ${ICON_CATEGORIES.length} categories`;
    drawNav();
  }

  const nav = el('nav', { class: 'ap-ib__nav', 'aria-label': 'Icon categories' });
  function drawNav() {
    const all = el('button', { class: 'ap-ib__navitem' + (state.group ? '' : ' is-active'), type: 'button', text: 'All categories' });
    all.addEventListener('click', () => { state.group = null; draw(); grid.scrollTop = 0; });
    nav.replaceChildren(all, ...ICON_CATEGORIES.map((c) => {
      const b = el('button', { class: 'ap-ib__navitem' + (state.group === c.id ? ' is-active' : ''), type: 'button' }, [
        el('span', { text: c.name }),
        el('span', { class: 'ap-ib__navn', text: String(c.icons.length) }),
      ]);
      b.addEventListener('click', () => {
        // With no filter on, jump to the heading; a filtered view scrolls to its own top instead,
        // because the heading may not be rendered.
        if (state.query) { state.group = c.id; draw(); grid.scrollTop = 0; return; }
        state.group = null;
        draw();
        document.getElementById('ap-ib-' + c.id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
      return b;
    }));
  }

  search.addEventListener('input', debounce(() => {
    state.query = search.value;
    draw();
    grid.scrollTop = 0;
  }, 110));

  const closeBtn = el('button', { class: 'ap-btn ap-btn--icon ap-btn--ghost', 'aria-label': 'Close', onClick: close }, [icon('close')]);

  const overlay = el('div', {
    class: 'ap-iconbrowser', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Icon library',
  }, [
    el('div', { class: 'ap-ib__panel' }, [
      el('div', { class: 'ap-ib__head' }, [
        el('div', { class: 'ap-ib__title' }, [icon('sparkles'), el('span', { text: 'Icon library' })]),
        search,
        countEl,
        closeBtn,
      ]),
      el('div', { class: 'ap-ib__main' }, [nav, grid]),
    ]),
  ]);

  // Clicking the backdrop closes; clicking inside the panel must not.
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  }
  document.addEventListener('keydown', onKey);

  document.body.appendChild(overlay);
  draw();
  // Focus the search so typing works immediately, without stealing the scroll position.
  setTimeout(() => search.focus({ preventScroll: true }), 0);
  return { close };
}

// Live Data Table block: a client-side searchable/sortable/paginated browser over a table's raw
// rows. Rows are already primed by the time blocks render (see data/provider.js's
// tablesInConfig), so — unlike Counter/Image/Testimonials — this needs no lazy-mount pass; all
// its interactivity (search/sort/page) is self-contained DOM event wiring set up once here.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';

// Spreadsheet-style column letters -> 0-indexed column position ("A"->0, "Z"->25, "AA"->26).
function colLetterToIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// "A1:A9, B3, B4:B7, C1" -> Set of "col,row" keys (both 0-indexed). Column = position among the
// table's *currently shown* columns (left to right); row = position in the table's natural,
// as-loaded order — not the current sorted/searched view — so a highlight stays attached to the
// same data cell even after a viewer sorts or searches, instead of jumping to whatever row now
// happens to sit in that visual slot.
export function parseCellRanges(text) {
  const cells = new Set();
  for (const part of String(text || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^([A-Za-z]+)(\d+)(?::([A-Za-z]+)(\d+))?$/);
    if (!m) continue;
    const c1 = colLetterToIndex(m[1]), r1 = parseInt(m[2], 10) - 1;
    const c2 = m[3] ? colLetterToIndex(m[3]) : c1;
    const r2 = m[4] ? parseInt(m[4], 10) - 1 : r1;
    const cMin = Math.min(c1, c2), cMax = Math.max(c1, c2), rMin = Math.min(r1, r2), rMax = Math.max(r1, r2);
    for (let c = cMin; c <= cMax; c++) for (let r = rMin; r <= rMax; r++) cells.add(c + ',' + r);
  }
  return cells;
}

// A highlight only ever set a background, leaving the cell to inherit the theme's text colour.
// That reads fine in light mode and is close to invisible in dark, where near-white text lands on
// a pale pastel swatch. Deriving the foreground from the swatch's OWN luminance fixes it for both
// modes and for any colour a user picks, rather than hard-coding a dark-mode palette that would
// still break the moment someone chose a dark highlight.
//
// Relative luminance per WCAG 2.x; the 0.45 split is a little above the formal 0.179 crossover
// because these swatches are pastels and dark ink on them reads better than white.
export function readableOn(bg) {
  const raw = String(bg || '').trim().replace(/^#/, '');
  const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null; // named colour or rgb() — leave the text alone
  const chan = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(chan[0]) + 0.7152 * lin(chan[1]) + 0.0722 * lin(chan[2]);
  return L > 0.45 ? '#161923' : '#f7f8fc';
}

// Later groups paint over earlier ones where ranges overlap — simple "layers" model, matches
// how a user would expect a second highlight added afterward to take visual precedence.
function buildHighlightMap(highlights) {
  const map = new Map();
  for (const h of highlights || []) {
    if (!h?.ranges) continue;
    const color = h.color || '#fff3b0';
    for (const key of parseCellRanges(h.ranges)) map.set(key, color);
  }
  return map;
}

export function renderLiveTable(block, ctx) {
  const c = block.config || {};
  const allCols = ctx.provider.columns(c.table) || [];
  const cols = c.columns?.length ? allCols.filter((col) => c.columns.includes(col.id)) : allCols;
  const allRows = ctx.provider.records(c.table) || [];
  const searchable = c.searchable !== false;
  const sortable = c.sortable !== false;
  const pageSize = Math.max(1, Number(c.pageSize) || 10);
  const highlightMap = buildHighlightMap(c.highlights);
  // Row identity in "natural" (as-loaded) order, keyed by object reference — stable across
  // sort/search since those only filter/reorder this same array, never clone its row objects.
  const naturalRow = new Map(allRows.map((r, i) => [r, i]));

  const state = { query: '', sortCol: c.defaultSort?.column || null, sortDir: c.defaultSort?.dir || 'asc', page: 0 };

  function visibleRows() {
    let rows = allRows;
    if (state.query) {
      const q = state.query.toLowerCase();
      rows = rows.filter((r) => cols.some((col) => String(r[col.id] ?? '').toLowerCase().includes(q)));
    }
    if (state.sortCol) {
      const sc = state.sortCol, dir = state.sortDir === 'desc' ? -1 : 1;
      rows = [...rows].sort((a, b) => {
        const an = parseFloat(a[sc]), bn = parseFloat(b[sc]);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
        return String(a[sc] ?? '').localeCompare(String(b[sc] ?? '')) * dir;
      });
    }
    return rows;
  }

  const tbody = el('tbody');
  const pager = el('div', { class: 'ap-livetable__pager' });
  const theadRow = el('tr', {}, cols.map((col) => headerCell(col)));

  function headerCell(col) {
    const th = el('th', {}, [el('span', { text: col.label }), sortable ? icon('chevron', 'ap-livetable__sorticon') : null]);
    if (sortable) {
      th.classList.add('is-sortable');
      th.addEventListener('click', () => {
        if (state.sortCol === col.id) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortCol = col.id; state.sortDir = 'asc'; }
        state.page = 0;
        redraw();
      });
    }
    return th;
  }

  function redraw() {
    const rows = visibleRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, totalPages - 1);
    const pageRows = rows.slice(state.page * pageSize, (state.page + 1) * pageSize);

    tbody.replaceChildren(...(pageRows.length
      ? pageRows.map((r) => {
          const rowN = naturalRow.get(r);
          return el('tr', {}, cols.map((col, ci) => {
            const hl = highlightMap.size && rowN != null ? highlightMap.get(ci + ',' + rowN) : null;
            let style = null;
            if (hl) {
              style = { backgroundColor: hl };
              const fg = readableOn(hl);
              if (fg) style.color = fg; // keeps the text legible against the swatch in either mode
            }
            return el('td', { text: String(r[col.id] ?? ''), title: String(r[col.id] ?? ''), style });
          }));
        })
      : [el('tr', {}, [el('td', { class: 'ap-muted', colspan: String(cols.length || 1), text: 'No matching rows.' })])]));

    pager.replaceChildren(
      el('span', { class: 'ap-muted', text: `${rows.length} row${rows.length === 1 ? '' : 's'}` }),
      el('div', { class: 'ap-row' }, [
        el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-livetable__prev', 'aria-label': 'Previous page', disabled: state.page <= 0,
          onClick: () => { state.page--; redraw(); } }, [icon('chevron')]),
        el('span', { class: 'ap-livetable__pageno', text: `${state.page + 1} / ${totalPages}` }),
        el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-livetable__next', 'aria-label': 'Next page', disabled: state.page >= totalPages - 1,
          onClick: () => { state.page++; redraw(); } }, [icon('chevron')]),
      ]),
    );

    [...theadRow.children].forEach((th, i) => {
      const isSorted = cols[i]?.id === state.sortCol;
      th.classList.toggle('is-sorted', isSorted);
      if (isSorted) th.dataset.dir = state.sortDir; else delete th.dataset.dir;
    });
  }

  const searchInput = searchable ? el('input', { class: 'ap-input ap-livetable__search', type: 'search', placeholder: 'Search…' }) : null;
  if (searchInput) searchInput.addEventListener('input', () => { state.query = searchInput.value; state.page = 0; redraw(); });

  redraw();

  const table = el('table', { class: 'ap-livetable__table' }, [el('thead', {}, [theadRow]), tbody]);
  return el('div', { class: 'ap-card ap-livetable', dataset: { blockId: block.id } }, [
    (c.title || searchInput) ? el('div', { class: 'ap-livetable__head' }, [
      c.title ? el('div', { class: 'ap-livetable__title', text: c.title }) : el('span'),
      searchInput,
    ]) : null,
    el('div', { class: 'ap-livetable__scroll' }, [table]),
    pager,
  ]);
}

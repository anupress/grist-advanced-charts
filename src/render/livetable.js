// Live Data Table block: a client-side searchable/sortable/paginated browser over a table's raw
// rows. Rows are already primed by the time blocks render (see data/provider.js's
// tablesInConfig), so — unlike Counter/Image/Testimonials — this needs no lazy-mount pass; all
// its interactivity (search/sort/page) is self-contained DOM event wiring set up once here.

import { el, debounce } from '../util.js';
import { icon, brandLogo } from '../assets/icons.js';
import { isDateColumn } from '../grist/dates.js';

// Tolerates the separators people actually have in their data — "1,200", "$1,200", "45%", "(300)"
// for a negative in accounting style. parseFloat stopped at the first comma and read "1,200" as 1.
function toNumber(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).trim();
  const parenNegative = /^\((.*)\)$/.exec(s);
  if (parenNegative) s = '-' + parenNegative[1];
  s = s.replace(/[^0-9.eE+-]/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

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
  // maxRows caps the table at the top N. Nothing sets it in a normal design — it exists for the
  // printable layout, where "the top 20 by value" is a document and all 3,000 rows is a phone
  // book. Applied before search and sort so the cap means "the first N of the table", which is
  // what someone picking a row count is actually asking for.
  const maxRows = Number(c.maxRows) > 0 ? Number(c.maxRows) : 0;
  const sourceRows = ctx.provider.records(c.table) || [];
  const allRows = maxRows ? sourceRows.slice(0, maxRows) : sourceRows;
  const searchable = c.searchable !== false;
  const sortable = c.sortable !== false;
  const pageSize = Math.max(1, Number(c.pageSize) || 10);
  const highlightMap = buildHighlightMap(c.highlights);
  // Row identity in "natural" (as-loaded) order, keyed by object reference — stable across
  // sort/search since those only filter/reorder this same array, never clone its row objects.
  const naturalRow = new Map(allRows.map((r, i) => [r, i]));

  const state = { query: '', sortCol: c.defaultSort?.column || null, sortDir: c.defaultSort?.dir || 'asc', page: 0, printing: false };

  function visibleRows() {
    let rows = allRows;
    if (state.query) {
      const q = state.query.toLowerCase();
      rows = rows.filter((r) => cols.some((col) => String(r[col.id] ?? '').toLowerCase().includes(q)));
    }
    if (state.sortCol) {
      const dir = state.sortDir === 'desc' ? -1 : 1;
      const key = comparatorFor(state.sortCol);
      rows = [...rows].sort((a, b) => key(a, b) * dir);
    }
    return rows;
  }

  // Sorting used to try parseFloat on each value and fall back to a string compare. That reads
  // "2026-11-30" as the number 2026, so every date in a year compared equal and sorting by date --
  // the most likely thing anyone does here -- silently did nothing. It also read "1,200" as 1,
  // sorting a formatted thousand below 35. Deciding once per COLUMN from its declared type, rather
  // than per value, fixes both and makes the comparator consistent instead of mixing two orderings
  // within one sort.
  function comparatorFor(colId) {
    const type = allCols.find((c) => c.id === colId)?.type || '';
    const blankLast = (av, bv) => (av === bv ? 0 : av ? 1 : -1); // blanks sort to the end either way

    if (isDateColumn(type)) {
      // Dates arrive as 'YYYY-MM-DD', which sorts correctly as text — but only once blanks are
      // separated out, and only comparing whole strings rather than a numeric prefix.
      return (a, b) => {
        const av = String(a[colId] ?? ''), bv = String(b[colId] ?? '');
        if (!av || !bv) return blankLast(!av, !bv);
        return av < bv ? -1 : av > bv ? 1 : 0;
      };
    }

    if (/^(Numeric|Int|Currency)/i.test(type)) {
      return (a, b) => {
        const an = toNumber(a[colId]), bn = toNumber(b[colId]);
        if (an == null || bn == null) return blankLast(an == null, bn == null);
        return an - bn;
      };
    }

    // Text and anything untyped. `numeric: true` gives a natural order, so "item 2" precedes
    // "item 10" and version-ish strings behave, without the old numeric/string split.
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return (a, b) => {
      const av = String(a[colId] ?? ''), bv = String(b[colId] ?? '');
      if (!av || !bv) return blankLast(!av, !bv);
      return collator.compare(av, bv);
    };
  }

  // Numbers belong on the right, where their digits line up and a column can be scanned for
  // magnitude. It matters most on paper, where there is no scrolling to help. Declared before
  // theadRow below, which calls headerCell() immediately — a const is in its temporal dead zone
  // until its own line runs, so declaring it after would throw on the first render.
  const isNumeric = (type) => /^(Numeric|Int|Currency)/i.test(type || '');
  const numCols = new Set(allCols.filter((col) => isNumeric(col.type)).map((col) => col.id));

  const tbody = el('tbody');
  const pager = el('div', { class: 'ap-livetable__pager' });
  const theadRow = el('tr', {}, cols.map((col) => headerCell(col)));

  // A sortable header used to be a <th> with a click handler: mouse-only, absent from the tab
  // order, and with nothing telling a screen reader which column was sorted or which way. The
  // control is a real <button> now, so it is focusable and operable by Enter/Space for free, and
  // the <th> carries aria-sort, which is the attribute assistive tech actually reads for this.
  // scope="col" ties the header to its column in a block whose whole point is tabular data.
  function headerCell(col) {
    const label = el('span', { text: col.label });
    const numCls = numCols.has(col.id) ? ' is-num' : '';
    if (!sortable) return el('th', { scope: 'col', class: numCls.trim() || null }, [label]);

    const btn = el('button', { type: 'button', class: 'ap-livetable__sortbtn' },
      [label, icon('chevron', 'ap-livetable__sorticon')]);
    btn.addEventListener('click', () => {
      if (state.sortCol === col.id) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortCol = col.id; state.sortDir = 'asc'; }
      state.page = 0;
      redraw();
    });
    return el('th', { scope: 'col', class: 'is-sortable' + numCls }, [btn]);
  }

  function redraw() {
    const rows = visibleRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(state.page, totalPages - 1);
    // On paper the pager is meaningless — there is nothing to click — so printing gets every row.
    // The print stylesheet could only ever style what was in the DOM, and that was one page of
    // ten, so "Print / Save as PDF" on a 200-row ledger produced a ten-row document that looked
    // deliberate. Search is still honoured: printing a filtered view prints the filtered rows.
    const pageRows = state.printing ? rows : rows.slice(state.page * pageSize, (state.page + 1) * pageSize);

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
            return el('td', { class: numCols.has(col.id) ? 'is-num' : null,
              text: String(r[col.id] ?? ''), title: String(r[col.id] ?? ''), style });
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
      // aria-sort belongs on the header cell, not the button, and only the sorted one carries it.
      if (isSorted) th.setAttribute('aria-sort', state.sortDir === 'desc' ? 'descending' : 'ascending');
      else if (sortable) th.setAttribute('aria-sort', 'none');
    });
  }

  const searchInput = searchable ? el('input', { class: 'ap-input ap-livetable__search', type: 'search', placeholder: 'Search…' }) : null;
  if (searchInput) {
    // Debounced: redrawing on every keystroke re-filtered and re-sorted the whole table per
    // character, which is felt on any table big enough to want a search box in the first place.
    const apply = debounce(() => { state.query = searchInput.value; state.page = 0; redraw(); }, 120);
    searchInput.addEventListener('input', apply);
  }

  redraw();

  const isLivePage = ctx.edit === null;

  // A masthead that exists only on paper.
  //
  // Printing the page around this table produced three sheets of dashboard — hero, charts and all,
  // with the chart canvases rasterised in — when what was wanted was the ledger. Isolating the
  // table fixes that but leaves a bare grid with no indication of what it is, so the printed sheet
  // gets a header of its own: the same mark and name the site header shows, the table's title, and
  // when it was run. A ledger that leaves the building has to say what it is and when it was true.
  const brand = ctx.config?.header || {};
  const reportHead = el('div', { class: 'ap-livetable__report' }, [
    el('div', { class: 'ap-livetable__reportbrand' }, [
      el('span', { class: 'ap-livetable__reportlogo' },
        [brand.logoData ? el('img', { src: brand.logoData, alt: '' }) : brandLogo(34)]),
      el('span', { class: 'ap-livetable__reportname', text: brand.title || '' }),
    ]),
    el('div', { class: 'ap-livetable__reportmeta' }, [
      el('div', { class: 'ap-livetable__reporttitle', text: c.title || c.table || 'Report' }),
      el('div', { class: 'ap-livetable__reportdate' }),
    ]),
  ]);
  const stampReport = () => {
    const d = new Date();
    const when = `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}`;
    const shown = visibleRows().length;
    const filtered = state.query ? ` · filtered on “${state.query}”` : '';
    reportHead.querySelector('.ap-livetable__reportdate').textContent =
      `${shown} row${shown === 1 ? '' : 's'}${filtered} · ${when}`;
  };

  const printBtn = isLivePage
    ? el('button', {
        class: 'ap-btn ap-btn--soft ap-btn--sm ap-livetable__print', type: 'button',
        title: 'Prints this table on its own — every row, without the rest of the page',
      }, [icon('download'), el('span', { text: 'Print table' })])
    : null;

  const table = el('table', { class: 'ap-livetable__table' }, [el('thead', {}, [theadRow]), tbody]);
  const card = el('div', { class: 'ap-card ap-livetable', dataset: { blockId: block.id } }, [
    reportHead,
    (c.title || searchInput || printBtn) ? el('div', { class: 'ap-livetable__head' }, [
      c.title ? el('div', { class: 'ap-livetable__title', text: c.title }) : el('span'),
      searchInput,
      printBtn,
    ]) : null,
    el('div', { class: 'ap-livetable__scroll' }, [table]),
    pager,
  ]);

  // Same isolation the Invoice block uses: mark this block, let the print stylesheet hide the
  // rest, and clear up afterwards — including on a timer, since a cancelled dialog does not
  // reliably fire afterprint everywhere and a page stuck in print-only mode looks broken.
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const root = document.getElementById('anupress-root') || document.body;
      const wrapper = card.closest('.ap-block') || card;
      wrapper.classList.add('is-printtarget');
      root.setAttribute('data-print-only', '1');
      const clear = () => {
        root.removeAttribute('data-print-only');
        wrapper.classList.remove('is-printtarget');
        window.removeEventListener('afterprint', clear);
      };
      window.addEventListener('afterprint', clear);
      setTimeout(clear, 60000);
      window.print();
    });
  }

  // Expand to every row for the duration of the print, then put the pager back.
  //
  // The listeners are on window because that is where the events fire, and they un-register
  // themselves once the card leaves the document — a tab switch or a re-render would otherwise
  // leave one behind per table, redrawing detached nodes on every subsequent print.
  const onBefore = () => {
    if (!card.isConnected) { window.removeEventListener('beforeprint', onBefore); window.removeEventListener('afterprint', onAfter); return; }
    state.printing = true; redraw();
    stampReport(); // the row count and the timestamp are only true at the moment of printing
  };
  const onAfter = () => {
    if (!card.isConnected) { window.removeEventListener('beforeprint', onBefore); window.removeEventListener('afterprint', onAfter); return; }
    state.printing = false; redraw();
  };
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  card._apPrintAll = { onBefore, onAfter }; // exposed for the tests

  return card;
}

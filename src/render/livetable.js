// Live Data Table block: a client-side searchable/sortable/paginated browser over a table's raw
// rows. Rows are already primed by the time blocks render (see data/provider.js's
// tablesInConfig), so — unlike Counter/Image/Testimonials — this needs no lazy-mount pass; all
// its interactivity (search/sort/page) is self-contained DOM event wiring set up once here.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';

export function renderLiveTable(block, ctx) {
  const c = block.config || {};
  const allCols = ctx.provider.columns(c.table) || [];
  const cols = c.columns?.length ? allCols.filter((col) => c.columns.includes(col.id)) : allCols;
  const allRows = ctx.provider.records(c.table) || [];
  const searchable = c.searchable !== false;
  const sortable = c.sortable !== false;
  const pageSize = Math.max(1, Number(c.pageSize) || 10);

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
      ? pageRows.map((r) => el('tr', {}, cols.map((col) => el('td', { text: String(r[col.id] ?? ''), title: String(r[col.id] ?? '') }))))
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

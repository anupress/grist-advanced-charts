// Editing the DATA behind a block, not the block's settings.
//
// Every block editor until now configured how a block reads a table — which column, which
// aggregation, what colour. None of them let you fix the number that was wrong. That meant
// leaving the widget, finding the table in Grist, finding the row, and coming back, which is a
// long way to go to correct a typo you are looking straight at.
//
// Scope is deliberately narrow, and the narrowness is the feature:
//
//   • Edit mode only. A published page stays read-only, so a dashboard you share with a client or
//     put on a wall display cannot be rewritten by whoever opens it.
//   • Edit cells and append rows. No delete — a mis-click here would destroy real data, and our
//     undo would be far weaker than the document history Grist already keeps.
//   • Formula columns render read-only. Grist rejects writes to them, so offering an input that
//     fails on save would be a lie told by the UI. Reference columns are read-only for the same
//     reason from the other direction: they hold a row id, and free text is not one.
//
// Writes go through bridge.saveRows(), which sends everything as ONE action bundle so the whole
// edit is a single undoable step in the document's history rather than one per cell.

import { el, clone, toast, debounce, formatCellValue, isStructuredType } from '../util.js';
import { icon } from '../assets/icons.js';
import * as bridge from '../grist/bridge.js';
import { isDateColumn } from '../grist/dates.js';
import { openDrawer, closeDrawer, subhead, primaryBtn, ghostBtn } from './ui.js';

// How many rows the grid shows at once. A table can be tens of thousands of rows and this is a
// correction tool, not a spreadsheet — paging keeps the DOM sane and the intent honest.
const PAGE = 25;

// Columns holding a structured value rather than text: a Reference (a row id), a Reference List, a
// Choice List, an Attachments cell (all Grist's ['L', …] tuple). There is nothing sensible to type
// into any of them. Left editable, this grid would send the string "2" for a column expecting the
// integer 2, or the literal text "Urgent, Billable" for one expecting a list — writing a broken
// cell into someone's real table, which is the one thing this editor is not allowed to do.
// Read-only until there is a picker for each; the labels one would need are already resolved.
const isRefType = (t) => isStructuredType(t);

/**
 * Rows narrowed by a free-text search and by per-column value filters, then ordered.
 *
 * Pure and exported so the rules can be tested without a DOM: which rows survive a filter is the
 * part that silently loses someone's data if it is wrong.
 *
 *   query   — matches any cell, as typed.
 *   filters — { colId: Set(displayValue) }. A column with a set keeps only rows whose displayed
 *             value is in it; an ABSENT or empty set means that column filters nothing. Multiple
 *             columns combine with AND, values within one column with OR, which is what a
 *             spreadsheet autofilter does and therefore what people expect.
 *   sort    — { col, dir }. Numbers and dates compare as themselves; everything else compares as
 *             text with a natural order, so "row 2" precedes "row 10".
 */
export function applyView(rows, cols, { query = '', filters = {}, sort = null, display = String } = {}) {
  let out = rows;

  // Reference columns are matched on the label, everything else on the raw value. Narrow on
  // purpose: a Ref cell holds a row id, so searching a client's name could never match it and the
  // filter list offered a choice between "1", "2" and "3". Formatting the OTHER types here would
  // desynchronise the filter list from the inputs beside it, which still show raw text — a numeric
  // column would offer "1,234" while its cell reads 1234.
  const colOf = (id) => cols.find((c) => c.id === id) || null;
  const cellText = (v, col) => (col && isRefType(col.type) ? formatCellValue(v, col) : (v == null ? '' : String(v)));

  const q = String(query || '').trim().toLowerCase();
  if (q) out = out.filter((r) => cols.some((c) => cellText(r[c.id], c).toLowerCase().includes(q)));

  for (const [colId, allowed] of Object.entries(filters)) {
    if (!allowed || !allowed.size) continue;
    const col = colOf(colId);
    out = out.filter((r) => allowed.has(col && isRefType(col.type) ? cellText(r[colId], col) : display(r[colId])));
  }

  if (sort?.col) {
    const col = cols.find((c) => c.id === sort.col);
    const dir = sort.dir === 'desc' ? -1 : 1;
    const numeric = col && /^(Numeric|Int|Currency)/i.test(col.type || '');
    const temporal = col && isDateColumn(col.type);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    out = [...out].sort((a, b) => {
      const av = a[sort.col], bv = b[sort.col];
      // Blanks sort last whichever way the column is pointing: an empty cell is not a small value,
      // it is an absent one, and burying them under a descending sort hides the rows most likely
      // to need filling in.
      const ae = av == null || av === '', be = bv == null || bv === '';
      if (ae || be) return ae && be ? 0 : (ae ? 1 : -1);
      if (numeric || temporal) {
        const an = Number(av), bn = Number(bv);
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      }
      // A reference sorts by the name shown, not the row id behind it — otherwise clicking the
      // Client heading appears to shuffle the rows at random.
      return collator.compare(cellText(av, col), cellText(bv, col)) * dir;
    });
  }
  return out;
}

/** The distinct values in a column, in the order a person would scan them. */
export function distinctValues(rows, colId, display = String, col = null) {
  const seen = new Map();
  for (const r of rows) {
    // Same rule as applyView: a reference offers its label, so the two agree on what a value IS.
    const v = col && isRefType(col.type) ? formatCellValue(r[colId], col) : display(r[colId]);
    seen.set(v, (seen.get(v) || 0) + 1);
  }
  return [...seen.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      // Blank last, then most common first — the values worth filtering on are rarely the rare ones.
      if (!a.value !== !b.value) return a.value ? -1 : 1;
      return b.count - a.count || String(a.value).localeCompare(String(b.value));
    });
}

const isNumericType = (t) => /^(Numeric|Int|Currency)/i.test(t || '');
const isBoolType = (t) => /^Bool/i.test(t || '');

/**
 * Why some columns in this grid cannot be typed into.
 *
 * Two different reasons, and saying the wrong one is worse than saying nothing: a formula column is
 * read-only because Grist computes it, a reference because it points at another table's row. The
 * sentence is assembled rather than templated so neither reason is claimed about the other.
 */
export function lockedNote(formulaCount, refCount) {
  const parts = [];
  if (formulaCount) parts.push(`${formulaCount} calculated column${formulaCount === 1 ? '' : 's'}`);
  if (refCount) parts.push(`${refCount} reference or list column${refCount === 1 ? '' : 's'}`);
  if (!parts.length) return '';
  const subject = parts.join(' and ');
  const plural = formulaCount + refCount > 1;
  const why = formulaCount && refCount
    ? 'Grist computes the first from your formulas; the others hold values a text box cannot produce.'
    : formulaCount
      ? `Grist computes ${formulaCount === 1 ? 'it' : 'them'} from your formulas.`
      : `Change ${refCount === 1 ? 'it' : 'them'} in Grist, where the values can be picked.`;
  return `${subject} ${plural ? 'are' : 'is'} shown read-only. ${why}`;
}

// What to send to Grist for a typed column. Grist stores numbers as numbers and dates as epoch
// seconds; handing it the raw string from an <input> would store text into a numeric column and
// quietly break every aggregation reading it.
function coerce(value, col) {
  const raw = value == null ? '' : String(value).trim();
  if (raw === '') return null;
  if (isBoolType(col.type)) return raw === 'true' || raw === '1' || raw === 'yes';
  if (isNumericType(col.type)) {
    const n = Number(raw.replace(/[^0-9.eE+-]/g, ''));
    return isFinite(n) ? n : null;
  }
  if (isDateColumn(col.type)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000; // Grist stores a Date as UTC midnight
  }
  return raw;
}

// The inverse, for putting a stored value back into an input.
const display = (v) => (v == null ? '' : String(v));

/**
 * opts: { provider, table, onSaved }
 * Opens over whatever drawer is showing; the caller reopens itself from onSaved.
 */
export function openDataEditor(opts) {
  const { provider, table } = opts;
  const cols = (provider.columns(table) || []).filter((c) => c.id !== 'id');
  const rows = clone(provider.records(table) || []);

  // rowId -> { colId: newValue }. Only what actually changed is sent.
  const edits = new Map();
  // Rows typed into the blank row at the bottom, not yet written.
  const additions = [];
  // filters: colId -> Set of displayed values kept. sort: { col, dir }. Both are view-only — they
  // never touch `edits`, so narrowing the table to find a row and then correcting it still saves
  // every other pending change with it.
  const state = { page: 0, query: '', filters: {}, sort: null, full: false };

  const editable = (col) => !col.isFormula && !isRefType(col.type);
  const dirtyCount = () => [...edits.values()].reduce((n, f) => n + Object.keys(f).length, 0) + additions.length;

  const grid = el('div', { class: 'ap-dataedit__grid' });
  const status = el('div', { class: 'ap-dataedit__status ap-muted' });
  const pager = el('div', { class: 'ap-dataedit__pager' });
  let saveBtn = null;
  let searchBox = null;

  function refreshStatus(shown) {
    const n = dirtyCount();
    const narrowed = shown != null && shown !== rows.length;
    // The row count has to say when it is not the whole table. Someone who filters to three rows
    // and reads "3 rows" walks away believing their table has three rows in it.
    const scope = narrowed
      ? `${shown} of ${rows.length} rows shown`
      : `${rows.length} row${rows.length === 1 ? '' : 's'}`;
    status.textContent = n
      ? `${n} unsaved change${n === 1 ? '' : 's'} · ${scope}`
      : `${scope} · editing writes straight to ${table}`;
    status.classList.toggle('is-dirty', n > 0);
    if (saveBtn) saveBtn.disabled = n === 0;
  }

  function matching() {
    return applyView(rows, cols, { query: state.query, filters: state.filters, sort: state.sort, display });
  }

  // Rows that survive every filter EXCEPT this column's own. A spreadsheet filter list shows what
  // is still reachable given the other filters, but must not hide the values you have already
  // ticked in this column — those would vanish from their own list the moment they were chosen.
  function rowsForFilterList(colId) {
    const others = { ...state.filters };
    delete others[colId];
    return applyView(rows, cols, { query: state.query, filters: others, display });
  }

  const activeFilters = () => Object.values(state.filters).filter((s) => s && s.size).length;

  function cellInput(row, col) {
    const current = edits.get(row.id)?.[col.id];
    const value = current !== undefined ? current : row[col.id];

    if (!editable(col)) {
      const why = isRefType(col.type)
        ? 'Holds a reference or a list — change it in Grist, where its values can be picked'
        : 'Calculated in Grist — edit the formula there';
      // formatCellValue rather than display(): a locked cell that reads "Meridian Biotech" tells
      // you what is in the row, and one that reads "2" tells you nothing.
      return el('div', { class: 'ap-dataedit__cell is-locked', title: why, text: formatCellValue(value, col) });
    }
    const input = el('input', {
      class: 'ap-dataedit__input',
      type: isDateColumn(col.type) ? 'date' : (isNumericType(col.type) ? 'text' : 'text'),
      value: display(value),
      'aria-label': `${col.label}, row ${row.id}`,
    });
    input.addEventListener('input', () => {
      const original = display(row[col.id]);
      const now = input.value;
      let fields = edits.get(row.id);
      if (now === original) {
        // Typed back to what it was — stop counting it as a change rather than writing a no-op.
        if (fields) { delete fields[col.id]; if (!Object.keys(fields).length) edits.delete(row.id); }
      } else {
        if (!fields) { fields = {}; edits.set(row.id, fields); }
        fields[col.id] = now;
      }
      input.classList.toggle('is-changed', now !== original);
      refreshStatus();
    });
    return input;
  }

  // The blank row at the bottom: type into it and it becomes a real row on save. Only one is
  // offered at a time, so a stray keystroke cannot leave a trail of empty records behind.
  function newRow() {
    const draft = {};
    const cells = cols.map((col) => {
      if (!editable(col)) return el('div', { class: 'ap-dataedit__cell is-locked', text: '—' });
      const input = el('input', { class: 'ap-dataedit__input', type: isDateColumn(col.type) ? 'date' : 'text',
        placeholder: col.label, 'aria-label': `New row, ${col.label}` });
      input.addEventListener('input', () => {
        if (input.value.trim() === '') delete draft[col.id]; else draft[col.id] = input.value;
        const has = Object.keys(draft).length > 0;
        if (has && !additions.includes(draft)) additions.push(draft);
        if (!has) { const i = additions.indexOf(draft); if (i >= 0) additions.splice(i, 1); }
        refreshStatus();
      });
      return input;
    });
    return el('div', { class: 'ap-dataedit__row is-new' }, [
      el('div', { class: 'ap-dataedit__rowno', title: 'New row' }, [icon('plus')]),
      ...cells,
    ]);
  }

  /**
   * A column heading that sorts and filters.
   *
   * The label is a real <button> so it is reachable by keyboard and announces its sort state;
   * the funnel beside it is a second button, because "order by this" and "show only these" are
   * different intentions and merging them into one click makes both harder to reach.
   */
  function headerCell(col) {
    const sorted = state.sort?.col === col.id;
    const filtered = state.filters[col.id]?.size > 0;

    const label = el('button', {
      class: 'ap-dataedit__sortbtn', type: 'button',
      title: `Sort by ${col.label}`,
    }, [
      el('span', { text: col.label }),
      col.isFormula ? icon('lock', 'ap-dataedit__lockicon') : null,
      sorted ? icon(state.sort.dir === 'desc' ? 'arrowDown' : 'arrowUp', 'ap-dataedit__sorticon') : null,
    ]);
    label.addEventListener('click', () => {
      // asc -> desc -> off. The third press restores the table's own order, which is the only way
      // back to it once a sort has been applied.
      if (!sorted) state.sort = { col: col.id, dir: 'asc' };
      else if (state.sort.dir === 'asc') state.sort = { col: col.id, dir: 'desc' };
      else state.sort = null;
      state.page = 0;
      redraw();
    });

    const funnel = el('button', {
      class: 'ap-dataedit__filterbtn' + (filtered ? ' is-on' : ''), type: 'button',
      title: filtered ? `Filtered — ${state.filters[col.id].size} value(s)` : `Filter ${col.label}`,
      'aria-label': `Filter ${col.label}`,
    }, [icon('filter2')]);
    funnel.addEventListener('click', (e) => { e.stopPropagation(); openFilter(col, funnel); });

    const cell = el('div', {
      class: 'ap-dataedit__cell ap-dataedit__th' + (col.isFormula ? ' is-locked' : '') + (filtered ? ' is-filtered' : ''),
      'aria-sort': sorted ? (state.sort.dir === 'desc' ? 'descending' : 'ascending') : 'none',
    }, [label, funnel]);
    return cell;
  }

  /** The value list for one column: tick what to keep. */
  function openFilter(col, anchor) {
    document.querySelectorAll('.ap-dataedit__filterpop').forEach((n) => n.remove());
    const chosen = new Set(state.filters[col.id] || []);
    const values = distinctValues(rowsForFilterList(col.id), col.id, display, col);

    const list = el('div', { class: 'ap-dataedit__filterlist' });
    const find = el('input', { class: 'ap-input ap-input--sm', type: 'search', placeholder: `Search ${values.length} values…` });

    const drawList = () => {
      const q = find.value.trim().toLowerCase();
      const shown = q ? values.filter((v) => v.value.toLowerCase().includes(q)) : values;
      list.replaceChildren(...(shown.length ? shown.map(({ value, count }) => {
        const box = el('input', { type: 'checkbox', checked: chosen.has(value) });
        box.addEventListener('change', () => { box.checked ? chosen.add(value) : chosen.delete(value); });
        return el('label', { class: 'ap-dataedit__filteritem' }, [
          box,
          el('span', { class: 'ap-dataedit__filterval', text: value === '' ? '(blank)' : value }),
          el('span', { class: 'ap-dataedit__filtercount', text: String(count) }),
        ]);
      }) : [el('div', { class: 'ap-muted', style: { padding: '8px 4px', fontSize: '12px' }, text: 'No values match.' })]));
    };
    find.addEventListener('input', debounce(drawList, 90));
    drawList();

    const apply = () => {
      // An empty selection means "no filter on this column", not "show nothing" — a filter that
      // can hide every row is a trap, and unticking everything is how people clear one.
      if (chosen.size) state.filters[col.id] = chosen; else delete state.filters[col.id];
      state.page = 0;
      pop.remove();
      redraw();
    };

    const pop = el('div', { class: 'ap-dataedit__filterpop' }, [
      el('div', { class: 'ap-dataedit__filterhead', text: col.label }),
      find,
      el('div', { class: 'ap-row', style: { gap: '6px', margin: '6px 0' } }, [
        el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', type: 'button', text: 'All',
          onClick: () => { values.forEach((v) => chosen.add(v.value)); drawList(); } }),
        el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', type: 'button', text: 'None',
          onClick: () => { chosen.clear(); drawList(); } }),
      ]),
      list,
      el('div', { class: 'ap-dataedit__filterfoot' }, [
        el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', type: 'button', text: 'Cancel', onClick: () => pop.remove() }),
        el('button', { class: 'ap-btn ap-btn--primary ap-btn--sm', type: 'button', text: 'Apply', onClick: apply }),
      ]),
    ]);
    pop.addEventListener('mousedown', (e) => e.stopPropagation());

    anchor.closest('.ap-dataedit__cell')?.appendChild(pop);
    // Nudge back inside the grid if the column sits near the right edge.
    setTimeout(() => {
      const r = pop.getBoundingClientRect(), host = grid.getBoundingClientRect();
      if (r.right > host.right - 4) pop.style.left = `${Math.max(-r.width + 30, host.right - 4 - r.right)}px`;
    }, 0);
    setTimeout(() => find.focus({ preventScroll: true }), 0);
  }

  function redraw() {
    const list = matching();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE));
    state.page = Math.min(state.page, totalPages - 1);
    const slice = list.slice(state.page * PAGE, (state.page + 1) * PAGE);

    const header = el('div', { class: 'ap-dataedit__row ap-dataedit__row--head' }, [
      el('div', { class: 'ap-dataedit__rowno' }),
      ...cols.map((c) => headerCell(c)),
    ]);

    grid.style.setProperty('--ap-de-cols', String(cols.length));
    grid.replaceChildren(
      header,
      ...slice.map((r) => el('div', { class: 'ap-dataedit__row' }, [
        el('div', { class: 'ap-dataedit__rowno', text: String(r.id) }),
        ...cols.map((c) => cellInput(r, c)),
      ])),
      // The append row belongs on the last page, where the end of the data is.
      state.page === totalPages - 1 ? newRow() : null,
    );

    pager.replaceChildren(
      el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm', 'aria-label': 'Previous page', disabled: state.page <= 0,
        onClick: () => { state.page--; redraw(); } }, [icon('chevron')]),
      el('span', { class: 'ap-muted', text: `${state.page + 1} / ${totalPages}` }),
      el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm', 'aria-label': 'Next page', disabled: state.page >= totalPages - 1,
        onClick: () => { state.page++; redraw(); } }, [icon('chevron')]),
    );
    drawToolbar();
    refreshStatus(list.length);
  }

  // Sits above the grid: full screen, and a way out of whatever narrowing is in force. The reset
  // only appears when there is something to reset, so it is never a control that does nothing.
  const toolbar = el('div', { class: 'ap-dataedit__toolbar' });
  function drawToolbar() {
    const nF = activeFilters();
    const full = el('button', { class: 'ap-btn ap-btn--soft ap-btn--sm', type: 'button' },
      [icon(state.full ? 'collapse' : 'fullscreen'), state.full ? 'Exit full screen' : 'Full screen']);
    full.addEventListener('click', () => {
      state.full = !state.full;
      document.querySelector('.ap-drawer')?.classList.toggle('ap-drawer--full', state.full);
      drawToolbar();
    });

    const bits = [full];
    if (nF || state.sort || state.query) {
      const reset = el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', type: 'button' },
        [icon('close'), 'Clear view']);
      reset.addEventListener('click', () => {
        state.filters = {}; state.sort = null; state.query = ''; state.page = 0;
        if (searchBox) searchBox.value = '';
        redraw();
      });
      bits.push(reset);
      bits.push(el('span', { class: 'ap-muted', style: { fontSize: '11.5px' }, text:
        [nF ? `${nF} filter${nF === 1 ? '' : 's'}` : null,
          state.sort ? `sorted by ${cols.find((c) => c.id === state.sort.col)?.label || state.sort.col}` : null,
          state.query ? 'searching' : null].filter(Boolean).join(' · ') }));
    }
    toolbar.replaceChildren(...bits);
  }

  async function save() {
    if (!provider.isLive) {
      toast('Demo mode — connect a Grist document to save data changes.', 'err');
      return;
    }
    const updates = [...edits.entries()].map(([id, fields]) => {
      const byId = Object.fromEntries(cols.map((c) => [c.id, c]));
      const out = {};
      for (const [colId, raw] of Object.entries(fields)) out[colId] = coerce(raw, byId[colId] || {});
      return { id, fields: out };
    });
    const adds = additions.map((draft) => {
      const byId = Object.fromEntries(cols.map((c) => [c.id, c]));
      const out = {};
      for (const [colId, raw] of Object.entries(draft)) out[colId] = coerce(raw, byId[colId] || {});
      return out;
    });

    saveBtn.disabled = true;
    const res = await bridge.saveRows(table, { updates, additions: adds });
    if (!res.ok) {
      toast('Could not save — your changes are still here, nothing was written.', 'err');
      saveBtn.disabled = false;
      return;
    }
    // Re-read rather than patching the local copy: formulas recompute on write, so the row that
    // comes back is frequently not the row we sent.
    try { await provider.refresh(table); } catch { /* the toast below is still accurate */ }
    const parts = [];
    if (res.updated) parts.push(`${res.updated} row${res.updated === 1 ? '' : 's'} updated`);
    if (res.added) parts.push(`${res.added} row${res.added === 1 ? '' : 's'} added`);
    toast(parts.length ? parts.join(', ') + ` in ${table}` : 'Nothing to save', 'ok');
    closeDrawer();
    opts.onSaved?.();
  }

  const search = el('input', { class: 'ap-input', type: 'search', placeholder: 'Find a row…' });
  searchBox = search;
  search.addEventListener('input', debounce(() => { state.query = search.value; state.page = 0; redraw(); }, 120));
  // A click anywhere else closes an open filter list, the way a menu does.
  document.addEventListener('mousedown', () => document.querySelectorAll('.ap-dataedit__filterpop').forEach((n) => n.remove()));

  const formulaCount = cols.filter((c) => c.isFormula).length;
  const refCount = cols.filter((c) => !c.isFormula && isRefType(c.type)).length;
  const lockedCount = formulaCount + refCount;
  const body = [
    el('div', { class: 'ap-trust' }, [
      el('div', {}, [
        el('strong', { text: `Editing ${table} directly` }),
        el('div', { text: 'Changes are written to your Grist table when you press Save, as one undoable step. '
          + 'Rows can be corrected and added here; deleting stays in Grist, where the document history is.' }),
      ]),
    ]),
    lockedCount ? el('div', { class: 'ap-muted', style: { fontSize: '12px', margin: '0 0 10px' },
      text: lockedNote(formulaCount, refCount) }) : null,
    search,
    toolbar,
    grid,
    pager,
    status,
  ];

  saveBtn = primaryBtn('Save to ' + table, 'check', save);
  saveBtn.disabled = true;
  redraw();
  openDrawer({
    title: 'Edit data',
    body,
    footer: [ghostBtn('Cancel', () => { closeDrawer(); opts.onCancel?.(); }), saveBtn],
    wide: true,
  });
}

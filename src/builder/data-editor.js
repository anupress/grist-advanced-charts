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
//     fails on save would be a lie told by the UI.
//
// Writes go through bridge.saveRows(), which sends everything as ONE action bundle so the whole
// edit is a single undoable step in the document's history rather than one per cell.

import { el, clone, toast, debounce } from '../util.js';
import { icon } from '../assets/icons.js';
import * as bridge from '../grist/bridge.js';
import { isDateColumn } from '../grist/dates.js';
import { openDrawer, closeDrawer, subhead, primaryBtn, ghostBtn } from './ui.js';

// How many rows the grid shows at once. A table can be tens of thousands of rows and this is a
// correction tool, not a spreadsheet — paging keeps the DOM sane and the intent honest.
const PAGE = 25;

const isNumericType = (t) => /^(Numeric|Int|Currency)/i.test(t || '');
const isBoolType = (t) => /^Bool/i.test(t || '');

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
  const state = { page: 0, query: '' };

  const editable = (col) => !col.isFormula;
  const dirtyCount = () => [...edits.values()].reduce((n, f) => n + Object.keys(f).length, 0) + additions.length;

  const grid = el('div', { class: 'ap-dataedit__grid' });
  const status = el('div', { class: 'ap-dataedit__status ap-muted' });
  const pager = el('div', { class: 'ap-dataedit__pager' });
  let saveBtn = null;

  function refreshStatus() {
    const n = dirtyCount();
    status.textContent = n
      ? `${n} unsaved change${n === 1 ? '' : 's'}`
      : `${rows.length} row${rows.length === 1 ? '' : 's'} · editing writes straight to ${table}`;
    status.classList.toggle('is-dirty', n > 0);
    if (saveBtn) saveBtn.disabled = n === 0;
  }

  function matching() {
    if (!state.query) return rows;
    const q = state.query.toLowerCase();
    return rows.filter((r) => cols.some((c) => String(r[c.id] ?? '').toLowerCase().includes(q)));
  }

  function cellInput(row, col) {
    const current = edits.get(row.id)?.[col.id];
    const value = current !== undefined ? current : row[col.id];

    if (!editable(col)) {
      return el('div', { class: 'ap-dataedit__cell is-locked', title: 'Calculated in Grist — edit the formula there', text: display(value) });
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

  function redraw() {
    const list = matching();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE));
    state.page = Math.min(state.page, totalPages - 1);
    const slice = list.slice(state.page * PAGE, (state.page + 1) * PAGE);

    const header = el('div', { class: 'ap-dataedit__row ap-dataedit__row--head' }, [
      el('div', { class: 'ap-dataedit__rowno' }),
      ...cols.map((c) => el('div', { class: 'ap-dataedit__cell ap-dataedit__th' + (c.isFormula ? ' is-locked' : '') },
        [el('span', { text: c.label }), c.isFormula ? icon('lock', 'ap-dataedit__lockicon') : null])),
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
    refreshStatus();
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
  search.addEventListener('input', debounce(() => { state.query = search.value; state.page = 0; redraw(); }, 120));

  const lockedCount = cols.filter((c) => c.isFormula).length;
  const body = [
    el('div', { class: 'ap-trust' }, [
      el('div', {}, [
        el('strong', { text: `Editing ${table} directly` }),
        el('div', { text: 'Changes are written to your Grist table when you press Save, as one undoable step. '
          + 'Rows can be corrected and added here; deleting stays in Grist, where the document history is.' }),
      ]),
    ]),
    lockedCount ? el('div', { class: 'ap-muted', style: { fontSize: '12px', margin: '0 0 10px' },
      text: `${lockedCount} calculated column${lockedCount === 1 ? ' is' : 's are'} shown read-only — Grist computes ${lockedCount === 1 ? 'it' : 'them'} from your formulas.` }) : null,
    search,
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

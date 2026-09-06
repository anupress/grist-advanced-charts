// A glance at a table while choosing one.
//
// Every data block starts with "which table?", and a name is a thin thing to choose on: Members,
// People, Contacts, Team — which one has the email column, which one has rows at all? This panel
// answers that without leaving the picker. Hover (or arrow onto) a table and the left side of the
// page shows its columns with their types and the first few rows, read from the same provider the
// blocks read from. It is a look, not a control: pointer-events are off, so the mouse can travel
// over it without stealing the hover from the list that opened it.
//
// The model is pure so a test can hold it against the demo tables; only show/hide touch the DOM.

import { el, formatCellValue } from '../util.js';

export const PEEK_ROWS = 6;
export const PEEK_COLS = 8;

/** Grist column types in the words a reader uses. */
export function friendlyType(type) {
  const t = String(type || '');
  const ref = t.match(/^Ref(List)?:(.+)$/i);
  if (ref) return (ref[1] ? 'Refs → ' : 'Ref → ') + ref[2];
  if (/^Ref(List)?$/i.test(t)) return t.startsWith('RefList') ? 'Refs' : 'Ref';
  if (/^(Int|Numeric|Number)/i.test(t)) return 'Number';
  if (/^Currency/i.test(t)) return 'Currency';
  if (/^DateTime/i.test(t)) return 'Date & time';
  if (/^Date/i.test(t)) return 'Date';
  if (/^Bool/i.test(t)) return 'Yes/no';
  if (/^ChoiceList/i.test(t)) return 'Choices';
  if (/^Choice/i.test(t)) return 'Choice';
  if (/^Attachments/i.test(t)) return 'Files';
  if (/^Text/i.test(t)) return 'Text';
  return t || 'Any';
}

/**
 * What the panel shows for one table, or null when the provider has no such table.
 * Cells go through formatCellValue, so references read as the names they point at.
 */
export function peekModel(provider, tableId, { maxRows = PEEK_ROWS, maxCols = PEEK_COLS } = {}) {
  const t = (provider.tables() || []).find((x) => x.id === tableId);
  if (!t) return null;
  const cols = provider.columns(tableId) || [];
  const rows = provider.records(tableId) || [];
  const shown = cols.slice(0, maxCols);
  return {
    id: tableId,
    label: t.label || t.id,
    rowCount: rows.length,
    colCount: cols.length,
    columns: shown.map((c) => ({ id: c.id, label: c.label || c.id, type: friendlyType(c.type) })),
    moreCols: cols.length - shown.length,
    rows: rows.slice(0, maxRows).map((r) => shown.map((c) => formatCellValue(r[c.id], c))),
  };
}

// ---- DOM ----
let host = null;
let showing = null;   // table id currently on screen
let load = 0;         // guards a slow prime() against a hover that has since moved on

function ensureHost() {
  if (host && host.isConnected) return host;
  host = el('div', { class: 'ap-peek', 'aria-hidden': 'true' });
  document.body.appendChild(host);
  return host;
}

// The whole space beside the drawer: from the left edge to the drawer, from under the edit bar to
// the bottom. A card in the corner showed six rows of eight columns and left most of the page
// visible behind it, which read as a tooltip; the question is "what is in this table?", and the
// honest answer is as much of it as fits. Returns how many rows and columns that is, or false on
// a viewport too narrow to leave room beside the drawer.
const HEAD_PX = 48, FOOT_PX = 34, THEAD_PX = 46, ROW_PX = 33, COL_PX = 118;
function place(node) {
  const drawer = document.querySelector('.ap-drawer');
  const bar = document.querySelector('.ap-editbar');
  const top = bar ? bar.getBoundingClientRect().bottom : 0;
  const width = (drawer ? drawer.getBoundingClientRect().left : window.innerWidth);
  const height = window.innerHeight - top;
  if (width < 320 || height < 200) return false;
  Object.assign(node.style, { left: '0px', top: top + 'px', width: width + 'px', height: height + 'px' });
  return {
    maxRows: Math.max(3, Math.min(60, Math.floor((height - HEAD_PX - FOOT_PX - THEAD_PX) / ROW_PX))),
    maxCols: Math.max(4, Math.min(16, Math.floor(width / COL_PX))),
  };
}

function render(node, m, note) {
  const head = el('div', { class: 'ap-peek__head' }, [
    el('div', { class: 'ap-peek__name', text: m.label }),
    el('div', { class: 'ap-peek__meta', text: `${m.rowCount} row${m.rowCount === 1 ? '' : 's'} · ${m.colCount} column${m.colCount === 1 ? '' : 's'}` }),
  ]);
  const table = el('table', { class: 'ap-peek__table' }, [
    el('thead', {}, [el('tr', {}, m.columns.map((c) => el('th', {}, [el('span', { text: c.label }), el('span', { class: 'ap-peek__type', text: c.type })])))]),
    el('tbody', {}, m.rows.map((r) => el('tr', {}, r.map((v) => el('td', { text: v, title: v }))))),
  ]);
  const foot = [];
  if (note) foot.push(note);
  else if (!m.rowCount) foot.push('No rows in this table yet.');
  else if (m.rowCount > m.rows.length) foot.push(`Showing the first ${m.rows.length} of ${m.rowCount} rows.`);
  if (m.moreCols > 0) foot.push(`${m.moreCols} more column${m.moreCols === 1 ? '' : 's'} not shown.`);
  // replaceChildren(null) writes the text "null"; a table whose rows all fit has no footer at all.
  const parts = [head, el('div', { class: 'ap-peek__scroll' }, [table])];
  if (foot.length) parts.push(el('div', { class: 'ap-peek__foot', text: foot.join(' ') }));
  node.replaceChildren(...parts);
}

/** Show the snapshot for `tableId`; anything the provider does not know hides the panel. */
export function peekTable(provider, tableId) {
  const node = ensureHost();
  const fit = provider && tableId ? place(node) : false;
  const m = fit ? peekModel(provider, tableId, fit) : null;
  if (!m) { hidePeek(); return; }
  showing = tableId;
  const token = ++load;
  // A live table that has not been read yet has no rows to show. Ask for them and redraw if the
  // hover is still on the same table when they arrive.
  const pending = provider.isLive && !m.rowCount && typeof provider.prime === 'function';
  render(node, m, pending ? 'Loading rows…' : null);
  node.classList.add('is-open');
  if (pending) {
    Promise.resolve(provider.prime([tableId])).then(() => {
      if (token !== load || showing !== tableId) return;
      render(node, peekModel(provider, tableId, fit), null);
    }).catch(() => { /* the panel already shows the columns; rows can stay absent */ });
  }
}

export function hidePeek() {
  showing = null;
  load++;
  if (host) host.classList.remove('is-open');
}

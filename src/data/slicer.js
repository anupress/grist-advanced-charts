// Slicers: a block the READER uses to narrow every other block on the page.
//
// Asked for on the community thread as "something closer to a BI tool", and it is exactly that —
// the difference between a dashboard someone looks at and one they can ask a question of. Pick
// "North" and the KPI cards, the charts, the table and the map all answer for North.
//
// The whole design rests on one fact about this codebase: every block reads its rows through
// ctx.provider.records(table). A slicer therefore never has to know what a chart or a calendar is.
// It hands each block a provider whose records() returns fewer rows, and twenty-three block types
// are filtered without a line changing in any of them.
//
// THE HARD PART is not the chips, it is deciding which blocks a slicer should affect at all. The
// person who asked put his finger on it and proposed two rules; both are here, and they compose.
// For a slicer on column S.column of table S, against a block reading table T:
//
//   1. T is S            filter S.column directly.
//   2. T has S.column    a column with the same id — his "same name" rule. A Region on Sales
//                        narrows a Region on Targets, because that is what a person means.
//   3. S.column is a     the picked values are row ids of R, so filter R itself by id, and any
//      Ref:R             table with a Ref:R column by that column.
//   4. T points at S     T has a Ref:S column. "Country = DE" on Clients narrows Invoices through
//                        their Client reference — Grist's own "select by", his second idea.
//   5. otherwise         leave the block alone. A chart of an unrelated table stays whole.
//
// Rules 3 and 4 exist only because every column descriptor now carries `refTable`; a week ago
// there was nothing to follow.
//
// Several slicers combine with AND (each narrows further); values within one combine with OR. An
// empty selection is not a filter for "nothing", it is no filter at all, so a page opens whole.
//
// Selections are session state, held here rather than in the design. A reader's exploration is
// theirs for as long as the page is open, and must never be saved into the document as if the
// author had chosen it.

import { formatCategory } from '../util.js';
import { flattenBlocks } from './grid.js';

// ---- selection state ------------------------------------------------------------------------

const selections = new Map();   // slicer block id -> Set of String(value)

const key = (v) => String(v);

export function getSelection(blockId) { return selections.get(blockId) || new Set(); }
export function hasSelection(blockId) { return (selections.get(blockId)?.size || 0) > 0; }
export function setSelection(blockId, values) {
  const set = new Set([...values].map(key));
  if (set.size) selections.set(blockId, set); else selections.delete(blockId);
}
export function toggleValue(blockId, value, { multi = true } = {}) {
  const k = key(value);
  const cur = getSelection(blockId);
  if (!multi) { setSelection(blockId, cur.has(k) && cur.size === 1 ? [] : [k]); return; }
  const next = new Set(cur);
  if (next.has(k)) next.delete(k); else next.add(k);
  setSelection(blockId, next);
}
export function clearSelection(blockId) { selections.delete(blockId); }
export function clearAll() { selections.clear(); }

// ---- what a page opens with --------------------------------------------------------------------
//
// Two things can set a slicer before the reader touches it: the author's defaults
// (config.defaults, a list of values), and the reader's own last choice on this device
// (config.remember, kept in localStorage). The remembered choice wins when both exist, because
// it is the more recent decision; a remembered EMPTY choice is kept too, so clearing a default
// sticks until the page is reloaded elsewhere. Each is applied once per page load per slicer and
// never written into the design: the design says what the page starts with, not what someone did.

// Block id -> the defaults it was initialised with. Keyed on the settings, not just the id, so an
// author who adds a default in the editor and presses Done sees it take effect at once, while a
// plain redraw (new data, a tab switch) leaves the reader's current choice alone.
const initialised = new Map();
const STORE_PREFIX = 'ap-slicer:';

function storage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
// The choice is kept per document and dashboard (3.10.14). Keyed on the block id alone, a choice
// made in one document came back in every other one with a block of that id: a copy of the
// document, or a second dashboard copied from the first (the Glutbohne case study, chapter 12:
// the packing team's Late turned up already picked). main.js sets the scope once it knows both.
let rememberScope = () => '';
export function setRememberScope(fn) { rememberScope = typeof fn === 'function' ? fn : () => ''; }
function storeKey(blockId) {
  let scope = '';
  try { scope = String(rememberScope() || ''); } catch { /* no scope: the plain key */ }
  return STORE_PREFIX + (scope ? scope + ':' : '') + blockId;
}
function readRemembered(blockId, store) {
  try { const raw = store?.getItem(storeKey(blockId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function rememberSelection(blockId, store = storage()) {
  try { store?.setItem(storeKey(blockId), JSON.stringify([...getSelection(blockId)])); } catch { /* private mode, full, blocked */ }
}
export function forgetSelection(blockId, store = storage()) {
  try { store?.removeItem(storeKey(blockId)); } catch { /* same */ }
}

// readerChoice: false while the author edits. The editor shows the page as it opens, with the author's defaults picked (it used to
// show the whole table, so a Year slicer opening on 2026 sat over cards adding up every year: the Glutbohne case study, 3.10.8),
// but not a reader's remembered choice, which belongs to the published page.
export function applySlicerDefaults(tab, { store = storage(), force = false, readerChoice = true } = {}) {
  for (const b of flattenBlocks(tab?.blocks)) {
    if (b.type !== 'slicer') continue;
    const c = b.config || {};
    const signature = JSON.stringify([Array.isArray(c.defaults) ? c.defaults : null, !!c.remember && readerChoice]);
    const prev = initialised.get(b.id);
    if (prev === signature && !force) continue;
    initialised.set(b.id, signature);
    const remembered = c.remember && readerChoice ? readRemembered(b.id, store) : null;
    if (Array.isArray(remembered)) { setSelection(b.id, remembered); continue; }
    if (Array.isArray(c.defaults) && c.defaults.length) setSelection(b.id, c.defaults);
    // defaults taken away in the editor: the page opens whole again, rather than keeping the old pick
    else if (prev && JSON.parse(prev)[0]?.length) setSelection(b.id, []);
  }
}
export function resetSlicerDefaults() { initialised.clear(); }

// ---- value matching -------------------------------------------------------------------------

// Grist's list tuple ['L', a, b] is any-of; a scalar is itself; 0 is an empty reference.
function cellValues(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return (v[0] === 'L' ? v.slice(1) : v).filter((x) => x != null && x !== '');
  return [v];
}
const matcher = (wanted) => (cell) => cellValues(cell).some((x) => wanted.has(key(x)));

const isRef = (col) => !!col?.refTable;

/**
 * The predicate that applies a slicer to one table, or null if it does not apply.
 *
 * `base` is the UNFILTERED provider: rule 4 needs the slicer's own table whole to find which of
 * its rows were picked, and asking a filtered provider for that would be circular.
 */
export function resolveFilter(slicer, targetTable, targetCols, base) {
  const { table, column, values } = slicer;
  if (!table || !column || !values?.size || !targetTable) return null;
  const cols = targetCols || [];
  const want = matcher(values);

  // 1. Same table.
  if (targetTable === table) return (row) => want(row[column]);

  // 2. Same column id on another table.
  if (cols.some((c) => c.id === column)) return (row) => want(row[column]);

  // 3. The slicer column is a reference: the picked values are row ids of its target.
  const sCol = (base?.columns?.(table) || []).find((c) => c.id === column);
  if (isRef(sCol)) {
    const R = sCol.refTable;
    if (targetTable === R) return (row) => values.has(key(row.id));
    const via = cols.find((c) => c.refTable === R);
    if (via) return (row) => want(row[via.id]);
  }

  // 4. The target references the slicer's table: narrow through the reference.
  const back = cols.find((c) => c.refTable === table);
  if (back) {
    const sourceRows = base?.records?.(table) || [];
    const ids = new Set(sourceRows.filter((r) => want(r[column])).map((r) => key(r.id)));
    const viaIds = matcher(ids);
    return (row) => viaIds(row[back.id]);
  }

  return null;
}

/**
 * The slicers on a tab that should reach a given block, as {table, column, values} records.
 *
 * A slicer with an explicit `targets` list reaches only those blocks. One without reaches any block
 * the rules above can resolve — which is decided lazily, per table, inside filteredProvider, so a
 * block that reads two tables (an Invoice, say) gets the right answer for each.
 *
 * A slicer never filters itself, and slicers do not filter each other: the chips you have not
 * chosen yet should stay visible, or you could never widen a selection once narrowed.
 */
export function slicersFor(block, tab) {
  return flattenBlocks(tab?.blocks)
    .filter((b) => b.type === 'slicer' && b.id !== block.id && block.type !== 'slicer' && hasSelection(b.id))
    .filter((b) => !Array.isArray(b.config?.targets) || b.config.targets.includes(block.id))
    .map((b) => ({ id: b.id, table: b.config.table, column: b.config.column, values: getSelection(b.id) }));
}

/**
 * A provider that answers records() through the active slicers and delegates everything else.
 *
 * Built on the prototype chain rather than by copying methods, so a wrapper is a few bytes, is
 * made fresh per block per render, and stays correct if the provider grows a method tomorrow.
 * columns(), tables(), refresh() and the rest fall straight through to the real one.
 */
export function filteredProvider(base, slicers) {
  if (!slicers?.length) return base;
  const wrap = Object.create(base);
  wrap.baseProvider = base;
  wrap.records = (table) => {
    const rows = base.records(table) || [];
    const cols = base.columns(table) || [];
    const preds = slicers.map((s) => resolveFilter(s, table, cols, base)).filter(Boolean);
    return preds.length ? rows.filter((r) => preds.every((p) => p(r))) : rows;
  };
  return wrap;
}

/**
 * Which blocks on a tab a slicer would reach under the automatic rules — for the editor, so the
 * author can see the answer to "what does this filter?" before a reader ever asks it.
 */
export function affectedBlocks(slicerBlock, tab, base) {
  const c = slicerBlock.config || {};
  if (!c.table || !c.column) return [];
  // Any non-empty selection resolves the same set of tables; the value is not what decides reach.
  const probe = { table: c.table, column: c.column, values: new Set([' ']) };
  const out = [];
  for (const b of flattenBlocks(tab?.blocks)) {
    if (b.id === slicerBlock.id || b.type === 'slicer') continue;
    const t = b.config?.table;
    if (!t) continue;
    if (resolveFilter(probe, t, base.columns(t) || [], base)) out.push(b);
  }
  return out;
}

/**
 * A block just added to a page joins every slicer there that picks its blocks by hand (What it
 * filters, Choose) and would reach it. Choose stores the blocks that existed when it was set, so
 * a chart added afterwards was quietly left out: a Year slicer set to skip one monthly chart
 * stopped filtering every chart added after it, and the page showed this year's cards over
 * all-time charts (found building the Glutbohne case study, 3.10.4). Leaving one block out is
 * why anyone chooses; a new block is meant to follow the page, and can be unticked like any other.
 * Only for new blocks: one unticked on purpose and edited later stays out. Returns the slicers
 * that changed.
 */
export function joinChosenSlicers(block, tab, base) {
  if (!block || block.type === 'slicer') return [];
  const changed = [];
  for (const s of flattenBlocks(tab?.blocks)) {
    if (s.type !== 'slicer' || !Array.isArray(s.config?.targets)) continue;
    const add = affectedBlocks(s, { blocks: [block] }, base).map((b) => b.id).filter((id) => !s.config.targets.includes(id));
    if (!add.length) continue;
    s.config.targets = [...s.config.targets, ...add];
    changed.push(s);
  }
  return changed;
}

/**
 * The choices a slicer offers: each distinct value in its column, with a label and a count, from
 * the UNFILTERED table so the menu never shrinks to only what is already picked.
 */
// `keep` names values that must be offered whatever happens: the current selection. A picked value
// below the cut-off is added back with its real count; one that is not in the data at all (a
// default for last year's cohort, a reader's remembered choice after the rows changed, the same
// block id remembered from another document) comes back with a count of 0 and `missing` set. It
// still filters the page, so it has to stay visible and untickable: without this the page opened
// on "0 of 48 rows" with no chip lit and nothing to untick but Clear.
export function slicerOptions(base, table, column, { limit = 200, keep = null } = {}) {
  const col = (base.columns(table) || []).find((c) => c.id === column) || null;
  const counts = new Map();   // key -> { value, label, count }
  // 0 is Grist's empty reference and must not become a chip labelled "0". Only for references:
  // on a numeric column 0 is a perfectly real value that someone may well want to filter to.
  const skipZero = isRef(col);
  for (const row of base.records(table) || []) {
    for (const v of cellValues(row[column])) {
      if (skipZero && v === 0) continue;
      const k = key(v);
      const cur = counts.get(k);
      if (cur) cur.count++;
      else counts.set(k, { value: v, key: k, label: col ? formatCategory(v, col) || k : k, count: 1 });
    }
  }
  const shown = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, undefined, { numeric: true }))
    .slice(0, limit);
  if (!keep) return shown;
  const have = new Set(shown.map((o) => o.key));
  for (const k of keep) {
    const kk = key(k);
    if (have.has(kk)) continue;
    have.add(kk);
    const found = counts.get(kk);
    if (found) { shown.push(found); continue; }
    // Keys are strings; a reference was picked by its row id, so give the formatter a number back.
    const value = isRef(col) && /^\d+$/.test(kk) ? Number(kk) : kk;
    shown.push({ value, key: kk, label: (col ? formatCategory(value, col) : '') || kk, count: 0, missing: true });
  }
  return shown;
}

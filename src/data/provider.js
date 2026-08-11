// Unifies the two data sources behind one interface the renderer/builder use.
// DummyProvider  -> bundled demo data (sync).
// GristProvider  -> live Grist tables via the bridge (cached after prime()).

import { DUMMY_DATA } from './dummy-data.js';
import * as grist from '../grist/bridge.js';
import { clone } from '../util.js';

class BaseProvider {
  tables() { return []; }
  columns() { return []; }
  records() { return []; }
  defaultTable() { return this.tables()[0]?.id || null; }
  async prime() {}
  // Force a re-read bypassing any cache (used by the Calendar block's polling refresh). The
  // base/demo case has nothing to re-fetch — demo data only ever changes via updateRecord()
  // below, which already mutates the live array — so this just returns the current rows.
  async refresh(tableId) { return this.records(tableId); }
  // Write a single row's fields back to the source table. Read-only providers/blocks never call
  // this; it exists for the one block (Calendar, drag-to-reschedule) that edits data in place.
  // Returns false on failure (wrong permissions, detached demo row, etc.) rather than throwing,
  // so callers can show "couldn't save" instead of crashing the block.
  async updateRecord() { return false; }
  get isLive() { return false; }
}

export class DummyProvider extends BaseProvider {
  constructor(data = DUMMY_DATA) { super(); this.data = data; }
  tables() { return Object.values(this.data.tables).map((t) => ({ id: t.id, label: t.label })); }
  columns(tableId) { return (this.data.tables[tableId || this.data.defaultTable]?.columns) || []; }
  records(tableId) { return (this.data.tables[tableId || this.data.defaultTable]?.records) || []; }
  defaultTable() { return this.data.defaultTable; }
  // No real backing store to write to — mutate the demo row in place so the widget still feels
  // interactive in Demo mode, matching how every other "connect real Grist later" affordance here
  // degrades gracefully instead of just doing nothing.
  async updateRecord(table, rowId, fields) {
    const row = this.records(table).find((r) => r.id === rowId);
    if (!row) return false;
    Object.assign(row, fields);
    return true;
  }
}

export class GristProvider extends BaseProvider {
  constructor() { super(); this._tables = []; this._cols = new Map(); this._rows = new Map(); this._default = null; }
  get isLive() { return true; }

  async init() {
    const ids = await grist.listTables();
    this._tables = ids.map((id) => ({ id, label: id }));
    this._default = ids[0] || null;
    // Pre-load schema for every table so the builder can offer columns immediately.
    await Promise.all(ids.map((id) => this._loadColumns(id)));
    return this;
  }
  async _loadColumns(tableId) {
    if (this._cols.has(tableId)) return this._cols.get(tableId);
    const cols = await grist.getColumns(tableId);
    this._cols.set(tableId, cols);
    return cols;
  }
  async prime(tableIds = []) {
    const ids = [...new Set(tableIds.filter(Boolean))];
    await Promise.all(ids.map(async (id) => {
      const cols = await this._loadColumns(id);
      if (!this._rows.has(id)) this._rows.set(id, await grist.getRecords(id, cols));
    }));
  }
  invalidate(tableId) { if (tableId) this._rows.delete(tableId); else this._rows.clear(); }
  // Unconditional re-fetch (prime() above deliberately skips tables it already has cached).
  // Used for polling a table a Calendar block is currently displaying, so edits made directly in
  // Grist while the widget is open still show up here — there's no push/subscribe channel this
  // app uses, so "syncs to the widget" means "gets picked up on the next poll," not instant.
  async refresh(tableId) {
    const id = tableId || this._default;
    if (!id) return [];
    const cols = await this._loadColumns(id);
    const rows = await grist.getRecords(id, cols);
    this._rows.set(id, rows);
    return rows;
  }
  // Writes through to Grist first; only mutates the local cache (so the just-edited row reflects
  // its new value immediately, without waiting for the next poll) once that write has actually
  // succeeded — never optimistic-update-then-hope.
  async updateRecord(table, rowId, fields) {
    const ok = await grist.updateRecord(table, rowId, fields);
    if (ok) { const row = this._rows.get(table)?.find((r) => r.id === rowId); if (row) Object.assign(row, fields); }
    return ok;
  }

  tables() { return this._tables; }
  columns(tableId) { return this._cols.get(tableId || this._default) || []; }
  records(tableId) { return this._rows.get(tableId || this._default) || []; }
  defaultTable() { return this._default; }
}

// Collect every table id referenced by a site config (so a provider can prime them).
export function tablesInConfig(config) {
  const ids = new Set();
  if (config?.dataTable) ids.add(config.dataTable);
  for (const tab of config?.tabs || []) for (const b of tab.blocks || []) {
    const t = b.config?.table || b.config?.ref?.table || config?.dataTable; if (t) ids.add(t);
  }
  return [...ids];
}

const dimCol = (cols, exclude) => cols.find((x) => x.id !== exclude && /text|choice|date/i.test(x.type)) || cols.find((x) => x.id !== exclude) || null;
const measureCol = (cols, exclude) => cols.find((x) => x.id !== exclude && /int|numeric|number|currency/i.test(x.type)) || cols.find((x) => x.id !== exclude) || null;
const dateCol = (cols) => cols.find((x) => /date/i.test(x.type)) || null;
const geoCol = (cols, pattern) => cols.find((x) => pattern.test(x.id) || pattern.test(x.label || '')) || null;

// Validates + repairs one block's column references against whichever table it's already been
// resolved onto (mutates b.config in place). Shared by both adapt functions below — table
// *selection* differs between them (see each function's own comment), but once a block is on a
// table, "does this block's column still exist on it" is the same question either way.
function repairBlockColumns(b, cols) {
  const has = (id) => id != null && cols.some((x) => x.id === id);
  if (b.type === 'stat') {
    if (!has(b.config.column)) b.config.column = measureCol(cols)?.id ?? null;
  } else if (b.type === 'chart') {
    const dims = b.config.dims || [], measures = b.config.measures || [];
    if (!dims.every(has)) { const d = dimCol(cols); b.config.dims = d ? [d.id] : []; }
    if (!measures.every(has)) { const m = measureCol(cols, b.config.dims?.[0]); b.config.measures = m ? [m.id] : []; }
  } else if (b.type === 'breakdown') {
    if (!has(b.config.column)) b.config.column = dimCol(cols)?.id ?? null;
  } else if (b.type === 'progress' && b.config.mode === 'data') {
    if (!has(b.config.valueColumn)) b.config.valueColumn = measureCol(cols)?.id ?? null;
    if (b.config.targetColumn && !has(b.config.targetColumn)) b.config.targetColumn = null;
  } else if (b.type === 'livetable') {
    const cfgCols = b.config.columns || [];
    if (cfgCols.length && !cfgCols.every(has)) { b.config.columns = []; b.config.highlights = []; } // [] => show every real column; stale highlight ranges would now paint the wrong cells
  } else if (b.type === 'calendar') {
    if (!has(b.config.dateColumn)) b.config.dateColumn = dateCol(cols)?.id ?? null;
    if (!has(b.config.titleColumn)) b.config.titleColumn = dimCol(cols, b.config.dateColumn)?.id ?? null;
    if (!has(b.config.detailColumn)) b.config.detailColumn = null;
    if (!has(b.config.colorBy)) b.config.colorBy = null;
  } else if (b.type === 'map') {
    if (!has(b.config.latColumn) || !has(b.config.lonColumn)) {
      const lat = geoCol(cols, /lat/i), lon = lat && geoCol(cols, /lon|lng/i);
      b.config.latColumn = lat && lon ? lat.id : null;
      b.config.lonColumn = lat && lon && lon.id !== lat.id ? lon.id : null;
    }
    if (!has(b.config.labelColumn)) b.config.labelColumn = dimCol(cols)?.id ?? null;
    if (!has(b.config.colorBy)) b.config.colorBy = null;
    if ((b.config.popupColumns || []).length) b.config.popupColumns = b.config.popupColumns.filter(has);
  }
}

// First-connect remap: when a fresh user opens the demo and connects Grist, point the *bundled
// default site* (Sales/People, not a template) at their table so they see something immediately
// — there's no table name in DEFAULT_SITE that could ever match a real doc, so this always
// force-collapses every block onto the target's default table and repairs columns to match.
// This is the "before you've configured anything, show *something*" first-run experience —
// deliberately more aggressive than adaptTemplateToTable below, which is for a different moment
// (browsing a template library, not your first-ever connect).
export function adaptConfigToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const c = clone(config);
  c.dataTable = table;
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    b.config.table = table;
    repairBlockColumns(b, provider.columns(table));
  }
  return c;
}

// Template-apply remap: only ever repoints a block's table when there's a real reason to believe
// it's right — either the table name matches one that genuinely exists on the target (e.g.
// Research Labs' own 'Samples'/'Reagents'/'Tasks'/'People'), or the block uses 'Data', the
// deliberate shared placeholder every simple template (templates/_helpers.js) is authored
// against specifically so it collapses onto "whatever your main table is". Anything else is left
// completely intact — table AND columns unchanged — rather than guessed onto an unrelated real
// table. Feedback (2026-08-11): silently forcing a template's blocks onto whatever table happened
// to be open produced technically-non-blank but *wrong*-looking results (e.g. a "Samples Logged"
// stat card quietly showing a Sales row count) — worse than an honest "not configured yet" block,
// which is what an unmatched block now renders as (records()/columns() on a table id that doesn't
// exist on this provider just come back empty). The user then repoints it manually via Edit, same
// as any other block — that's the intended flow: install intact, customize afterward.
export function adaptTemplateToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const realTableIds = new Set(provider.tables().map((t) => t.id));
  const c = clone(config);
  c.dataTable = table;
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    const ownTable = b.config.table;
    const isRealMatch = ownTable && realTableIds.has(ownTable);
    const isFallbackPlaceholder = ownTable === 'Data';
    if (!isRealMatch && !isFallbackPlaceholder) continue; // leave this block exactly as authored
    const bTable = isRealMatch ? ownTable : table;
    b.config.table = bTable;
    repairBlockColumns(b, provider.columns(bTable));
  }
  return c;
}

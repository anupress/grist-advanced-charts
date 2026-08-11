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

// When a fresh user opens the demo and connects Grist, point demo blocks at their table so
// they see *something* immediately; they can then remap columns in the builder.
//
// Most templates author every block against one placeholder table ('Data') on the assumption
// this collapses everything onto the user's single default table — deliberate, since a template
// can't know a real doc's schema in advance. A template that instead names *real* multi-table
// structure (e.g. Research Labs' Samples/Reagents/Tasks/People) wants the opposite: leave a
// block's table alone whenever it already names a table that genuinely exists on the target
// provider, and only fall back to the single-table collapse for blocks that don't.
//
// Column remapping is per-block, not per-call: every table-bound block type gets its own column
// references validated against whichever table it actually ends up on (kept or collapsed), and
// only touched if something's actually missing — a block that already points at valid columns
// (including one that "kept its own table" by name but doesn't share every column, e.g. two
// templates both naming a table 'People' with a different shape) is left alone. Earlier this only
// covered stat/chart, which was fine while every template's other table-bound blocks (breakdown/
// map/livetable/progress, all authored via templates/_helpers.js) pointed at the single shared
// 'Data' placeholder table — but it left those block types (and any template naming its own real
// tables, like Research Labs) showing blank/broken content whenever applied somewhere that didn't
// happen to share the original column names. Map is the one type that can't always be rescued —
// there's no way to invent latitude/longitude out of a table that has none — so it degrades to an
// empty map (render/map.js already treats missing lat/lon as "no points") rather than erroring.
export function adaptConfigToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const realTableIds = new Set(provider.tables().map((t) => t.id));
  const c = clone(config);
  c.dataTable = table;

  const dimCol = (cols, exclude) => cols.find((x) => x.id !== exclude && /text|choice|date/i.test(x.type)) || cols.find((x) => x.id !== exclude) || null;
  const measureCol = (cols, exclude) => cols.find((x) => x.id !== exclude && /int|numeric|number|currency/i.test(x.type)) || cols.find((x) => x.id !== exclude) || null;
  const dateCol = (cols) => cols.find((x) => /date/i.test(x.type)) || null;
  const geoCol = (cols, pattern) => cols.find((x) => pattern.test(x.id) || pattern.test(x.label || '')) || null;

  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    const keepsOwnTable = b.config.table && realTableIds.has(b.config.table);
    const bTable = keepsOwnTable ? b.config.table : table;
    b.config.table = bTable;
    const cols = provider.columns(bTable);
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
  return c;
}

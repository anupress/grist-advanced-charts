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
// provider, and only fall back to the single-table collapse for blocks that don't. This keeps
// the common case unchanged (no existing template's tables coincidentally match a real table)
// while letting a richer template survive being applied against its own matching sample data.
export function adaptConfigToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const realTableIds = new Set(provider.tables().map((t) => t.id));
  const cols = provider.columns(table);
  const c = clone(config);
  c.dataTable = table;
  const dim = cols.find((x) => /text|choice|date/i.test(x.type)) || cols[0];
  const measure = cols.find((x) => /int|numeric|number|currency/i.test(x.type)) || cols[1] || cols[0];
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    const keepsOwnTable = b.config.table && realTableIds.has(b.config.table);
    if (!keepsOwnTable) b.config.table = table;
    if (b.type === 'stat' && !keepsOwnTable) b.config.column = measure?.id;
    if (b.type === 'chart' && !keepsOwnTable) {
      b.config.dims = dim ? [dim.id] : [];
      b.config.measures = measure ? [measure.id] : [];
    }
  }
  return c;
}

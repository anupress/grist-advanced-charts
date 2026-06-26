// Unifies the two data sources behind one interface the renderer/builder use.
// DummyProvider  -> bundled demo data (sync).
// GristProvider  -> live Grist tables via the bridge (cached after prime()).

import { DUMMY_DATA } from './dummy-data.js';
import * as grist from '../grist/bridge.js';

class BaseProvider {
  tables() { return []; }
  columns() { return []; }
  records() { return []; }
  defaultTable() { return this.tables()[0]?.id || null; }
  async prime() {}
  get isLive() { return false; }
}

export class DummyProvider extends BaseProvider {
  constructor() { super(); this.data = DUMMY_DATA; }
  tables() { return Object.values(this.data.tables).map((t) => ({ id: t.id, label: t.label })); }
  columns(tableId) { return (this.data.tables[tableId || this.data.defaultTable]?.columns) || []; }
  records(tableId) { return (this.data.tables[tableId || this.data.defaultTable]?.records) || []; }
  defaultTable() { return this.data.defaultTable; }
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
    const t = b.config?.table || config?.dataTable; if (t) ids.add(t);
  }
  return [...ids];
}

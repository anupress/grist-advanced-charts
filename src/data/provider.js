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
  get isLive() { return false; }
}

export class DummyProvider extends BaseProvider {
  constructor(data = DUMMY_DATA) { super(); this.data = data; }
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
    const t = b.config?.table || b.config?.ref?.table || config?.dataTable; if (t) ids.add(t);
  }
  return [...ids];
}

// When a fresh user opens the demo and connects Grist, point demo blocks at their table so
// they see *something* immediately; they can then remap columns in the builder.
export function adaptConfigToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const cols = provider.columns(table);
  const c = clone(config);
  c.dataTable = table;
  const dim = cols.find((x) => /text|choice|date/i.test(x.type)) || cols[0];
  const measure = cols.find((x) => /int|numeric|number|currency/i.test(x.type)) || cols[1] || cols[0];
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    b.config.table = table;
    if (b.type === 'stat') b.config.column = measure?.id;
    if (b.type === 'chart') {
      b.config.dims = dim ? [dim.id] : [];
      b.config.measures = measure ? [measure.id] : [];
    }
  }
  return c;
}

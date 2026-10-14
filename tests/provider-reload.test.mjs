// The header's Refresh (GristProvider.reload) against a fake Grist document.
//
// reload() used to clear every cached column and row and then read back only the tables the page
// draws. So after a Refresh every other table was listed with no columns: a table made in Grist
// after the widget opened could be chosen but offered nothing to pick (Invoice Studio's Data
// drawer), and the next Edit here re-downloaded the rows of every table not on the page. It also
// kept the Reference label cache, so a client renamed in Grist kept its old name on references
// after the Refresh while the Clients table itself showed the new one.
import { pathToFileURL } from 'node:url';
import { resolve as _resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

// ---- a document, and a docApi that answers from it the way Grist does ----
const doc = {
  Sales: {
    cols: [{ id: 'Region', type: 'Text' }, { id: 'Amount', type: 'Numeric' }, { id: 'Client', type: 'Ref:Clients', vis: 'Name' }],
    rows: [{ id: 1, Region: 'West', Amount: 100, Client: 1 }, { id: 2, Region: 'East', Amount: 250, Client: 2 }],
  },
  Clients: {
    cols: [{ id: 'Name', type: 'Text' }],
    rows: [{ id: 1, Name: 'Harbour Freight Ltd' }, { id: 2, Name: 'Bluewave Media' }],
  },
  Notes: { cols: [{ id: 'Text', type: 'Text' }], rows: [{ id: 1, Text: 'not on the page' }] },
};

function meta() {
  const names = Object.keys(doc);
  const T = { id: [], tableId: [] };
  names.forEach((n, i) => { T.id.push(i + 1); T.tableId.push(n); });
  const C = { id: [], parentId: [], colId: [], label: [], type: [], visibleCol: [], isFormula: [], formula: [], widgetOptions: [] };
  const ref = {};
  let k = 0;
  names.forEach((n, i) => doc[n].cols.forEach((c) => { k++; ref[`${n}.${c.id}`] = k; C.id.push(k); C.parentId.push(i + 1); C.colId.push(c.id); C.label.push(c.id); C.type.push(c.type); C.isFormula.push(false); C.formula.push(''); C.widgetOptions.push(''); C.visibleCol.push(0); }));
  names.forEach((n) => doc[n].cols.forEach((c) => { if (c.vis) C.visibleCol[ref[`${n}.${c.id}`] - 1] = ref[`${c.type.split(':')[1]}.${c.vis}`]; }));
  return { T, C };
}
const fetched = [];
const docApi = {
  listTables: async () => Object.keys(doc),
  fetchTable: async (name) => {
    fetched.push(name);
    if (name === '_grist_Tables') return meta().T;
    if (name === '_grist_Tables_column') return meta().C;
    const t = doc[name];
    if (!t) throw new Error(`KeyError: ${name}`);
    const out = { id: t.rows.map((r) => r.id) };
    for (const c of t.cols) out[c.id] = t.rows.map((r) => r[c.id]);
    return out;
  },
};
const listeners = [];
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.top = {};
globalThis.location = { search: '' };
globalThis.grist = {
  ready: () => setTimeout(() => listeners.forEach((f) => f({ settings: { accessLevel: 'full' } })), 5),
  on: (evt, fn) => { if (evt === 'message') listeners.push(fn); },
  docApi,
};

const bridge = await import(pathToFileURL(_resolve(ROOT, 'src/grist/bridge.js')).href);
const { GristProvider } = await import(pathToFileURL(_resolve(ROOT, 'src/data/provider.js')).href);
eq('the fake host connects', await bridge.connect(500), true);

const ids = (cols) => (cols || []).map((c) => c.id);
const clientLabel = (p, id) => p.columns('Sales').find((c) => c.id === 'Client')?.refLabels?.[id];

// Boot: every table's schema, rows for the page's table (and the table its references point at).
const p = await new GristProvider().init();
await p.prime(['Sales']);
eq('at boot an off-page table has its columns', ids(p.columns('Notes')), ['Text']);
eq('a reference reads as the client name', clientLabel(p, 1), 'Harbour Freight Ltd');

// While the widget is open: a table is made in Grist and a client is renamed. Then Refresh.
doc.Stock = { cols: [{ id: 'Item', type: 'Text' }, { id: 'Qty', type: 'Numeric' }], rows: [{ id: 1, Item: 'Bolts', Qty: 120 }, { id: 2, Item: 'Nuts', Qty: 80 }] };
doc.Clients.rows[0].Name = 'Harbour Freight GmbH';
fetched.length = 0;
const res = await p.reload(['Sales']);

eq('Refresh lists the new table', p.tables().map((t) => t.id), ['Sales', 'Clients', 'Notes', 'Stock']);
eq('and reports the tables it re-read', res, { tables: 4, reloaded: 1 });
eq('the new table has its columns, so they can be picked', ids(p.columns('Stock')), ['Item', 'Qty']);
eq('a table that was there all along keeps its columns', ids(p.columns('Notes')), ['Text']);
eq('the page\'s table has its rows again', p.records('Sales').length, 2);
eq('a reference reads as the name the client has NOW', clientLabel(p, 1), 'Harbour Freight GmbH');
eq('rows are read for the page and what it references, not for every table', fetched.filter((n) => !n.startsWith('_grist_')).sort(), ['Clients', 'Sales']);
eq('the schema is two requests, whatever the number of tables', fetched.filter((n) => n.startsWith('_grist_')).sort(), ['_grist_Tables', '_grist_Tables_column']);

// Opening the editor next (startEdit -> refreshTables) has nothing left to fetch.
fetched.length = 0;
await p.refreshTables();
eq('the Edit after a Refresh downloads no tables', fetched, []);

// Choosing the new table in an editor reads its rows (block-editor's ensureRows -> prime).
await p.prime(['Stock']);
eq('choosing the new table reads its rows', p.records('Stock').map((r) => r.Item), ['Bolts', 'Nuts']);

// A table that disappears is dropped from the list and from the cache.
delete doc.Notes;
await p.reload(['Sales']);
eq('a table removed in Grist is gone after Refresh', p.tables().map((t) => t.id), ['Sales', 'Clients', 'Stock']);
eq('and has no columns left in the cache', ids(p.columns('Notes')), []);

console.log(`provider-reload: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// 3.10.12, found building the Glutbohne case study:
//
//   live data  Grist tells a widget when its linked table changes ({tableId, dataChange: true}, the
//              message grist.onRecords waits for), and the page ignored it: a status changed in the
//              table next door showed on the dashboard only after a reload or Refresh.
//   pages      Edit always opened the editor on the first page, so "Cafés, Edit, Add Section" put the
//              new block on the Overview; and every redraw (Done, dark mode, Refresh) showed the first
//              page again, wherever the reader was.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as _resolve, dirname } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(_resolve(ROOT, p), 'utf8');
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${name}`); } };

// ---- a document, and a docApi that answers from it the way Grist does ----
const doc = {
  Orders: {
    cols: [{ id: 'Order', type: 'Text' }, { id: 'Status', type: 'Choice' }, { id: 'Customer', type: 'Ref:Customers', vis: 'Customer' }],
    rows: [{ id: 1, Order: 'R-2352', Status: 'Late', Customer: 1 }, { id: 2, Order: 'R-2326', Status: 'Late', Customer: 2 }],
  },
  Customers: { cols: [{ id: 'Customer', type: 'Text' }], rows: [{ id: 1, Customer: 'Brick Bar' }, { id: 2, Customer: 'Morning Counter' }] },
  Notes: { cols: [{ id: 'Text', type: 'Text' }], rows: [{ id: 1, Text: 'not on the page' }] },
};
function meta() {
  const names = Object.keys(doc);
  const T = { id: [], tableId: [] };
  names.forEach((n, i) => { T.id.push(i + 1); T.tableId.push(n); });
  const C = { id: [], parentId: [], colId: [], label: [], type: [], visibleCol: [], isFormula: [], formula: [], widgetOptions: [] };
  const ref = {};
  let k = 0;
  names.forEach((n, i) => doc[n].cols.forEach((c) => { k++; ref[`${n}.${c.id}`] = k; C.id.push(k); C.parentId.push(i + 1); C.colId.push(c.id); C.label.push(c.id); C.type.push(c.type); C.visibleCol.push(0); C.isFormula.push(false); C.formula.push(''); C.widgetOptions.push(''); }));
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
const send = (msg) => listeners.forEach((f) => f(msg));

const bridge = await import(pathToFileURL(_resolve(ROOT, 'src/grist/bridge.js')).href);
const { GristProvider } = await import(pathToFileURL(_resolve(ROOT, 'src/data/provider.js')).href);
eq('the fake host connects', await bridge.connect(500), true);

// ---- Grist's change note ----
const heard = [];
eq('a listener can be added', bridge.onDataChange((t) => heard.push(t)), true);
send({ tableId: 'Orders', rowId: 2 });
eq('a cursor moving is not a change', heard, []);
send({ tableId: 'Orders', dataChange: true });
eq('a data change is heard, with its table', heard, ['Orders']);
send({ settings: { accessLevel: 'full' } });
eq('a settings message is not a change either', heard, ['Orders']);

// ---- the provider reads its tables again ----
const p = await new GristProvider().init();
await p.prime(['Orders']);
const late = () => p.records('Orders').filter((r) => r.Status === 'Late').map((r) => r.Order);
const who = (id) => p.columns('Orders').find((c) => c.id === 'Customer')?.refLabels?.[id];
eq('at first two orders are late', late(), ['R-2352', 'R-2326']);

fetched.length = 0;
eq('nothing changed: nothing to redraw', await p.refreshCached(), false);
eq('only the tables it holds are read again', fetched.slice().sort(), ['Customers', 'Orders']);

doc.Orders.rows[0].Status = 'Shipped';         // marked shipped in the table next door
eq('a status changed in Grist: there is something to redraw', await p.refreshCached(), true);
eq('and the late list has one order left', late(), ['R-2326']);

doc.Customers.rows[1].Customer = 'Morning Counter Café';
await p.refreshCached();
eq('a renamed customer reads by its new name on the orders', who(2), 'Morning Counter Café');
ok('a table off the page is never read', !fetched.includes('Notes'));

// ---- the pages: the editor opens where Edit was pressed, and Done comes back there ----
const builder = src('src/builder/index.js');
const main = src('src/main.js');
ok('the editor takes the page to open on', /activeTabId = \(opts\.tabId && \(working\.tabs \|\| \[\]\)\.some\(\(t\) => t\.id === opts\.tabId\)\) \? opts\.tabId/.test(builder));
ok('and hands back the page it was on', builder.includes('onExit?.(cleanConfig(), activeTabId);'));
ok('Edit passes the page that is showing', /const tabId = app\.siteApi\?\.getActiveTab\?\.\(\) \|\| null;[\s\S]{0,80}openBuilder\(\{\s*root, config: app\.config, provider, live, tabId,/.test(main));
ok('a redraw keeps the page that was showing', /const keep = tabId \?\? app\.siteApi\?\.getActiveTab\?\.\(\) \?\? null;/.test(main));
ok('the dashboard listens for changes once it has loaded', /if \(live\) bridge\.onDataChange\(onLiveChange\);/.test(main));
ok('and does not redraw under the editor, a printout or an open popover', main.includes("'.ap-layout, .ap-drawer, .ap-calendar__popover:not([hidden])'") && /if \(editing\) \{ livePending = true; return; \}/.test(main));

console.log(`live-data: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

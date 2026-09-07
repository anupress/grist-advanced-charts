// The nested-widget host, driven with a pretend window: a pretend Grist above, pretend frames
// below, and the messages between them. What must hold: a frame's calls reach Grist with an id
// our own client can never use and the answer comes back under the frame's own id; ready,
// configure, mappings and options never reach Grist; a block with its own table is served from
// the document API; and outside Grist a frame is told so rather than left waiting.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- a pretend browser -------------------------------------------------------------------------
const up = [];                                   // what went to "Grist"
const parentWin = { postMessage: (m) => up.push(m) };
let apiSeen = [];                                // what the plugin API's own receiver saw
let fetchCalls = [];
globalThis.window = {
  parent: parentWin,
  onmessage: (e) => apiSeen.push(e.data),
  grist: { docApi: { fetchTable: async (t) => { fetchCalls.push(t); return { id: [1, 2], Name: ['A', 'B'], Amount: [5, 7], manualSort: [1, 2], gristHelper_Display: ['a', 'b'] }; } } },
};
globalThis.document = { dispatchEvent() {}, addEventListener() {}, baseURI: 'https://example.test/widget/' };

const host = await import(pathToFileURL(join(ROOT, 'src/grist/widget-host.js')).href);
const { installWidgetHost, attachNestedFrame, resolveMappings, trimColumns, pickRow, expandReferences, _internals } = host;

let liveNow = true;
const optionStore = new Map();
// People has a Ref:Clients column shown by Name; Clients is what it points at.
const tables = {
  People: { id: [1, 2], Name: ['A', 'B'], Amount: [5, 7], Client: [2, 0], Tags: [['L', 1, 2], null], manualSort: [1, 2], gristHelper_Display: ['a', 'b'] },
  Clients: { id: [1, 2], Name: ['Northgate', 'Riverside'] },
};
window.grist.docApi.fetchTable = async (t) => { fetchCalls.push(t); if (!tables[t]) throw new Error('no table ' + t); return tables[t]; };
const columnsOf = { People: [{ id: 'Name', type: 'Text' }, { id: 'Amount', type: 'Numeric' }, { id: 'Client', type: 'Ref:Clients', refTable: 'Clients', refVisibleCol: 'Name' }, { id: 'Tags', type: 'RefList:Clients', refTable: 'Clients', refVisibleCol: 'Name' }] };
let hostTheme = () => ({ appearance: 'dark', colors: { text: '#eee' } });
installWidgetHost({ isLive: () => liveNow, getOption: async (k) => optionStore.get(k) ?? null, setOption: async (v, k) => { optionStore.set(k, v); }, getColumns: async (t) => columnsOf[t] || [], hostTheme: () => hostTheme() });

const frame = (blockId, extra = {}) => {
  const inbox = [];
  const win = { postMessage: (m) => inbox.push(m) };
  const iframe = { contentWindow: win, isConnected: true };
  attachNestedFrame(iframe, { blockId, ...extra });
  return { win, iframe, inbox, send: (data) => window.onmessage({ data, source: win }) };
};
const fromGrist = (data) => window.onmessage({ data, source: parentWin });
const tick = () => new Promise((r) => setTimeout(r, 0));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };

// ---- pure helpers ------------------------------------------------------------------------------
ok(resolveMappings(null, {}) === null && resolveMappings([], {}) === null, 'no requested columns: no mapping');
ok(resolveMappings([{ name: 'A' }], { A: 'Col' }).A === 'Col', 'a mapped required column');
ok(resolveMappings([{ name: 'A' }, { name: 'B', optional: true }], { A: 'Col' }).B === null, 'an optional column left blank is null');
ok(resolveMappings([{ name: 'A' }, { name: 'B' }], { A: 'Col' }) === null, 'a required column left blank makes the whole mapping null');
ok(JSON.stringify(resolveMappings([{ name: 'M', allowMultiple: true }], { M: ['X', 'Y'] }).M) === '["X","Y"]', 'allowMultiple maps to an array');
ok(JSON.stringify(resolveMappings([{ name: 'M', allowMultiple: true, optional: true }], {}).M) === '[]', 'an optional multiple left blank is an empty array');
ok(resolveMappings(['A'], { A: 'Col' }).A === 'Col', 'a plain string request works too');
ok(resolveMappings([{ name: 'A' }], { A: ['First', 'Second'] }).A === 'First', 'an array chosen for a single column takes the first');

const raw = { id: [1], Name: ['A'], manualSort: [1], gristHelper_Display: ['x'] };
ok(Object.keys(trimColumns(raw)).join() === 'id,Name', 'helper columns are dropped by default');
ok(Object.keys(trimColumns(raw, { includeColumns: 'all' })).length === 4, 'includeColumns all keeps them');
ok(pickRow({ id: [1, 2], Name: ['A', 'B'] }, 2).Name === 'B', 'pickRow finds the row');
let threw = false; try { pickRow({ id: [1] }, 9); } catch { threw = true; } ok(threw, 'pickRow throws for a missing row');

// References: ids become what they point at, lists too, and an unreadable table keeps its ids.
{
  const data = { id: [1, 2], Client: [2, 0], Tags: [['L', 1, 2], null], Name: ['A', 'B'] };
  const cols = columnsOf.People;
  const calls = [];
  const out = await expandReferences(data, cols, async (t) => { calls.push(t); return tables[t]; });
  ok(out.Client[0] === 'Riverside' && out.Client[1] === '', `Ref ids become the visible column (got ${JSON.stringify(out.Client)})`);
  ok(JSON.stringify(out.Tags[0]) === '["L","Northgate","Riverside"]' && out.Tags[1] === null, `RefList keeps its list shape (got ${JSON.stringify(out.Tags)})`);
  ok(calls.length === 1, 'the referenced table is fetched once for both columns');
  ok(out.Name[0] === 'A' && data.Client[0] === 2, 'other columns untouched, the input not mutated');
  const kept = await expandReferences(data, cols, async () => { throw new Error('nope'); });
  ok(kept.Client[0] === 2, 'an unreadable referenced table keeps the ids');
  const same = await expandReferences(data, [{ id: 'Name', type: 'Text' }], async () => { throw new Error('should not fetch'); });
  ok(same === data, 'no reference columns: the data is returned as is');
}

// ---- outside Grist, before any theme: the page's own theme is handed down --------------------
_internals.reset();
{
  const pre = frame('blkT');
  pre.send({ mtype: 5 });
  await tick(); await tick();
  const t = pre.inbox.find((m) => m.data?.theme);
  ok(t && t.data.theme.appearance === 'dark' && t.data.theme.colors.text === '#eee', 'with no Grist theme on record, the host theme is sent on ready');
}

// ---- the relay ---------------------------------------------------------------------------------
_internals.reset();
fromGrist({ mtype: 4, data: { theme: { appearance: 'dark' }, fromReady: true } });
fromGrist({ mtype: 4, data: { settings: { accessLevel: 'full' }, options: { anupressSiteConfig: '{}' } } });
fromGrist({ mtype: 4, data: { tableId: 'Sales', dataChange: true } });
ok(apiSeen.length === 3, 'everything Grist sends still reaches our own client');

const a = frame('blkA');
a.send({ mtype: 5 });                                                   // ready
await tick(); await tick();
ok(up.length === 0, 'a nested ready never goes up to Grist');
ok(a.inbox.some((m) => m.data?.theme?.appearance === 'dark'), 'the last theme is replayed to a frame that says ready');
ok(!a.inbox.some((m) => m.data?.theme?.colors?.text === '#eee'), 'once Grist has sent a theme, the page fallback is not used');
const settingsMsg = a.inbox.find((m) => m.data?.settings);
ok(settingsMsg && settingsMsg.data.settings.accessLevel === 'full' && settingsMsg.data.options === null, 'access and (empty) options are announced');
ok(a.inbox.some((m) => m.data?.tableId === 'Sales' && m.data.dataChange), 'the linked table is announced to a frame without its own');
ok(!apiSeen.some((m) => m.mtype === 5), 'the nested ready is kept away from our own client');

// configure and mappings are answered here
a.send({ mtype: 1, reqId: 1, iface: 'CustomSectionAPI', meth: 'configure', args: [{ columns: [{ name: 'Label' }, { name: 'Value', optional: true }], requiredAccess: 'read table' }] });
ok(up.length === 0 && a.inbox.some((m) => m.mtype === 2 && m.reqId === 1), 'configure is answered locally and never forwarded');
a.send({ mtype: 1, reqId: 2, iface: 'CustomSectionAPI', meth: 'mappings', args: [] });
const mapAns = a.inbox.find((m) => m.reqId === 2);
ok(mapAns && mapAns.data === null, 'with nothing mapped, mappings() is null');

// a data call goes up with a far-away id and the answer comes back under the frame's id
a.send({ mtype: 1, reqId: 3, iface: 'GristView', meth: 'fetchSelectedTable', args: [{}] });
ok(up.length === 1 && up[0].reqId >= 2 ** 31 && up[0].meth === 'fetchSelectedTable', `a relayed call carries a high id (got ${up[0]?.reqId})`);
const consumed = fromGrist({ mtype: 2, reqId: up[0].reqId, data: { id: [1], Name: ['A'] } });
const back = a.inbox.find((m) => m.reqId === 3);
ok(back && back.mtype === 2 && back.data.Name[0] === 'A', 'the answer returns under the frame\'s own id');
ok(!apiSeen.some((m) => m.reqId === up[0].reqId), 'the relayed answer is kept away from our own client');
void consumed;

// an error from Grist travels the same road
a.send({ mtype: 1, reqId: 4, iface: 'GristDocAPI', mdest: 'grist', meth: 'fetchTable', args: ['Nope'] });
fromGrist({ mtype: 3, reqId: up[1].reqId, mesg: 'no such table', code: 'X' });
ok(a.inbox.some((m) => m.reqId === 4 && m.mtype === 3 && m.mesg === 'no such table'), 'errors come back too');

// a call without a request id (fire and forget) is forwarded as is
const before = up.length;
a.send({ mtype: 1, iface: 'GristView', meth: 'setCursorPos', args: [{ rowId: 1 }] });
ok(up.length === before + 1 && up[before].reqId === undefined, 'a call with no reqId is forwarded untouched');

// later table changes are forwarded to frames that follow the linked table
const n0 = a.inbox.length;
fromGrist({ mtype: 4, data: { tableId: 'Sales', dataChange: true, rowId: 3 } });
ok(a.inbox.length === n0 + 1 && a.inbox[n0].data.rowId === 3, 'a data change on the linked table is passed down');

// ---- options: one key per block, never Grist's own -------------------------------------------
a.send({ mtype: 1, reqId: 5, iface: 'WidgetAPI', meth: 'setOption', args: ['note', 'hello'] });
await tick(); await tick();
ok(optionStore.get('apNested:blkA') === JSON.stringify({ note: 'hello' }), `options are stored under the block's own key (${optionStore.get('apNested:blkA')})`);
ok(!up.some((m) => m.iface === 'WidgetAPI'), 'no WidgetAPI call ever goes up');
a.send({ mtype: 1, reqId: 6, iface: 'WidgetAPI', meth: 'getOption', args: ['note'] });
await tick(); await tick();
ok(a.inbox.some((m) => m.reqId === 6 && m.data === 'hello'), 'getOption reads it back');
a.send({ mtype: 1, reqId: 7, iface: 'WidgetAPI', meth: 'clearOptions', args: [] });
await tick(); await tick();
ok(optionStore.get('apNested:blkA') === '', 'clearOptions empties the key');

// ---- a block with its own table is served from the document API ------------------------------
const b = frame('blkB', { table: 'People', mappings: { Label: 'Name' } });
b.send({ mtype: 5 });
await tick(); await tick();
ok(b.inbox.some((m) => m.data?.tableId === 'People'), 'its own table is announced, not the linked one');
b.send({ mtype: 1, reqId: 1, iface: 'CustomSectionAPI', meth: 'configure', args: [{ columns: [{ name: 'Label' }] }] });
b.send({ mtype: 1, reqId: 2, iface: 'CustomSectionAPI', meth: 'mappings', args: [] });
ok(b.inbox.find((m) => m.reqId === 2)?.data?.Label === 'Name', 'mappings() returns what the editor chose');
const upBefore = up.length;
b.send({ mtype: 1, reqId: 3, iface: 'GristView', meth: 'fetchSelectedTable', args: [{ format: 'rows' }] });
await tick(); await tick();
const own = b.inbox.find((m) => m.reqId === 3);
ok(up.length === upBefore && fetchCalls.includes('People'), 'fetchSelectedTable on an own-table block uses docApi.fetchTable, not the relay');
ok(own && own.mtype === 2 && own.data.Name[1] === 'B' && !('manualSort' in own.data) && !('gristHelper_Display' in own.data), 'the answer is the table minus helper columns');
ok(own && own.data.Client[0] === 'Riverside' && JSON.stringify(own.data.Tags[0]) === '["L","Northgate","Riverside"]', `references arrive expanded by default (got ${JSON.stringify(own?.data?.Client)})`);
b.send({ mtype: 1, reqId: 33, iface: 'GristView', meth: 'fetchSelectedTable', args: [{ cellFormat: 'typed' }] });
await tick(); await tick(); await tick();
ok(b.inbox.find((m) => m.reqId === 33)?.data?.Client?.[0] === 2, 'cellFormat typed keeps the raw ids');
b.send({ mtype: 1, reqId: 4, iface: 'GristView', meth: 'fetchSelectedRecord', args: [2, {}] });
await tick(); await tick();
ok(b.inbox.find((m) => m.reqId === 4)?.data?.Amount === 7 && b.inbox.find((m) => m.reqId === 4)?.data?.Client === '', 'fetchSelectedRecord picks the row, references expanded');
b.send({ mtype: 1, reqId: 5, iface: 'GristView', meth: 'setSelectedRows', args: [[1]] });
ok(b.inbox.find((m) => m.reqId === 5)?.mtype === 2 && up.length === upBefore, 'selection calls on an own-table block are answered, not forwarded');
const n1 = b.inbox.length;
fromGrist({ mtype: 4, data: { tableId: 'Sales', dataChange: true } });
ok(b.inbox.length === n1, 'a change on the linked table is not passed to a block reading another table');

// ---- outside Grist -----------------------------------------------------------------------------
liveNow = false;
const c = frame('blkC');
c.send({ mtype: 1, reqId: 1, iface: 'GristView', meth: 'fetchSelectedTable', args: [{}] });
const noGrist = c.inbox.find((m) => m.reqId === 1);
ok(noGrist && noGrist.mtype === 3 && noGrist.code === 'AP_NO_GRIST', 'outside a document a data call fails fast with a reason');
c.send({ mtype: 1, reqId: 2, iface: 'CustomSectionAPI', meth: 'configure', args: [{ columns: [] }] });
ok(c.inbox.find((m) => m.reqId === 2)?.mtype === 2, 'configure still succeeds outside a document');
c.send({ mtype: 1, reqId: 3, iface: 'WidgetAPI', meth: 'setOptions', args: [{ a: 1 }] });
await tick(); await tick();
c.send({ mtype: 1, reqId: 4, iface: 'WidgetAPI', meth: 'getOptions', args: [] });
await tick(); await tick();
ok(c.inbox.find((m) => m.reqId === 4)?.data?.a === 1, 'options live in memory outside a document');
liveNow = true;

// ---- hygiene -----------------------------------------------------------------------------------
const stranger = { postMessage() {} };
const seenBefore = apiSeen.length;
window.onmessage({ data: { mtype: 1, reqId: 9, iface: 'GristView', meth: 'fetchSelectedTable' }, source: stranger });
ok(apiSeen.length === seenBefore + 1, 'a message from a window we never registered goes to the plugin API untouched');
a.iframe.isConnected = false;
const d = frame('blkD');
d.send({ mtype: 5 });
ok(!_internals.handleMessage({ data: { mtype: 5 }, source: a.win }), 'a removed frame is forgotten');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

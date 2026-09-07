// Nested widgets: another Grist custom widget, by URL or as inline code, living inside this one.
//
// A custom widget talks to Grist by posting messages to window.parent. Inside this widget that
// parent is us, so nothing reaches Grist unless we carry it. This module is the carrier. It keeps
// a registry of nested frames, forwards their calls up to Grist with request ids moved out of the
// range our own client uses, and routes the answers back down. Grist only ever sees one widget:
// this one.
//
// Three things are answered here instead of forwarded, because Grist keeps exactly one of each per
// frame and ours is already taken:
//   • ready — a second one would read to Grist as this widget restarting;
//   • the section configuration (which columns the nested widget wants) and the mapping it then
//     asks for — kept per block, answered with what the person chose in the block's editor;
//   • widget options — forwarded, they would land in this widget's own option store, where the
//     design lives, and a nested notepad saving its text would overwrite the dashboard. Each block
//     gets its own key instead.
//
// A block can also name its own table. Then "the selected table" means that table: the fetch is
// made from here with this widget's document API and the answer shaped the way Grist would shape
// it. A block without a table follows the table this widget is linked to in Grist, exactly as the
// same widget would if it sat in the section directly, including the live change notifications.
//
// The message shapes are grain-rpc's, which the plugin API is built on: calls {mtype:1, reqId,
// iface, meth, args}, answers {mtype:2, reqId, data} or {mtype:3, reqId, mesg, code}, custom
// notes {mtype:4, data}, and the bare ready {mtype:5}.

const RPC_CALL = 1, RPC_DATA = 2, RPC_ERR = 3, CUSTOM = 4, READY = 5;
// Our own client numbers its requests from 1; relayed ones start here and can never meet it.
const ID_BASE = 2 ** 31;
const OPTION_PREFIX = 'apNested:';

let installed = false;
let nextId = 1;
let bridgeApi = null;               // { isLive, getOption, setOption } — set by installWidgetHost
const pendingFrames = [];           // attached, not yet heard from: [{ iframe, meta }]
const frames = new Map();           // contentWindow -> entry
const relayed = new Map();          // outer reqId -> { win, reqId, after }
const memOptions = new Map();       // blockId -> options, when there is no Grist to keep them
let lastTheme = null, lastSettings = null, lastTableId = null;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const live = () => { try { return !!bridgeApi?.isLive?.(); } catch { return false; } };

/**
 * Wrap the plugin API's own message receiver once, before anything else can arrive. Called at
 * boot; `bridge` supplies liveness and the option store so this module owns no Grist calls.
 */
export function installWidgetHost(bridge) {
  if (bridge) bridgeApi = bridge;
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const prev = window.onmessage;
  window.onmessage = function (e) {
    if (handleMessage(e)) return undefined;
    return typeof prev === 'function' ? prev.call(this, e) : undefined;
  };
  // Outside Grist there is no theme message to forward, so the page's own light/dark switch is
  // passed down in the same shape. Inside Grist, Grist's theme wins and this stays quiet.
  if (typeof document !== 'undefined') {
    document.addEventListener('ap:theme', () => {
      const t = fallbackTheme();
      if (t) broadcast({ mtype: CUSTOM, data: { theme: t } }, () => true);
    });
  }
}

function fallbackTheme() {
  if (lastTheme || typeof bridgeApi?.hostTheme !== 'function') return null;
  try { return bridgeApi.hostTheme(); } catch { return null; }
}

/**
 * Register an iframe as a nested widget. Call it as soon as the element exists, attached or not:
 * a frame has no contentWindow until it is in the document, and its first message can arrive
 * before any load event, so the match is made lazily on that first message.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {{ blockId: string, table?: string|null, mappings?: object, onConfigure?: Function }} meta
 */
export function attachNestedFrame(iframe, meta = {}) {
  installWidgetHost();
  prune();
  pendingFrames.push({ iframe, meta: { blockId: String(meta.blockId || ''), table: meta.table || null, mappings: isObj(meta.mappings) ? meta.mappings : {}, onConfigure: meta.onConfigure || null } });
}

/** Forget the options a nested widget saved for this block (its notes, its chosen view, and so on). */
export async function clearNestedOptions(blockId) {
  memOptions.delete(blockId);
  for (const en of frames.values()) if (en.blockId === blockId) en.options = undefined;
  if (live() && bridgeApi?.setOption) { try { await bridgeApi.setOption('', OPTION_PREFIX + blockId); } catch { /* nothing to clear */ } }
}

/** The table this widget is linked to in Grist, as Grist last reported it; null before that or outside Grist. */
export function linkedTableId() { return lastTableId; }

/** The columns the widget behind this block asked for, if it has loaded once this session. */
export function requestedColumns(blockId) {
  for (const en of frames.values()) if (en.blockId === blockId && en.requested) return en.requested.columns || null;
  return null;
}

// Frames come and go with every render; a registry keyed by their windows must not keep the dead.
function prune() {
  for (let i = pendingFrames.length - 1; i >= 0; i--) if (!pendingFrames[i].iframe.isConnected) pendingFrames.splice(i, 1);
  for (const [win, en] of frames) if (!en.iframe.isConnected) frames.delete(win);
}

function post(win, msg) { try { win.postMessage(msg, '*'); } catch { /* the frame is gone */ } }

function handleMessage(e) {
  const msg = e.data;
  if (!isObj(msg) || !e.source) return false;
  let entry = frames.get(e.source);
  if (!entry) {
    const i = pendingFrames.findIndex((p) => p.iframe.contentWindow === e.source);
    if (i >= 0) {
      const p = pendingFrames.splice(i, 1)[0];
      entry = { ...p.meta, iframe: p.iframe, win: e.source, requested: null, options: undefined };
      frames.set(e.source, entry);
    }
  }
  if (entry) { fromNested(entry, msg); return true; }
  if (window.parent !== window && e.source === window.parent) return fromHost(msg);
  return false;
}

// ---- Down: Grist to the nested frames --------------------------------------------------------

function fromHost(msg) {
  // The answer to a call we carried up: hand it down with the frame's own request id restored.
  if ((msg.mtype === RPC_DATA || msg.mtype === RPC_ERR) && relayed.has(msg.reqId)) {
    const r = relayed.get(msg.reqId);
    relayed.delete(msg.reqId);
    let out = { ...msg, reqId: r.reqId };
    if (msg.mtype === RPC_DATA && r.after) {
      try { out.data = r.after(msg.data); }
      catch (err) { out = { mtype: RPC_ERR, reqId: r.reqId, mesg: String(err?.message || err), code: 'AP_RELAY' }; }
    }
    post(r.win, out);
    return true;
  }
  if (msg.mtype === CUSTOM && isObj(msg.data)) {
    const d = msg.data;
    if (d.theme) { lastTheme = d.theme; broadcast({ mtype: CUSTOM, data: { theme: d.theme } }, () => true); }
    if (d.settings) lastSettings = d.settings;
    // A change in the linked table: every block that follows that table hears about it.
    if (d.tableId) { lastTableId = d.tableId; broadcast(msg, (en) => !en.table); }
  }
  return false;   // our own client still needs everything Grist sends
}

function broadcast(msg, want) {
  prune();
  for (const en of frames.values()) if (want(en)) post(en.win, msg);
}

// What Grist sends a widget that has just said ready: the theme, its options and access, and the
// table it is linked to. The same three, in the same order, from here.
async function welcome(entry) {
  const theme = lastTheme || fallbackTheme();
  if (theme) post(entry.win, { mtype: CUSTOM, data: { theme, fromReady: true } });
  let options = null;
  try { options = await loadOptions(entry); } catch { options = null; }
  const settings = { accessLevel: lastSettings?.accessLevel || (live() ? 'full' : 'none') };
  if (lastSettings?.linking) settings.linking = lastSettings.linking;
  post(entry.win, { mtype: CUSTOM, data: { options: options ?? null, settings, fromReady: true } });
  const tableId = entry.table || lastTableId;
  if (tableId) post(entry.win, { mtype: CUSTOM, data: { tableId, dataChange: true, mappingsChange: true } });
}

// ---- Up: the nested frames to Grist ----------------------------------------------------------

function fromNested(entry, msg) {
  if (msg.mtype === READY) { welcome(entry); return; }
  if (msg.mtype !== RPC_CALL) return;   // custom notes, and answers to calls nobody here made
  const { reqId, iface, meth } = msg;
  const args = Array.isArray(msg.args) ? msg.args : [];
  const reply = (data) => { if (reqId !== undefined) post(entry.win, { mtype: RPC_DATA, reqId, data }); };
  const fail = (mesg, code) => { if (reqId !== undefined) post(entry.win, { mtype: RPC_ERR, reqId, mesg, code }); };

  if (iface === 'CustomSectionAPI') {
    if (meth === 'configure') {
      entry.requested = isObj(args[0]) ? args[0] : {};
      try { entry.onConfigure?.(entry.requested); } catch { /* the editor's problem, not the widget's */ }
      announceConfigure(entry);
      return reply(null);
    }
    if (meth === 'mappings') return reply(resolveMappings(entry.requested?.columns, entry.mappings));
    return reply(null);
  }
  if (iface === 'WidgetAPI') { handleOptions(entry, meth, args, reply, fail); return; }
  if (!live()) return fail('This page is not inside a Grist document, so there is no data to read.', 'AP_NO_GRIST');
  if (iface === 'GristView' && entry.table) { ownTableCall(entry, meth, args, reply, fail); return; }
  relay(entry, msg);
}

function relay(entry, msg, after) {
  if (msg.reqId === undefined) { post(window.parent, msg); return; }
  const outer = ID_BASE + nextId++;
  relayed.set(outer, { win: entry.win, reqId: msg.reqId, after: after || null });
  post(window.parent, { ...msg, reqId: outer });
}

// The block reads a table of its own choosing, so "the selected table" is that one. Fetched with
// this widget's document API and trimmed the way a section view would trim it.
function ownTableCall(entry, meth, args, reply, fail) {
  const docApi = typeof window !== 'undefined' ? window.grist?.docApi : null;
  if (!docApi?.fetchTable) return fail('The document API is not available.', 'AP_NO_API');
  const onErr = (e) => fail(String(e?.message || e), 'AP_FETCH');
  if (meth === 'fetchSelectedTable') { ownTable(entry, args[0], docApi).then(reply).catch(onErr); return; }
  if (meth === 'fetchSelectedRecord') { ownTable(entry, args[1], docApi).then((data) => reply(pickRow(data, args[0]))).catch(onErr); return; }
  // allowSelectBy, setSelectedRows, setCursorPos: there is no section selection to move.
  reply(null);
}

// The block's own table, shaped the way a section view would hand it over: helper columns dropped,
// and references shown as what they point at (a client's name, not its row id) unless the caller
// asked for typed cells, which is what Grist's own fetchSelectedTable does by default.
async function ownTable(entry, options, docApi) {
  const data = trimColumns(await docApi.fetchTable(entry.table), options);
  const expand = options?.expandRefs ?? options?.cellFormat !== 'typed';
  if (!expand || typeof bridgeApi?.getColumns !== 'function') return data;
  let cols = [];
  try { cols = await bridgeApi.getColumns(entry.table); } catch { return data; }
  return expandReferences(data, cols, (t) => docApi.fetchTable(t));
}

function announceConfigure(entry) {
  if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
  try { document.dispatchEvent(new CustomEvent('ap:nested-configure', { detail: { blockId: entry.blockId, settings: entry.requested } })); } catch { /* not in a browser */ }
}

// ---- Options: one key per block in this widget's own option store ------------------------------

async function loadOptions(entry) {
  if (entry.options !== undefined) return entry.options;
  let opts = memOptions.has(entry.blockId) ? memOptions.get(entry.blockId) : null;
  if (live() && bridgeApi?.getOption) {
    try {
      const raw = await bridgeApi.getOption(OPTION_PREFIX + entry.blockId);
      if (typeof raw === 'string' && raw) opts = JSON.parse(raw);
      else if (isObj(raw)) opts = raw;
    } catch { /* unreadable is the same as unset */ }
  }
  entry.options = opts;
  return opts;
}

async function storeOptions(entry, opts) {
  const next = isObj(opts) ? opts : null;
  entry.options = next;
  memOptions.set(entry.blockId, next);
  for (const en of frames.values()) if (en !== entry && en.blockId === entry.blockId) en.options = next;
  if (live() && bridgeApi?.setOption) await bridgeApi.setOption(next ? JSON.stringify(next) : '', OPTION_PREFIX + entry.blockId);
}

async function handleOptions(entry, meth, args, reply, fail) {
  try {
    const cur = await loadOptions(entry);
    if (meth === 'getOptions') return reply(cur ?? null);
    if (meth === 'getOption') return reply(cur && Object.prototype.hasOwnProperty.call(cur, args[0]) ? cur[args[0]] : undefined);
    if (meth === 'setOptions') { await storeOptions(entry, args[0]); return reply(null); }
    if (meth === 'setOption') { await storeOptions(entry, { ...(cur || {}), [String(args[0])]: args[1] }); return reply(null); }
    if (meth === 'clearOptions') { await storeOptions(entry, null); return reply(null); }
    return reply(null);
  } catch (e) { fail(String(e?.message || e), 'AP_OPTIONS'); }
}

// ---- Pure helpers, shared with the tests -------------------------------------------------------

/**
 * The mapping Grist would hand a widget: each requested column to the chosen column id, an array
 * for a column that allows several, null for an optional one left blank — and null for the whole
 * thing while a required column is still unmapped, which is the widget's cue to ask for it.
 */
export function resolveMappings(columns, chosen) {
  if (!Array.isArray(columns) || !columns.length) return null;
  const out = {};
  let complete = true;
  for (const c of columns) {
    const spec = typeof c === 'string' ? { name: c } : (isObj(c) ? c : null);
    if (!spec?.name) continue;
    const v = isObj(chosen) ? chosen[spec.name] : undefined;
    if (spec.allowMultiple) {
      const arr = (Array.isArray(v) ? v : (v ? [v] : [])).filter((x) => typeof x === 'string' && x);
      out[spec.name] = arr.length ? arr : (spec.optional ? [] : null);
      if (!arr.length && !spec.optional) complete = false;
    } else {
      const s = Array.isArray(v) ? v[0] : v;
      out[spec.name] = typeof s === 'string' && s ? s : null;
      if (!out[spec.name] && !spec.optional) complete = false;
    }
  }
  return complete ? out : null;
}

/** Drop the helper columns a section view never shows, unless the caller asked for everything. */
export function trimColumns(data, options) {
  if (!isObj(data)) return { id: [] };
  if (options?.includeColumns === 'all') return data;
  const out = {};
  for (const k of Object.keys(data)) if (k === 'id' || (k !== 'manualSort' && !/^gristHelper_/.test(k))) out[k] = data[k];
  if (!Array.isArray(out.id)) out.id = [];
  return out;
}

/**
 * Replace reference ids with the referenced table's visible column, the way a section view shows
 * them. `cols` is this widget's column metadata (refTable / refVisibleCol per column); each
 * referenced table is fetched once. A reference to a row that is gone, or a table that cannot be
 * read, keeps its id rather than failing the whole fetch.
 */
export async function expandReferences(data, cols, fetchTable) {
  const refCols = (cols || []).filter((c) => c && c.refTable && c.refVisibleCol && Array.isArray(data?.[c.id]));
  if (!refCols.length) return data;
  const labels = new Map();   // refTable -> Map(rowId -> visible value)
  for (const table of new Set(refCols.map((c) => c.refTable))) {
    try {
      const t = await fetchTable(table);
      const m = new Map();
      const col = refCols.find((c) => c.refTable === table).refVisibleCol;
      for (let i = 0; i < (t?.id?.length || 0); i++) m.set(t.id[i], t[col] ? t[col][i] : t.id[i]);
      labels.set(table, m);
    } catch { /* keep the ids for this table */ }
  }
  const out = { ...data };
  for (const c of refCols) {
    const m = labels.get(c.refTable);
    if (!m) continue;
    // 0 is Grist's "no reference" and shows as empty; null stays null; an unknown id is kept as is.
    const one = (id) => (typeof id !== 'number' ? id : (id > 0 && m.has(id) ? m.get(id) : (id === 0 ? '' : id)));
    out[c.id] = data[c.id].map((v) => {
      if (Array.isArray(v) && v[0] === 'L') return ['L', ...v.slice(1).map(one)];
      return one(v);
    });
  }
  return out;
}

/** One row of a columnar table as the record object fetchSelectedRecord returns. */
export function pickRow(data, rowId) {
  const i = Array.isArray(data?.id) ? data.id.indexOf(rowId) : -1;
  if (i < 0) throw new Error(`Row ${rowId} is not in this table`);
  const rec = { id: rowId };
  for (const k of Object.keys(data)) if (k !== 'id') rec[k] = Array.isArray(data[k]) ? data[k][i] : undefined;
  return rec;
}

/** The plugin API script, served beside this widget so a nested embed needs no outside host. */
export function pluginApiUrl() {
  try { return new URL('vendor/grist-plugin-api.js', document.baseURI).href; } catch { return 'vendor/grist-plugin-api.js'; }
}

// For the tests: run the receiver without a real window, and choose what "live" means.
export const _internals = { handleMessage, reset() {
  pendingFrames.length = 0; frames.clear(); relayed.clear(); memOptions.clear();
  lastTheme = null; lastSettings = null; lastTableId = null; nextId = 1;
}, setBridge(b) { bridgeApi = b; } };

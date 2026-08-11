// Thin wrapper around the Grist Plugin API. Everything is defensive: if `grist` is not
// present (e.g. the page is opened directly, outside Grist), every call resolves to a
// safe empty value so the app falls back to Demo mode. ANUPRESS never sends data anywhere;
// all calls below talk only to the embedding Grist document.

export const CONFIG_TABLE = 'ANUPRESS_Config';
export const THEME_TABLE = 'ANUPRESS_Theme';
const CONFIG_KEY = 'site';
const OPTION_KEY = 'anupressSiteConfig';

const g = () => (typeof window !== 'undefined' ? window.grist : undefined);

// window.grist exists whenever the API script is loaded — even outside Grist. So presence
// alone is not enough; `connect()` performs a timed handshake to decide if we're truly live.
const apiPresent = () => { try { return !!g() && typeof g().ready === 'function'; } catch { return false; } };

let _connected = false;
let _access = 'none';
export const isLive = () => _connected;
export const hasGrist = () => _connected;        // kept for callers; now means "really connected"
export const accessLevel = () => _access;

function withTimeout(promise, ms, label) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout:' + (label || ''))), ms)),
  ]);
}

// Probe whether we're embedded in a responsive Grist. Resolves quickly to false when the
// page is opened standalone (GitHub Pages / preview) so the app can render Demo mode.
export async function connect(timeoutMs = 1500) {
  if (_connected) return true;
  if (!apiPresent()) return false;
  // Explicit demo flag (?demo) — preview the editor anywhere without touching Grist.
  try { const p = new URLSearchParams(location.search); if (p.has('demo') || p.has('apdemo')) return false; } catch {}
  // Top-level (not in an iframe) => definitely not embedded in Grist.
  try { if (window.self === window.top) return false; } catch { /* cross-origin => in a frame */ }
  try {
    await withTimeout(g().ready({ requiredAccess: 'read table' }), timeoutMs, 'ready');
    _connected = true; _access = 'read table';
    return true;
  } catch (e) { return false; }
}

// Call grist.ready with the requested access (escalation). Only meaningful once connected.
// The timeout is generous: the user may take a while to click "Allow" in Grist's own prompt.
export async function ready(requiredAccess = 'read table', timeoutMs = 120000) {
  if (!apiPresent()) return false;
  try {
    await withTimeout(g().ready({ requiredAccess }), timeoutMs, 'ready');
    _connected = true; _access = requiredAccess;
    return true;
  } catch (e) { console.warn('[ANUPRESS] grist.ready failed', e); return false; }
}
export const escalateToFull = () => ready('full');

// ---- Schema ----
export async function listTables() {
  if (!hasGrist()) return [];
  try {
    const ids = await g().docApi.listTables();
    return ids.filter((t) => !/^_grist_/.test(t) && t !== CONFIG_TABLE && t !== THEME_TABLE);
  } catch { return []; }
}

// columnar { id:[...], col:[...] } -> array of row objects
function columnarToRows(tbl) {
  const keys = Object.keys(tbl || {});
  const n = tbl?.id?.length || 0;
  const rows = [];
  for (let i = 0; i < n; i++) { const r = {}; for (const k of keys) r[k] = tbl[k][i]; rows.push(r); }
  return rows;
}

// Meta tables cache — _grist_Tables and _grist_Tables_column change so rarely that a per-session
// fetch is safe and cheap. Without this cache, GristProvider.init() re-fetched both tables for
// every user table (9 tables → 18 network round-trips). One promise each, reused.
let _metaTablesP = null, _metaColumnsP = null, _metaAttachmentsP = null;
function fetchMetaTables()  { return _metaTablesP  ||= g().docApi.fetchTable('_grist_Tables'); }
function fetchMetaColumns() { return _metaColumnsP ||= g().docApi.fetchTable('_grist_Tables_column'); }
function fetchMetaAttachments() { return _metaAttachmentsP ||= g().docApi.fetchTable('_grist_Attachments'); }
export function invalidateMetaCache() { _metaTablesP = null; _metaColumnsP = null; _metaAttachmentsP = null; }

// ---- Attachments ----
// An Attachments-type cell value comes back from fetchTable as either null (empty) or a
// Grist list-tuple ['L', id1, id2, ...] (occasionally a bare array/number defensively tolerated
// too). We only ever show the first attached file per cell.
export function firstAttachmentId(cellValue) {
  if (cellValue == null) return null;
  if (typeof cellValue === 'number') return cellValue;
  if (Array.isArray(cellValue)) {
    const list = cellValue[0] === 'L' ? cellValue.slice(1) : cellValue;
    return list.length ? list[0] : null;
  }
  return null;
}

// Resolve a raw attachment row id to live metadata + a FRESH, token-authed download URL.
// Access tokens are short-lived — this is never cached; call it again each time you need the URL
// (e.g. every render pass), and never persist the resolved `url` itself into saved config.
export async function resolveAttachmentById(attId) {
  if (!hasGrist() || attId == null) return null;
  try {
    const meta = await fetchMetaAttachments();
    const idx = (meta.id || []).indexOf(attId);
    if (idx < 0) return null;
    const token = await g().docApi.getAccessToken({ readOnly: true });
    if (!token?.baseUrl || !token?.token) return null;
    return {
      id: attId,
      url: `${token.baseUrl}/attachments/${attId}/download?auth=${token.token}`,
      fileName: meta.fileName?.[idx] ?? null,
      fileType: meta.fileType?.[idx] ?? null,
      imageWidth: meta.imageWidth?.[idx] ?? null,
      imageHeight: meta.imageHeight?.[idx] ?? null,
    };
  } catch (e) { console.warn('[ANUPRESS] resolveAttachmentById failed', e); return null; }
}

// Convenience for block renderers that already have the row (e.g. from provider.records()) —
// resolves an Attachments-column cell value directly, avoiding a second per-row schema round trip.
export async function resolveAttachmentCell(cellValue) {
  const id = firstAttachmentId(cellValue);
  return id == null ? null : resolveAttachmentById(id);
}

// Read real column types from Grist metadata; fall back to value inference.
export async function getColumns(tableId) {
  if (!hasGrist()) return [];
  try {
    const [metaT, metaC] = await Promise.all([fetchMetaTables(), fetchMetaColumns()]);
    const tRowToId = {};
    for (let i = 0; i < metaT.id.length; i++) tRowToId[metaT.id[i]] = metaT.tableId[i];
    const cols = [];
    for (let i = 0; i < metaC.id.length; i++) {
      if (tRowToId[metaC.parentId[i]] !== tableId) continue;
      const colId = metaC.colId[i];
      if (!colId || colId === 'manualSort' || /^gristHelper_/.test(colId)) continue;
      cols.push({ id: colId, label: metaC.label[i] || colId, type: String(metaC.type[i] || 'Text') });
    }
    if (cols.length) return cols;
  } catch (e) { /* fall through to inference */ }
  try {
    const tbl = await g().docApi.fetchTable(tableId);
    return inferColumns(tbl);
  } catch { return []; }
}

function inferColumns(tbl) {
  return Object.keys(tbl).filter((k) => k !== 'id' && k !== 'manualSort' && !/^gristHelper_/.test(k))
    .map((k) => ({ id: k, label: k, type: inferType(tbl[k]) }));
}
function inferType(values) {
  let num = 0, total = 0;
  for (const v of values) { if (v == null || v === '') continue; total++; if (typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v))) num++; }
  if (total && num / total > 0.85) return 'Numeric';
  return 'Text';
}

// Fetch rows, converting Grist Date/DateTime timestamps to ISO date strings for display.
export async function getRecords(tableId, columns) {
  if (!hasGrist()) return [];
  try {
    const tbl = await g().docApi.fetchTable(tableId);
    let rows = columnarToRows(tbl);
    const dateCols = (columns || []).filter((c) => /^(Date|DateTime)/i.test(c.type)).map((c) => c.id);
    if (dateCols.length) rows = rows.map((r) => { const o = { ...r }; for (const c of dateCols) o[c] = toDateStr(r[c]); return o; });
    return rows;
  } catch { return []; }
}
function toDateStr(v) {
  if (v == null || v === '') return null;
  const ms = typeof v === 'number' ? v * 1000 : Date.parse(v);
  if (!isFinite(ms)) return v;
  return new Date(ms).toISOString().slice(0, 10);
}

// ---- Widget options (persist without needing full doc access) ----
export async function getOption(key = OPTION_KEY) {
  if (!hasGrist()) return null;
  try { if (g().getOption) return await g().getOption(key);
    if (g().widgetApi) { const o = await g().widgetApi.getOptions(); return o ? o[key] : null; } } catch {}
  return null;
}
export async function setOption(value, key = OPTION_KEY) {
  if (!hasGrist()) return false;
  try { if (g().setOption) { await g().setOption(key, value); return true; }
    if (g().widgetApi) { await g().widgetApi.setOptions({ [key]: value }); return true; } } catch {}
  return false;
}

// ---- Table creation + config persistence (needs full access) ----
export async function ensureTables() {
  if (!hasGrist()) return false;
  const existing = new Set(await safeListAll());
  const actions = [];
  // Everything (layout, theme, logo, custom icons) lives in this one table's JSON value.
  if (!existing.has(CONFIG_TABLE)) actions.push(['AddTable', CONFIG_TABLE, [{ id: 'Key', type: 'Text' }, { id: 'Value', type: 'Text' }]]);
  if (!actions.length) return true;
  try { await g().docApi.applyUserActions(actions); invalidateMetaCache(); return true; }
  catch (e) { console.warn('[ANUPRESS] ensureTables failed', e); return false; }
}
async function safeListAll() { try { return await g().docApi.listTables(); } catch { return []; }

}

export async function saveConfig(configObj) {
  const json = JSON.stringify(configObj);
  await setOption(json); // fast render cache (always attempt)
  if (!hasGrist()) return false;
  try {
    await ensureTables();
    const tbl = await g().docApi.fetchTable(CONFIG_TABLE);
    let rowId = null;
    for (let i = 0; i < (tbl.id?.length || 0); i++) if (tbl.Key[i] === CONFIG_KEY) { rowId = tbl.id[i]; break; }
    if (rowId) await g().docApi.applyUserActions([['UpdateRecord', CONFIG_TABLE, rowId, { Value: json }]]);
    else await g().docApi.applyUserActions([['AddRecord', CONFIG_TABLE, null, { Key: CONFIG_KEY, Value: json }]]);
    return true;
  } catch (e) { console.warn('[ANUPRESS] saveConfig table write failed', e); return false; }
}

export async function loadConfig() {
  // Prefer the widget-option cache (cheap, low access); fall back to the table.
  const opt = await getOption();
  if (opt) { try { return JSON.parse(opt); } catch {} }
  if (!hasGrist()) return null;
  try {
    const ids = await g().docApi.listTables();
    if (!ids.includes(CONFIG_TABLE)) return null;
    const tbl = await g().docApi.fetchTable(CONFIG_TABLE);
    for (let i = 0; i < (tbl.id?.length || 0); i++) if (tbl.Key[i] === CONFIG_KEY) return JSON.parse(tbl.Value[i]);
  } catch (e) { console.warn('[ANUPRESS] loadConfig failed', e); }
  return null;
}

// ---- Writing to the user's own tables (needs full access) ----
// Used by blocks that let a viewer edit data in place (currently just the Calendar block's
// drag-to-reschedule). Every other block in this app is read-only; this is the one write path
// into a table the user didn't create for us. Fails closed (returns false) rather than throwing,
// since the caller only has 'read table' access until someone has gone through our own Edit flow
// at least once this session — a plain viewer attempting this will hit that, not a crash.
export async function updateRecord(table, rowId, fields) {
  if (!hasGrist() || rowId == null) return false;
  try { await g().docApi.applyUserActions([['UpdateRecord', table, rowId, fields]]); return true; }
  catch (e) { console.warn('[ANUPRESS] updateRecord failed', e); return false; }
}

export async function getDocName() {
  if (!hasGrist()) return null;
  try { return await g().docApi.getDocName(); } catch { return null; }
}

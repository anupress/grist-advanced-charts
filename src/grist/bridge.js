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

// Read real column types from Grist metadata; fall back to value inference.
export async function getColumns(tableId) {
  if (!hasGrist()) return [];
  try {
    const [metaT, metaC] = await Promise.all([
      g().docApi.fetchTable('_grist_Tables'),
      g().docApi.fetchTable('_grist_Tables_column'),
    ]);
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
  try { await g().docApi.applyUserActions(actions); return true; }
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

export async function getDocName() {
  if (!hasGrist()) return null;
  try { return await g().docApi.getDocName(); } catch { return null; }
}

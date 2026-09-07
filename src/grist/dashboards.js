// Several dashboards in one document.
//
// Every widget instance used to read the one design row, so two widgets in a document could only
// mirror each other (reported on the community forum: Operations and Finance wanted their own).
// Now a dashboard is a KEY in the same config table, and each widget instance remembers which one
// it shows in its own widget options — which Grist keeps per instance, so a viewer with plain read
// access still lands on the right one.
//
// The default dashboard keeps the key it always had, `site`, with its chunks under `site~…`; every
// other dashboard is `site:<id>` with chunks under `site:<id>~…`. An existing document therefore
// reads exactly as it did, and a document that never makes a second dashboard never sees this.
// Ids are slugs: lowercase letters, digits and hyphens, so no id can contain the `:` or `~` that the
// keys are built from. The registry row `dashboards` holds the display names.
//
// Pure: no Grist calls here, so a test can hold every key shape against a fake table.

export const DEFAULT_DASHBOARD = 'site';
export const DEFAULT_NAME = 'Main dashboard';
export const REGISTRY_KEY = 'dashboards';
export const POINTER_OPTION = 'anupressDashboard';
const OPTION_BASE = 'anupressSiteConfig';
const ID_MAX = 40;

/** A safe id from a name: "Finance 2026" → "finance-2026". Never empty, never the default's id. */
export function slugId(name) {
  let s = String(name || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, ID_MAX).replace(/-+$/g, '');
  if (!s) s = 'dashboard';
  if (s === DEFAULT_DASHBOARD) s = 'dashboard';
  return s;
}

/** True for an id this module could have made: the only shape the keys below accept. */
export function isValidId(id) {
  return typeof id === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,39})$/.test(id);
}

/** The slug, made unique against the ids already in use: "ops", "ops-2", "ops-3". */
export function uniqueId(name, existingIds) {
  const base = slugId(name);
  const taken = new Set(existingIds || []);
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) { const id = `${base.slice(0, ID_MAX - 4)}-${n}`; if (!taken.has(id)) return id; }
  return `${base.slice(0, ID_MAX - 8)}-${Date.now().toString(36)}`;
}

export const configKeyFor = (id) => (id === DEFAULT_DASHBOARD ? DEFAULT_DASHBOARD : `${DEFAULT_DASHBOARD}:${id}`);
export const chunkPrefixFor = (id) => configKeyFor(id) + '~';
export const isChunkOf = (key, id) => String(key || '').startsWith(chunkPrefixFor(id));
export const optionKeyFor = (id) => (id === DEFAULT_DASHBOARD ? OPTION_BASE : `${OPTION_BASE}:${id}`);

/** The dashboard a config-table key belongs to, or null for keys that are not a design row. */
export function dashboardOfKey(key) {
  const k = String(key || '');
  if (k === DEFAULT_DASHBOARD) return DEFAULT_DASHBOARD;
  if (k.startsWith(DEFAULT_DASHBOARD + '~')) return DEFAULT_DASHBOARD;
  const m = /^site:([a-z0-9-]+)(~|$)/.exec(k);
  return m ? m[1] : null;
}

/**
 * The registry as a list, always with the default first. Tolerates a missing, empty or damaged
 * row, and takes `foundIds` (dashboards whose rows exist in the table but were never registered,
 * say after a hand edit) so nothing that exists is invisible.
 */
export function parseRegistry(json, foundIds = []) {
  let list = [];
  try { const v = JSON.parse(json || '[]'); if (Array.isArray(v)) list = v; } catch { list = []; }
  const out = [];
  const seen = new Set();
  const push = (id, name) => { if (!isValidId(id) || seen.has(id)) return; seen.add(id); out.push({ id, name: String(name || '').trim() || id }); };
  push(DEFAULT_DASHBOARD, (list.find((d) => d && d.id === DEFAULT_DASHBOARD) || {}).name || DEFAULT_NAME);
  for (const d of list) if (d && d.id !== DEFAULT_DASHBOARD) push(d.id, d.name);
  for (const id of foundIds) if (id !== DEFAULT_DASHBOARD) push(id, id);
  return out;
}

export const serializeRegistry = (list) => JSON.stringify((list || []).map((d) => ({ id: d.id, name: d.name })));

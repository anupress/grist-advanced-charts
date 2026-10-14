// Tiny DOM + helper kit shared across modules. No framework, no dependencies.

// Valid HTML attribute name (spec-lax): starts with letter/underscore, then letters/digits/hyphens/dots/colons/underscores.
const ATTR_RE = /^[a-zA-Z_][\w.:-]*$/;

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') { node.className = v; continue; }
    if (k === 'html') { node.innerHTML = v; continue; }
    if (k === 'text') { node.textContent = v; continue; }
    if (k === 'dataset') { Object.assign(node.dataset, v); continue; }
    // Object.assign onto a style declaration silently drops CUSTOM properties: assigning
    // '--ap-inv-accent' just puts a JS property on the object and never reaches the element, which
    // is why an invoice's Accent colour and a calendar's "Color events by" rendered as the theme's
    // primary however they were set. Custom properties need setProperty; ordinary ones still assign.
    if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (val == null || val === false) continue;
        if (prop.startsWith('--')) node.style.setProperty(prop, String(val));
        else node.style[prop] = val;
      }
      continue;
    }
    if (k.startsWith('on') && typeof v === 'function') { node.addEventListener(k.slice(2).toLowerCase(), v); continue; }
    if (k in node && k !== 'list') { try { node[k] = v; continue; } catch {} }
    // Fall-through: only call setAttribute with a name the DOM will accept —
    // otherwise a mangled key crashes the whole render with DOMException.
    if (ATTR_RE.test(k)) { try { node.setAttribute(k, v); } catch {} }
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Build a node from a trusted HTML string (our own SVG icon strings).
export function fromHTML(htmlStr) {
  const t = document.createElement('template');
  t.innerHTML = htmlStr.trim();
  return t.content.firstElementChild;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

export const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 9);

export const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

export function debounce(fn, ms = 180) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---------------- Locale ----------------
// Numbers are written the way the DOCUMENT's readers write them: 1,234.56 in English, 1.234,56 in
// German, 1 234,56 in French. Grist hands a custom widget the document's locale (Document settings →
// Locale) as ?culture= and its currency as ?currency=; outside Grist (the web demo) the browser's
// language stands in. Before 3.9 every number followed the visitor's browser instead, compact
// figures and currency symbols were English-only ("€1.2K" for a German document), and the data
// editor read "9,50" as 950.
let LOCALE = null;
let CURRENCY;
export function docLocale() {
  if (LOCALE) return LOCALE;
  let l = null;
  try { l = new URLSearchParams(globalThis.location?.search || '').get('culture'); } catch {}
  if (!l) l = globalThis.navigator?.language || 'en-US';
  l = String(l).replace(/_/g, '-');
  try { if (!Intl.NumberFormat.supportedLocalesOf([l]).length) l = 'en-US'; } catch { l = 'en-US'; }
  return (LOCALE = l);
}
/** The document's currency code (Grist's ?currency=), or null outside Grist. */
export function docCurrency() {
  if (CURRENCY !== undefined) return CURRENCY;
  let c = null;
  try { c = new URLSearchParams(globalThis.location?.search || '').get('currency'); } catch {}
  return (CURRENCY = c && /^[A-Z]{3}$/i.test(c) ? c.toUpperCase() : null);
}
/** For the tests, and for a page that learns its locale after loading. */
export function setLocale(locale, currency) { LOCALE = locale || null; CURRENCY = currency === undefined ? undefined : currency; }
const isEnglish = () => /^en(-|$)/i.test(docLocale());
// Where the locale puts a currency symbol, and whether a space separates it: read from how it
// writes euros, then applied to whatever symbol the author typed ("€", "$", "CHF").
function withCurrency(num, sym) {
  if (!sym) return num;
  if (isEnglish()) return sym + num;   // unchanged from before 3.9: "$1.17M", "€1,234.56"
  let after = true, space = ' ';
  try {
    const parts = new Intl.NumberFormat(docLocale(), { style: 'currency', currency: 'EUR' }).formatToParts(1);
    const ci = parts.findIndex((p) => p.type === 'currency');
    const ni = parts.findIndex((p) => p.type === 'integer');
    after = ci > ni;
    space = parts.some((p) => p.type === 'literal' && /\s/.test(p.value)) ? ' ' : '';
  } catch {}
  return after ? num + space + sym : sym + space + num;
}
/** The decimal and grouping characters of the document's locale. */
export function numberSymbols(locale = docLocale()) {
  let decimal = '.', group = ',';
  try {
    for (const p of new Intl.NumberFormat(locale).formatToParts(12345.6)) {
      if (p.type === 'decimal') decimal = p.value;
      if (p.type === 'group') group = p.value;
    }
  } catch {}
  return { decimal, group };
}
/**
 * Read a number as someone typed it, in their own locale: "9,50" and "1.234,56" in German, "9.50"
 * and "1,234.56" in English, "1 234,56" in French, "1'234.56" in Swiss German. Returns NaN for text
 * that is not a number. A lone separator is the decimal one unless it can only be a thousands
 * separator (another locale's decimal followed by exactly three digits): so a German "12.5" is still
 * twelve and a half, and a value shown with a point in the editor reads back as itself.
 */
export function parseLocaleNumber(raw, locale = docLocale()) {
  let s = String(raw ?? '').trim();
  if (s === '') return NaN;
  const neg = /^-|^\(.*\)$|-$/.test(s.replace(/\s/g, ''));
  s = s.replace(/[\s  '’]/g, '').replace(/[^0-9.,eE+-]/g, '').replace(/^[+-]|[+-]$/g, '');
  if (/[eE]/.test(s) && /^\d*\.?\d+[eE][+-]?\d+$/.test(s)) return (neg ? -1 : 1) * Number(s);
  s = s.replace(/[eE+-]/g, '');
  if (!/\d/.test(s)) return NaN;
  const { decimal } = numberSymbols(locale);
  const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
  let dec = null;
  if (dots && commas) dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  else if (dots + commas === 1) {
    const sep = dots ? '.' : ',';
    const tail = s.slice(s.indexOf(sep) + 1);
    dec = sep === decimal || tail.length !== 3 ? sep : null;
  }
  // more than one of a single separator: they are all thousands separators
  const grp = dec === '.' ? ',' : dec === ',' ? '.' : null;
  if (grp) s = s.split(grp).join('');
  if (!dec) s = s.replace(/[.,]/g, '');
  else s = s.replace(dec, '.');
  const n = Number(s);
  return isFinite(n) ? (neg ? -n : n) : NaN;
}

/**
 * A percentage the caller has already rounded ("30.92", 7, "0.50"), with the locale's decimal sign
 * and the space it puts before "%": "30.92%" in English (exactly as before 3.9), "30,92 %" in German.
 */
export function pctText(num) {
  const s = String(num);
  if (isEnglish()) return s + '%';
  let gap = ' ';
  try {
    const parts = new Intl.NumberFormat(docLocale(), { style: 'percent' }).formatToParts(0.5);
    const lit = parts.find((p) => p.type === 'literal');
    gap = lit ? lit.value : '';
  } catch {}
  return s.replace('.', numberSymbols().decimal) + gap + '%';
}

// Human-friendly number formatting (1.2K, 3.4M, currency, percent), in the document's locale.
export function fmtNumber(v, opts = {}) {
  if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  const L = docLocale();
  const { compact, currency, percent, decimals } = opts;
  if (percent) {
    if (isEnglish()) return (n).toLocaleString(L, { maximumFractionDigits: decimals ?? 1 }) + '%';
    try { return new Intl.NumberFormat(L, { style: 'percent', maximumFractionDigits: decimals ?? 1 }).format(n / 100); } catch {}
    return (n).toLocaleString(L, { maximumFractionDigits: decimals ?? 1 }) + '%';
  }
  if (compact && Math.abs(n) >= 1000) {
    if (isEnglish()) {
      const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
      for (const [s, f] of units) if (Math.abs(n) >= f) return (currency ? currency : '') + trimZero(n / f) + s;
    }
    // other locales use their own short forms: "1,17 Mio." in German, "1,17 M" in French
    try { return withCurrency(new Intl.NumberFormat(L, { notation: 'compact', maximumFractionDigits: 2 }).format(n), currency); } catch {}
  }
  const fixed = decimals != null ? n.toFixed(decimals) : trimZero(Math.round(n * 100) / 100);
  // Asked for a number of decimals, it shows exactly that many: an invoice reads €30.50, not €30.5
  // (toLocaleString drops trailing zeros unless told the minimum too). 3.10.0
  return withCurrency(Number(fixed).toLocaleString(L, { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 2 }), currency);
}
function trimZero(n) { return String(Number(n.toFixed(2))); }

/**
 * A stat card's number: as fmtNumber, but when no decimal places are set and it is not compact, a
 * figure of 1,000 or more is whole. A summed revenue read "€118,574.6", and the stat editor has no
 * decimals field to say otherwise (found building the Glutbohne case study, 3.10.5). Under 1,000 it
 * keeps up to two, so an average order of €8.73 stays €8.73.
 */
export function fmtFigure(n, format = {}) {
  const v = Number(n);
  if (format.decimals == null && !format.compact && isFinite(v) && Math.abs(v) >= 1000) return fmtNumber(Math.round(v), format);
  return fmtNumber(n, format);
}

/**
 * A progress bar's figure. Against a whole target, a figure of 1,000 or more is whole: a year's
 * revenue reads "€118,575 / €150,000", not "€118,574.6 / €150,000" (found building the Glutbohne
 * case study, 3.10.4). Smaller figures keep up to two decimals as before (an 87.35% pass rate, three
 * quarters of 1), and a target written with decimals gives every figure that many.
 */
export function fmtProgress(n, target, { prefix = '', suffix = '' } = {}) {
  const t = String(target ?? '');
  const dec = (t.split('.')[1] || '').length;
  const whole = dec === 0 && Math.abs(Number(n) || 0) >= 1000;
  const num = whole ? fmtNumber(Math.round(Number(n) || 0)) : fmtNumber(n, dec ? { decimals: dec } : {});
  return `${prefix}${num}${suffix ? ' ' + suffix : ''}`;
}

export function isFiniteNum(v) { return typeof v === 'number' ? isFinite(v) : (v !== '' && v != null && isFinite(Number(v))); }

/**
 * A short, stable fingerprint of a design.
 *
 * Used to answer one question: has anything been changed since a template was applied? Comparing
 * whole configs is no good, because several keys move on their own — the save revision, the record
 * of which tables we created, and the template stamp itself — and a viewer flipping light/dark
 * writes theme.mode without touching the design at all. Those are excluded; everything a person
 * could deliberately build is included, so adding a block, retitling a page, recolouring or
 * switching fonts all register.
 *
 * FNV-1a over the canonical JSON. Not cryptographic and does not need to be: a collision means one
 * confirmation screen phrases itself slightly wrongly.
 */
export function designSignature(config) {
  if (!config || typeof config !== 'object') return '0';
  const ignore = new Set(['__apRev', 'createdTables', 'templateId', 'templateSig']);
  const canonical = (v) => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) {
        if (ignore.has(k)) continue;
        out[k] = canonical(v[k]);
      }
      return out;
    }
    return v;
  };
  const clean = canonical(config);
  if (clean.theme) delete clean.theme.mode; // a viewer's light/dark choice is not a design change
  const s = JSON.stringify(clean);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// How a raw cell value should read to a person.
//
// Every table cell used to be String(value), which is fine for text and wrong for the two types
// that do not stringify into anything a reader recognises: a Bool became the word "true", and a
// number lost whatever format the document had given it. On screen that is untidy; on a printed
// page sent to a client it is a defect -- a fee column reading "204972" and a billing column
// reading "true" are programming artefacts, not data.
//
// Order of authority: the column's own Grist format first, then its type. We never invent a
// format the document did not ask for, except for thousands separators on Numeric, where the
// alternative is an unreadable run of digits. Int is deliberately left bare, because that is
// where years, invoice numbers and postcodes live and "2,026" would be actively wrong.
/**
 * Columns whose stored value is structurally not its display value.
 *
 * A Reference holds a row id; a ChoiceList, an Attachments cell and a Reference List all hold
 * Grist's list tuple ['L', …]. Stringifying any of them produces something that is not a rough
 * approximation of the truth but a different value entirely — "2", or "L,Red,Blue".
 *
 * One definition, used everywhere that groups, filters, sorts or prints a cell, because three
 * copies of this regex is three chances for one of them to fall behind the others. Deliberately
 * NOT a general "does this need formatting" test: Bool and Numeric also format, but their raw form
 * is still recognisably the value, and treating them here would desynchronise filter lists from the
 * plain-text inputs beside them.
 */
export const isStructuredType = (type) => /^(Ref(List)?(:|$)|ChoiceList|Attachments)/i.test(String(type || ''));

/**
 * What a row is called in a picker (the Image block's Row list): its name, title or label column,
 * else the table's first text column, else "Row 7". A Products table names its rows in a column
 * called Product, and before the fallback its rows were offered as "Row 1", "Row 2"... (3.10.11).
 */
export function rowLabel(row, cols) {
  const plain = (cols || []).filter((c) => c && c.id !== 'id' && c.id !== 'manualSort' && !isStructuredType(c.type));
  const named = plain.find((c) => /name|title|label/i.test(c.id)) || plain.find((c) => String(c.type || 'Text') === 'Text');
  const val = named ? row[named.id] : null;
  return val != null && val !== '' ? String(val) : `Row ${row.id}`;
}

export function formatCellValue(value, col) {
  if (value == null || value === '') return '';
  const type = String(col?.type || '');

  // References are how Grist does relationships, so they turn up in most real documents — and what
  // it stores in the cell is a row id. Printing that raw is not a formatting nicety we skipped, it
  // is the wrong value: an invoice's client reads as "4", and a chart grouped by that column groups
  // by numbers nobody recognises. A Reference List arrives as Grist's list tuple ['L', 1, 2],
  // which stringifies to the memorable nonsense "L,1,2".
  //
  // `refLabels` is supplied by the provider, which has the referenced table cached whole. One fetch
  // per referenced TABLE, never one per row — that distinction is the difference between this
  // working and it being the "too many fetches" problem in a different coat.
  if (/^Ref(List)?(:|$)/i.test(type)) {
    const labels = col?.refLabels || null;
    const one = (id) => {
      const v = labels ? labels[id] : undefined;
      return v == null || v === '' ? String(id) : String(v);
    };
    if (/^RefList/i.test(type)) {
      const list = Array.isArray(value) ? (value[0] === 'L' ? value.slice(1) : value) : [value];
      return list.filter((x) => x != null && x !== 0 && x !== '').map(one).join(', ');
    }
    // 0 is Grist's empty reference, not a row.
    return value === 0 ? '' : one(value);
  }

  // Grist stores every list-shaped cell as the same tuple, ['L', …], so ChoiceList and Attachments
  // fall into exactly the trap Reference List did: String() on one produces "L,Red,Blue", which is
  // not a near-miss but a made-up value with a stray letter at the front. A ChoiceList is the
  // multi-select tag column people reach for constantly, so this is worth spelling out separately
  // rather than leaving to the default.
  if (/^ChoiceList/i.test(type)) {
    const list = Array.isArray(value) ? (value[0] === 'L' ? value.slice(1) : value) : [value];
    return list.filter((x) => x != null && x !== '').join(', ');
  }
  if (/^Attachments/i.test(type)) {
    // The ids mean nothing to a reader and the filenames are not in this cell — they live in
    // _grist_Attachments, which this pure function has no way to reach. A count is the honest
    // thing a table cell can say about them.
    const list = Array.isArray(value) ? (value[0] === 'L' ? value.slice(1) : value) : [value];
    const n = list.filter((x) => x != null && x !== '').length;
    return n ? `${n} file${n === 1 ? '' : 's'}` : '';
  }

  if (/^Bool/i.test(type) || typeof value === 'boolean') {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === 'true' || value === 1 || value === '1') return 'Yes';
    if (value === 'false' || value === 0 || value === '0') return 'No';
  }

  if (/^(Numeric|Int|Currency)/i.test(type) && isFiniteNum(value)) {
    const n = Number(value);
    const o = col?.widgetOptions || {};
    const mode = o.numMode;
    const min = o.decimals, max = o.maxDecimals;
    if (mode || min != null || max != null) {
      // A currency column with no decimals set shows what Grist shows: the currency's own digits, €1,581.00 beside €3,420.45,
      // where trimming gave €1,581 in a column of cents (found building the Glutbohne case study, 3.10.6).
      const fmt = mode === 'currency' && min == null && max == null ? {}
        : { minimumFractionDigits: min ?? 0, maximumFractionDigits: max ?? Math.max(min ?? 0, 2) };
      if (mode === 'currency') { fmt.style = 'currency'; fmt.currency = o.currency || docCurrency() || 'USD'; }
      else if (mode === 'percent') fmt.style = 'percent';
      else if (mode === 'scientific') return n.toExponential(max ?? min ?? 2);
      if (mode === 'decimal' || !mode) fmt.useGrouping = true;
      try { return n.toLocaleString(docLocale(), fmt); } catch { return String(n); }
    }
    if (/^Int/i.test(type)) return String(n);
    return n.toLocaleString(docLocale(), { maximumFractionDigits: 2 });
  }

  return String(value);
}

/**
 * A value as a category: a slicer's choice, a chart's group. Like formatCellValue, except that a whole
 * number in a column with no number format is written as Grist writes it, 2026 and not 2,026: a Year
 * column made with YEAR() is Numeric, and its slicer read "2,026" (3.10.0). Values in a table keep
 * formatCellValue, where one column must not mix 1200 and 1,200.50 from row to row.
 */
export function formatCategory(value, col) {
  const type = String(col?.type || '');
  const o = col?.widgetOptions || {};
  if (/^(Numeric|Int)/i.test(type) && isFiniteNum(value) && Number.isInteger(Number(value))
    && !o.numMode && o.decimals == null && o.maxDecimals == null) return String(Number(value));
  return formatCellValue(value, col);
}

// Replace %placeholders in a template with values (numbers are locale-formatted).
export function interpolate(template, vars) {
  return String(template == null ? '' : template).replace(/%(\w+)/g, (m, k) => {
    if (!(k in vars)) return m;
    const v = vars[k];
    return typeof v === 'number' ? v.toLocaleString(docLocale()) : String(v ?? '');
  });
}

// Quick toast notification.
let toastTimer;
export function toast(msg, kind = '') {
  let t = document.querySelector('.ap-toast');
  if (!t) { t = el('div', { class: 'ap-toast' }); document.body.appendChild(t); }
  t.className = 'ap-toast' + (kind ? ' ap-toast--' + kind : '');
  t.textContent = msg;
  // setTimeout, not rAF — rAF is starved while the page is not compositing (inactive Grist tab),
  // and a "Saved" confirmation that never appears is worse than one that appears un-animated.
  setTimeout(() => t.classList.add('is-show'), 0);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

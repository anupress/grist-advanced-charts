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
    if (k === 'style' && typeof v === 'object') { Object.assign(node.style, v); continue; }
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

// Human-friendly number formatting (1.2K, 3.4M, currency, percent).
export function fmtNumber(v, opts = {}) {
  if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  const { compact, currency, percent, decimals } = opts;
  if (percent) return (n).toLocaleString(undefined, { maximumFractionDigits: decimals ?? 1 }) + '%';
  if (compact && Math.abs(n) >= 1000) {
    const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
    for (const [s, f] of units) if (Math.abs(n) >= f) return (currency ? currency : '') + trimZero(n / f) + s;
  }
  const fixed = decimals != null ? n.toFixed(decimals) : trimZero(Math.round(n * 100) / 100);
  return (currency || '') + Number(fixed).toLocaleString(undefined, { maximumFractionDigits: decimals ?? 2 });
}
function trimZero(n) { return String(Number(n.toFixed(2))); }

export function isFiniteNum(v) { return typeof v === 'number' ? isFinite(v) : (v !== '' && v != null && isFinite(Number(v))); }

// Replace %placeholders in a template with values (numbers are locale-formatted).
export function interpolate(template, vars) {
  return String(template == null ? '' : template).replace(/%(\w+)/g, (m, k) => {
    if (!(k in vars)) return m;
    const v = vars[k];
    return typeof v === 'number' ? v.toLocaleString() : String(v ?? '');
  });
}

// Quick toast notification.
let toastTimer;
export function toast(msg, kind = '') {
  let t = document.querySelector('.ap-toast');
  if (!t) { t = el('div', { class: 'ap-toast' }); document.body.appendChild(t); }
  t.className = 'ap-toast' + (kind ? ' ap-toast--' + kind : '');
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('is-show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
}

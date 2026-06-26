// Tiny DOM + helper kit shared across modules. No framework, no dependencies.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in node && k !== 'list') { try { node[k] = v; } catch { node.setAttribute(k, v); } }
    else node.setAttribute(k, v);
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

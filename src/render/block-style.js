// Per-block layout and style: the options every block carries on top of its own settings.
//
// A block's `style` is a small optional object beside `config` — margin, padding, min-height, how
// many rows or columns it spans, how it aligns in its cell, background, border, radius, shadow,
// which screens it hides on, a CSS id and classes, a z-index. Absent means default, so a design
// from before this existed reads unchanged. This module turns that object into the inline styles
// and classes the renderer applies; it is pure so a test can hold it against the shapes.
//
// Three targets, because the wrapper and the card do different jobs: the wrapper (`.ap-block`) is
// the grid item on the page, so it takes margin, order, row span and visibility; the card inside it
// takes padding, background, border and shadow, which the page's own card styles already live on;
// and inside a Grid block the cell is the grid item, so spans and alignment go there.

export const SHADOWS = ['default', 'none', 'soft', 'bold'];
export const ALIGNS = ['stretch', 'start', 'center', 'end'];
export const MAX_SPAN = 4;
export const MAX_MIN_HEIGHT = 4000;
export const MAX_SPACING = 400;

const num = (v, max, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const px = (v, max) => { const n = num(v, max); return n === null || n === 0 ? null : n + 'px'; };
const sides = (box, max) => {
  const out = {};
  if (!box || typeof box !== 'object') return out;
  for (const [k, prop] of [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']]) {
    const v = px(box[k], max);
    if (v) out[prop] = v;
  }
  return out;
};
const SAFE_ID = /[^A-Za-z0-9_-]/g;

/** True when the block has any layout/style option set, so the editor can open the section. */
export function hasStyle(style) {
  if (!style || typeof style !== 'object') return false;
  return Object.values(style).some((v) => v !== null && v !== undefined && v !== '' && v !== false
    && !(typeof v === 'object' && !Object.values(v).some((x) => x !== null && x !== undefined && x !== '' && x !== false)));
}

/**
 * @param {object} style  block.style, possibly undefined
 * @param {{ nested?: boolean }} opts  nested = the block sits in a Grid block's cell
 * @returns {{ wrap: object, inner: object, cell: object, classes: string[], id: string|null }}
 */
export function styleFor(style, { nested = false } = {}) {
  const s = style && typeof style === 'object' ? style : {};
  const wrap = {}, inner = {}, cell = {}, classes = [];

  for (const [side, v] of Object.entries(sides(s.margin, MAX_SPACING))) wrap['margin' + side] = v;
  for (const [side, v] of Object.entries(sides(s.padding, MAX_SPACING))) inner['padding' + side] = v;

  const minH = px(s.minHeight, MAX_MIN_HEIGHT);
  if (minH) inner.minHeight = minH;

  const rowSpan = num(s.rowSpan, MAX_SPAN, 1);
  const colSpan = num(s.colSpan, MAX_SPAN, 1);
  const order = num(s.order, 99, -99);
  if (nested) {
    if (colSpan && colSpan > 1) cell.gridColumn = `span ${Math.round(colSpan)}`;
    if (rowSpan && rowSpan > 1) cell.gridRow = `span ${Math.round(rowSpan)}`;
    if (ALIGNS.includes(s.alignSelf) && s.alignSelf !== 'stretch') cell.alignSelf = s.alignSelf;
    if (order) cell.order = String(Math.round(order));
  } else {
    if (rowSpan && rowSpan > 1) wrap.gridRow = `span ${Math.round(rowSpan)}`;
    if (order) wrap.order = String(Math.round(order));
  }

  if (typeof s.bg === 'string' && s.bg) inner.background = s.bg;
  const bw = num(s.borderWidth, 20);
  if (bw) { inner.borderWidth = bw + 'px'; inner.borderStyle = 'solid'; }
  if (typeof s.borderColor === 'string' && s.borderColor) inner.borderColor = s.borderColor;
  const radius = num(s.radius, 80);
  if (radius !== null && s.radius !== '' && s.radius !== undefined && s.radius !== null) inner.borderRadius = radius + 'px';
  if (s.shadow === 'none') inner.boxShadow = 'none';
  else if (s.shadow === 'soft') inner.boxShadow = 'var(--ap-shadow-sm)';
  else if (s.shadow === 'bold') inner.boxShadow = 'var(--ap-shadow-lg)';

  const hide = s.hide && typeof s.hide === 'object' ? s.hide : {};
  const hiddenOn = [];
  if (hide.phone) { classes.push('ap-hide-phone'); hiddenOn.push('phones'); }
  if (hide.tablet) { classes.push('ap-hide-tablet'); hiddenOn.push('tablets'); }
  if (hide.desktop) { classes.push('ap-hide-desktop'); hiddenOn.push('desktops'); }
  if (typeof s.cssClass === 'string') for (const c of s.cssClass.split(/\s+/)) if (c && !SAFE_ID.test(c)) classes.push(c);

  const z = num(s.zIndex, 999, -1);
  if (z !== null && s.zIndex !== '' && s.zIndex !== undefined && s.zIndex !== null) { wrap.zIndex = String(Math.round(z)); wrap.position = 'relative'; }

  const id = typeof s.cssId === 'string' && s.cssId.trim() ? s.cssId.trim().replace(SAFE_ID, '') : null;
  return { wrap, inner, cell, classes, id: id || null, hiddenOn };
}

/** Apply the computed styles to the rendered nodes. `cell` is the Grid cell, when there is one. */
export function applyBlockStyle(style, { wrap, inner, cell, nested }) {
  const r = styleFor(style, { nested });
  if (wrap) {
    Object.assign(wrap.style, r.wrap);
    for (const c of r.classes) wrap.classList.add(c);
    if (r.id) wrap.id = r.id;
    // In edit mode the block stays visible and faded, with this label, so it can still be reached.
    if (r.hiddenOn.length) wrap.dataset.apHidden = 'Hidden on ' + r.hiddenOn.join(', ');
  }
  if (inner) Object.assign(inner.style, r.inner);
  if (cell) Object.assign(cell.style, r.cell);
  return r;
}

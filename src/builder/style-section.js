// "Layout & style": the collapsible section at the foot of every block editor.
//
// One section, shared by all twenty-six editors, so a person who has learned it on a chart finds
// the same controls on an embed or a counter. It edits `block.style` (see render/block-style.js)
// and leaves `block.config` alone, which is what keeps it from disturbing any block's own
// behaviour: nothing here is read by a block renderer, only by the wrapper around it.
//
// Two shapes: inside a Grid block's cell the block can span columns and rows of that grid and
// align itself in its cell; on the page it can span rows of the twelve-column layout. Everything
// else (spacing, look, visibility, id/class/z-index) is the same in both places.

import { el, clone } from '../util.js';
import { field, textInput, segmented, subhead, checkboxRow, colorInput, ghostBtn } from './ui.js';
import { hasStyle, ALIGNS, MAX_SPAN, MAX_MIN_HEIGHT, MAX_SPACING, SHADOWS } from '../render/block-style.js';

const ALIGN_LABELS = { stretch: 'Fill', start: 'Top', center: 'Middle', end: 'Bottom' };
const SHADOW_LABELS = { default: 'Default', none: 'None', soft: 'Soft', bold: 'Bold' };
const spanOptions = (n) => Array.from({ length: Math.max(1, Math.min(MAX_SPAN, n)) }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

// A number box that means "leave blank for the default". Empty stays empty rather than 0 so a
// person can clear a value and get the theme's own back.
function numBox(value, onChange, { min = 0, max = 9999, placeholder = '' } = {}) {
  const node = textInput(value === null || value === undefined ? '' : String(value), (v) => {
    if (v === '') return onChange(null);
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    onChange(Math.min(max, Math.max(min, n)));
  }, { type: 'number', placeholder });
  node.classList.add('ap-input--sm');
  node.min = String(min); node.max = String(max);
  return node;
}

// Top / right / bottom / left in one row, the way spacing is set everywhere else.
function boxInputs(box, onChange, max) {
  const b = box && typeof box === 'object' ? box : {};
  const one = (k, label) => {
    const inp = el('input', { type: 'number', min: '0', max: String(max), value: b[k] ?? '', placeholder: '0', 'aria-label': label });
    inp.addEventListener('input', () => {
      const v = inp.value === '' ? null : Math.min(max, Math.max(0, Number(inp.value) || 0));
      onChange(k, v);
    });
    return el('label', {}, [el('span', { text: label }), inp]);
  };
  return el('div', { class: 'ap-box' }, [one('t', 'Top'), one('r', 'Right'), one('b', 'Bottom'), one('l', 'Left')]);
}

/**
 * @param {object} wb       the editor's working copy of the block (mutated in place, like config)
 * @param {object} ctx      editor context; `ctx.inGrid = { cols, rows }` when the block sits in a cell
 * @param {Function|null} refresh  re-renders the editor's live preview, when it has one
 */
export function layoutStyleSection(wb, ctx, refresh) {
  const inGrid = ctx?.inGrid && typeof ctx.inGrid === 'object' ? ctx.inGrid : null;
  let st = clone(wb.style && typeof wb.style === 'object' ? wb.style : {});
  const commit = () => {
    if (hasStyle(st)) wb.style = clone(st); else delete wb.style;
    if (typeof refresh === 'function') refresh();
  };
  const set = (key, v) => { if (v === null || v === undefined || v === '' || v === false) delete st[key]; else st[key] = v; commit(); };
  const setBox = (key) => (side, v) => { st[key] = st[key] && typeof st[key] === 'object' ? st[key] : {}; if (v === null || v === 0) delete st[key][side]; else st[key][side] = v; commit(); };
  const setHide = (screen, on) => { st.hide = st.hide && typeof st.hide === 'object' ? st.hide : {}; if (on) st.hide[screen] = true; else delete st.hide[screen]; commit(); };

  const bodyHost = el('div', { class: 'ap-adv__body' });
  const build = () => {
    const parts = [];

    parts.push(subhead('Spacing'));
    parts.push(field('Margin (pixels)', boxInputs(st.margin, setBox('margin'), MAX_SPACING), 'Space outside the block, on each side.'));
    parts.push(field('Padding (pixels)', boxInputs(st.padding, setBox('padding'), MAX_SPACING), 'Space inside the block, between its edge and its content.'));
    parts.push(field('Minimum height (pixels)', numBox(st.minHeight, (v) => set('minHeight', v), { min: 0, max: MAX_MIN_HEIGHT, placeholder: 'Auto' }),
      'The block grows to fit its content, and never shrinks below this.'));

    parts.push(subhead(inGrid ? 'Place in the section' : 'Place on the page'));
    if (inGrid) {
      parts.push(field('Column span', segmented(spanOptions(inGrid.cols), st.colSpan || 1, (v) => set('colSpan', v === 1 ? null : v)),
        `How many of this section's ${inGrid.cols} columns the block takes.`));
      parts.push(field('Row span', segmented(spanOptions(inGrid.rows), st.rowSpan || 1, (v) => set('rowSpan', v === 1 ? null : v)),
        `How many of this section's ${inGrid.rows} rows the block takes.`));
      parts.push(field('Align in cell', segmented(ALIGNS.map((a) => ({ value: a, label: ALIGN_LABELS[a] })), st.alignSelf || 'stretch', (v) => set('alignSelf', v === 'stretch' ? null : v)),
        'Where the block sits when the cell is taller than it.'));
    } else {
      parts.push(field('Row span', segmented(spanOptions(3), st.rowSpan || 1, (v) => set('rowSpan', v === 1 ? null : v)),
        'Let a tall block sit beside two or three stacked ones.'));
    }
    parts.push(field('Order', numBox(st.order, (v) => set('order', v), { min: -99, max: 99, placeholder: 'As listed' }),
      'Lower numbers come first. Blank keeps the order you arranged.'));

    parts.push(subhead('Look'));
    const bgPick = colorInput(st.bg || '#ffffff', (v) => set('bg', v));
    const bgClear = ghostBtn('Theme colour', () => { set('bg', null); bgPick.value = '#ffffff'; });
    bgClear.classList.add('ap-btn--sm');
    parts.push(field('Background', el('div', { class: 'ap-row', style: { gap: '8px' } }, [bgPick, bgClear])));
    const bcPick = colorInput(st.borderColor || '#d9dbe6', (v) => set('borderColor', v));
    parts.push(field('Border', el('div', { class: 'ap-row', style: { gap: '8px', alignItems: 'center' } }, [
      numBox(st.borderWidth, (v) => set('borderWidth', v), { min: 0, max: 20, placeholder: 'Theme' }),
      el('span', { class: 'ap-muted', text: 'px' }),
      bcPick,
    ]), 'Width in pixels and colour. Blank keeps the theme border.'));
    parts.push(field('Corner radius (pixels)', numBox(st.radius, (v) => set('radius', v), { min: 0, max: 80, placeholder: 'Theme' }), '0 gives square corners.'));
    parts.push(field('Shadow', segmented(SHADOWS.map((s) => ({ value: s, label: SHADOW_LABELS[s] })), st.shadow || 'default', (v) => set('shadow', v === 'default' ? null : v))));

    parts.push(subhead('Visibility'));
    parts.push(checkboxRow('Hide on phones (up to 640px wide)', !!st.hide?.phone, (on) => setHide('phone', on)));
    parts.push(checkboxRow('Hide on tablets (641 to 1024px)', !!st.hide?.tablet, (on) => setHide('tablet', on)));
    parts.push(checkboxRow('Hide on desktops (1025px and up)', !!st.hide?.desktop, (on) => setHide('desktop', on)));
    parts.push(el('div', { class: 'ap-muted', style: { fontSize: '12px', marginTop: '-6px', marginBottom: '10px' }, text: 'While you edit, a hidden block stays visible and faded so you can still reach it.' }));

    parts.push(subhead('Advanced'));
    parts.push(field('CSS ID', textInput(st.cssId || '', (v) => set('cssId', v.trim()), { placeholder: 'e.g. revenue-panel' }), 'Letters, digits, hyphens and underscores. Handy for a link that jumps to this block.'));
    parts.push(field('CSS classes', textInput(st.cssClass || '', (v) => set('cssClass', v.trim()), { placeholder: 'e.g. promo highlight' }), 'Space-separated. Matched by the custom CSS in Settings.'));
    parts.push(field('Z-index', numBox(st.zIndex, (v) => set('zIndex', v), { min: -1, max: 999, placeholder: 'Auto' }), 'Higher sits on top when blocks overlap after a negative margin.'));

    const reset = ghostBtn('Reset layout & style', () => { st = {}; commit(); build(); });
    reset.classList.add('ap-btn--sm');
    parts.push(el('div', { style: { marginTop: '4px' } }, [reset]));

    bodyHost.replaceChildren(...parts);
  };
  build();

  const summary = el('summary', {}, [
    el('span', {}, [
      'Layout & style ',
      el('span', { class: 'ap-muted', style: { fontWeight: '500' }, text: '· spacing, spans, background, visibility' }),
    ]),
  ]);
  const details = el('details', { class: 'ap-adv' }, [summary, bodyHost]);
  // Open when something is already set, so an edit does not hide what was done before.
  if (hasStyle(st)) details.open = true;
  return details;
}

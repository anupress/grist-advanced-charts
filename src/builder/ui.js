// Small form-control helpers + the shared slide-in drawer used by every editor panel.

import { el, uid } from '../util.js';
import { icon } from '../assets/icons.js';

export function field(labelText, control, hint, infoHtml) {
  const label = labelText
    ? el('label', { class: 'ap-label' }, [labelText, infoHtml ? infoButton(infoHtml) : null])
    : null;
  return el('div', { class: 'ap-field' }, [
    label,
    control,
    hint ? el('div', { class: 'ap-muted', style: { fontSize: '12px' }, text: hint }) : null,
  ]);
}

// A small "i" button that toggles a popover with help text (e.g. available placeholders).
export function infoButton(html) {
  const pop = el('span', { class: 'ap-info-pop', html });
  const btn = el('button', { class: 'ap-info-btn', type: 'button', 'aria-label': 'More info', text: 'i' });
  const wrap = el('span', { class: 'ap-info-wrap' }, [btn, pop]);
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); pop.classList.toggle('is-open'); });
  document.addEventListener('click', () => pop.classList.remove('is-open'));
  return wrap;
}

export function textInput(value, onInput, opts = {}) {
  const node = el(opts.textarea ? 'textarea' : 'input', {
    class: opts.textarea ? 'ap-textarea' : 'ap-input', value: value ?? '',
    placeholder: opts.placeholder || '', type: opts.type || 'text',
  });
  node.addEventListener('input', () => onInput(node.value));
  return node;
}

export function selectInput(options, value, onChange) {
  const sel = el('select', { class: 'ap-select' },
    options.map((o) => el('option', { value: o.value, text: o.label, selected: String(o.value) === String(value) })));
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

export function checkboxRow(labelText, checked, onChange) {
  const id = uid('cb');
  const box = el('input', { type: 'checkbox', id, checked: !!checked });
  box.addEventListener('change', () => onChange(box.checked));
  return el('label', { class: 'ap-row', for: id, style: { cursor: 'pointer', marginBottom: '12px' } },
    [box, el('span', { text: labelText, style: { fontSize: '13px', fontWeight: '600' } })]);
}

// Segmented control (e.g. block width, light/dark).
export function segmented(options, value, onChange) {
  const wrap = el('div', { class: 'ap-row', style: { flexWrap: 'wrap', gap: '6px' } });
  const set = (v) => { wrap.querySelectorAll('.ap-chip').forEach((c) => c.classList.toggle('is-active', c.dataset.v === String(v))); };
  options.forEach((o) => {
    const chip = el('button', { class: 'ap-chip', dataset: { v: String(o.value) }, text: o.label });
    chip.addEventListener('click', () => { onChange(o.value); set(o.value); });
    wrap.append(chip);
  });
  set(value);
  return wrap;
}

export function colorInput(value, onChange) {
  const node = el('input', { type: 'color', class: 'ap-input-color', value: value || '#6d5efc' });
  node.addEventListener('input', () => onChange(node.value));
  return node;
}

export function subhead(text) { return el('div', { class: 'ap-subhead', text }); }
export function divider() { return el('hr', { class: 'ap-divider' }); }

// ---- Drawer (single instance) ----
let current = null;
export function openDrawer({ title, body, footer }) {
  closeDrawer();
  const bodyEl = el('div', { class: 'ap-drawer__body' }, [].concat(body));
  const drawer = el('aside', { class: 'ap-drawer', role: 'dialog', 'aria-label': title }, [
    el('div', { class: 'ap-drawer__head' }, [
      el('div', { class: 'ap-drawer__title', text: title }),
      el('button', { class: 'ap-btn ap-btn--icon ap-btn--ghost', 'aria-label': 'Close', onClick: () => closeDrawer() }, [icon('close')]),
    ]),
    bodyEl,
    footer ? el('div', { class: 'ap-drawer__foot' }, [].concat(footer)) : null,
  ]);
  document.body.appendChild(drawer);
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  current = drawer;
  return { el: drawer, body: bodyEl, close: closeDrawer };
}

export function closeDrawer() {
  if (!current) return;
  const d = current; current = null;
  d.classList.remove('is-open');
  setTimeout(() => d.remove(), 320);
}

export function primaryBtn(text, ic, onClick) {
  return el('button', { class: 'ap-btn ap-btn--primary', onClick }, [ic ? icon(ic) : null, text]);
}
export function ghostBtn(text, onClick) { return el('button', { class: 'ap-btn ap-btn--ghost', text, onClick }); }

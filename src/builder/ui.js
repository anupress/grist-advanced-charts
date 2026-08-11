// Small form-control helpers + the shared slide-in drawer used by every editor panel.

import { el, uid } from '../util.js';
import { icon } from '../assets/icons.js';
import { pickImage, readFileAsDataURL } from './imageutil.js';
import { getMediaLibrary, addMediaAsset } from './media.js';

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
// One delegated outside-click listener for the whole page (not one per call) — closes whichever
// popover is open when a click lands outside its .ap-info-wrap, and closes any other open
// popover when a new one opens (only one help popover open at a time).
let _infoOutsideClickWired = false;
function wireInfoOutsideClickOnce() {
  if (_infoOutsideClickWired) return;
  _infoOutsideClickWired = true;
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.ap-info-pop.is-open').forEach((pop) => {
      if (!pop.closest('.ap-info-wrap')?.contains(e.target)) pop.classList.remove('is-open');
    });
  });
}
export function infoButton(html) {
  wireInfoOutsideClickOnce();
  const pop = el('span', { class: 'ap-info-pop', html });
  const btn = el('button', { class: 'ap-info-btn', type: 'button', 'aria-label': 'More info', text: 'i' });
  const wrap = el('span', { class: 'ap-info-wrap' }, [btn, pop]);
  // infoButton() is often placed inside a <label> (see field()). Per the HTML label-activation
  // spec, clicking ANY non-interactive descendant of a <label> — including a click landing inside
  // this popover's own text — auto-fires a second, synthetic click on the label's first labelable
  // descendant (our <button>), which would immediately re-toggle the popover shut. preventDefault()
  // on clicks inside the popover suppresses that forwarding so reading/selecting its text works.
  pop.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const opening = !pop.classList.contains('is-open');
    document.querySelectorAll('.ap-info-pop.is-open').forEach((p) => p.classList.remove('is-open'));
    pop.classList.toggle('is-open', opening);
  });
  return wrap;
}

export function textInput(value, onInput, opts = {}) {
  const node = el(opts.textarea ? 'textarea' : 'input', {
    class: opts.textarea ? 'ap-textarea' : 'ap-input', value: value ?? '',
    placeholder: opts.placeholder || '', type: opts.type || 'text', disabled: !!opts.disabled,
  });
  node.addEventListener('input', () => onInput(node.value));
  return node;
}

export function selectInput(options, value, onChange) {
  const opts = options.map((o) => el('option', { value: o.value, text: o.label, selected: String(o.value) === String(value) }));
  // A saved value that isn't among the options (a template block naming a table this document
  // doesn't have, a column since renamed in Grist) would otherwise leave nothing selected — and a
  // <select> with no selection displays its *first* option, so the field looks set to something it
  // isn't and closing the editor silently keeps the broken value. Surface it as its own entry so
  // the mismatch is visible and picking a real option is an obvious, deliberate act.
  const hasValue = value !== null && value !== undefined && value !== '';
  if (hasValue && !options.some((o) => String(o.value) === String(value))) {
    opts.unshift(el('option', { value: String(value), text: `${value} — not in this document`, selected: true }));
  }
  const sel = el('select', { class: 'ap-select' }, opts);
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

// ---- Shared block-editor controls ----

// Icons offered by iconPickerField — a small curated set (not the whole ICONS library, which
// includes UI-only glyphs like "close"/"grip" that don't make sense as decorative content icons).
const PICKABLE_ICONS = ['coins', 'cart', 'trending', 'users', 'pulse', 'target', 'star', 'database', 'globe', 'sparkles'];

// "Choose an icon" control shared by any block config with {icon, iconData} fields (Stat,
// Icon block, Counter). Reads/writes `config` in place; `site` is the whole working site config,
// used to read/add to its shared media library (see media.js) for uploaded custom icons.
export function iconPickerField(site, config, onChange) {
  const wrap = el('div', { class: 'ap-row', style: { flexWrap: 'wrap', gap: '6px' } });
  const rebuild = () => {
    wrap.replaceChildren();
    PICKABLE_ICONS.forEach((name) => {
      const active = !config.iconData && config.icon === name;
      const chip = el('button', { class: 'ap-chip' + (active ? ' is-active' : ''), title: name }, [icon(name)]);
      chip.addEventListener('click', () => { config.icon = name; config.iconData = null; rebuild(); onChange(); });
      wrap.append(chip);
    });
    getMediaLibrary(site).forEach(({ dataUrl }) => {
      const chip = el('button', { class: 'ap-chip' + (config.iconData === dataUrl ? ' is-active' : ''), title: 'Custom icon' },
        [el('img', { src: dataUrl, alt: '', style: { width: '16px', height: '16px', objectFit: 'contain' } })]);
      chip.addEventListener('click', () => { config.iconData = dataUrl; rebuild(); onChange(); });
      wrap.append(chip);
    });
    const up = el('button', { class: 'ap-chip', title: 'Upload your own icon' }, [icon('plus'), 'Upload']);
    up.addEventListener('click', () => pickImage(async (f) => {
      const data = await readFileAsDataURL(f, 128);
      addMediaAsset(site, data);
      config.iconData = data; rebuild(); onChange();
    }));
    wrap.append(up);
  };
  rebuild();
  return wrap;
}

// "Where should this go?" control for clickable blocks (Button, Icon): jump to one of the
// site's own pages, or an external URL (optionally in a new tab). Mutates `target` in place —
// {kind:'tab'|'url'|null, tab, url, newTab}.
export function linkTargetField(target, tabs, onChange) {
  const wrap = el('div', { style: { display: 'grid', gap: '8px' } });
  const kindSel = selectInput(
    [{ value: '', label: '— No link —' }]
      .concat((tabs || []).map((t) => ({ value: 'tab:' + t.id, label: 'Page: ' + t.title })))
      .concat([{ value: 'url', label: 'Custom URL…' }]),
    target.kind === 'tab' ? 'tab:' + target.tab : (target.kind === 'url' ? 'url' : ''),
    (v) => {
      if (v === '') { target.kind = null; target.tab = null; target.url = null; }
      else if (v === 'url') { target.kind = 'url'; target.tab = null; target.url = target.url || 'https://'; }
      else { target.kind = 'tab'; target.tab = v.slice(4); target.url = null; }
      rebuild(); onChange();
    });
  function rebuild() {
    wrap.replaceChildren(kindSel);
    if (target.kind === 'url') {
      wrap.append(
        textInput(target.url || '', (v) => { target.url = v; onChange(); }, { placeholder: 'https://example.com' }),
        checkboxRow('Open in a new tab', target.newTab !== false, (v) => { target.newTab = v; onChange(); }),
      );
    }
  }
  rebuild();
  return wrap;
}

export function primaryBtn(text, ic, onClick) {
  return el('button', { class: 'ap-btn ap-btn--primary', onClick }, [ic ? icon(ic) : null, text]);
}
export function ghostBtn(text, onClick) { return el('button', { class: 'ap-btn ap-btn--ghost', text, onClick }); }

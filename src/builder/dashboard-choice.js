// "Which dashboard should this widget show?" — asked once, the first time Edit is pressed in a
// widget instance that has never chosen, when the document already has something to choose from.
//
// The case it exists for: a second widget pasted into a document that already has a dashboard.
// It showed the main one by default, which looked like "my new widget", and the first thing
// people did was install a template into it — replacing the design the first widget was showing.
// Asking up front turns that into a choice: show an existing dashboard here, or start a new one.
//
// Resolves { action: 'show', id } | { action: 'new', mode: 'blank' | 'copy', name } | null.

import { el } from '../util.js';
import { brandLogo, icon } from '../assets/icons.js';

export function askDashboardForWidget({ dashboards, currentId }) {
  return new Promise((resolve) => {
    let choice = { action: 'show', id: currentId };
    let newMode = 'blank';
    const close = (val) => {
      overlay.style.animation = 'ap-fade-in .15s reverse both';
      setTimeout(() => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(val); }, 140);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);

    const nameInput = el('input', { class: 'ap-input', type: 'text', placeholder: 'e.g. Operations', 'aria-label': 'Name for the new dashboard' });
    const rows = [];
    const paint = () => {
      for (const r of rows) r.el.classList.toggle('is-current', choice.action === 'show' && r.id === choice.id);
      newRow.classList.toggle('is-current', choice.action === 'new');
      newDetails.hidden = choice.action !== 'new';
      modeChips.forEach((c) => c.classList.toggle('is-active', c.dataset.v === newMode));
    };
    for (const d of dashboards) {
      const row = el('button', { class: 'ap-dash ap-dash--pick', type: 'button' }, [
        icon('dashboards'),
        el('div', { class: 'ap-dash__text' }, [
          el('div', { class: 'ap-dash__name', text: d.name }),
          el('div', { class: 'ap-muted ap-dash__id', text: d.id === currentId ? 'Shown here now' : (d.id === 'site' ? 'The main dashboard' : `id ${d.id}`) }),
        ]),
      ]);
      row.addEventListener('click', () => { choice = { action: 'show', id: d.id }; paint(); });
      rows.push({ id: d.id, el: row });
    }
    const modeChips = ['blank', 'copy'].map((v) => {
      const c = el('button', { class: 'ap-chip', type: 'button', dataset: { v }, text: v === 'blank' ? 'A blank page' : 'A copy of what is shown here now' });
      c.addEventListener('click', () => { newMode = v; paint(); });
      return c;
    });
    const newDetails = el('div', { class: 'ap-dashchoice__new' }, [
      el('label', { class: 'ap-label', text: 'Name' }), nameInput,
      el('label', { class: 'ap-label', text: 'Start from' }),
      el('div', { class: 'ap-row', style: { flexWrap: 'wrap', gap: '6px' } }, modeChips),
    ]);
    const newRow = el('button', { class: 'ap-dash ap-dash--pick', type: 'button' }, [
      icon('plus'),
      el('div', { class: 'ap-dash__text' }, [
        el('div', { class: 'ap-dash__name', text: 'Start a new dashboard for this widget' }),
        el('div', { class: 'ap-muted ap-dash__id', text: 'The others keep showing what they show now' }),
      ]),
    ]);
    newRow.addEventListener('click', () => { choice = { action: 'new' }; paint(); setTimeout(() => nameInput.focus(), 0); });

    const go = el('button', { class: 'ap-btn ap-btn--primary' }, [icon('checkCircle'), 'Continue']);
    go.addEventListener('click', () => {
      if (choice.action === 'new') {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); nameInput.classList.add('is-invalid'); return; }
        close({ action: 'new', mode: newMode, name });
      } else close(choice);
    });

    const modal = el('div', { class: 'ap-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ap-dashchoice-title' }, [
      el('div', { class: 'ap-modal__banner' }, [
        el('div', { class: 'ap-modal__brand' }, [brandLogo(34)]),
        el('h2', { class: 'ap-modal__title', id: 'ap-dashchoice-title', text: 'Which dashboard should this widget show?' }),
      ]),
      el('div', { class: 'ap-modal__body' }, [
        el('p', { class: 'ap-muted', text: 'This document already has a dashboard. A widget can show one that exists, or start one of its own; either way the others are left as they are. You can change this later under Settings → Dashboards.' }),
        ...rows.map((r) => r.el),
        newRow,
        newDetails,
      ]),
      el('div', { class: 'ap-modal__foot' }, [
        el('button', { class: 'ap-btn ap-btn--ghost', text: 'Not now', onClick: () => close(null) }),
        go,
      ]),
    ]);
    const overlay = el('div', { class: 'ap-overlay', onClick: (e) => { if (e.target === overlay) close(null); } }, [modal]);
    document.body.appendChild(overlay);
    paint();
    go.focus();
  });
}

// Industry starter-template picker: pick -> confirm-before-replace (tab-name preview + an
// explicit "can't be undone" callout) -> apply. Same {state; render()->openDrawer()} shape as
// wizard.js. Applying always runs through adaptConfigToTable() (data/provider.js) — the same
// remap used for the demo->first-real-table jump on connect — so every template's stat/chart
// blocks point at the user's actual table/columns immediately, in demo mode too.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider } from './ui.js';
import { TEMPLATES } from '../data/templates/index.js';
import { adaptConfigToTable } from '../data/provider.js';

export function openTemplatePicker({ provider, onApply }) {
  const state = { picked: null };
  render();

  function render() {
    openDrawer({
      title: state.picked ? 'Preview & apply' : 'Choose a starting template',
      body: state.picked ? confirmBody() : pickBody(),
      footer: state.picked ? confirmFooter() : pickFooter(),
    });
  }

  function pickBody() {
    const grid = el('div', { style: { display: 'grid', gap: '10px' } },
      TEMPLATES.map((t) => {
        const card = el('button', { class: 'ap-addtile' }, [
          el('span', { class: 'ap-addtile__icon' }, [icon('layout')]),
          el('div', { class: 'ap-addtile__text' }, [
            el('div', { class: 'ap-addtile__title', text: t.name }),
            el('div', { class: 'ap-addtile__desc', text: t.tagline }),
          ]),
        ]);
        card.addEventListener('click', () => { state.picked = t; render(); });
        return card;
      }));
    return [
      el('p', { class: 'ap-muted', style: { fontSize: '13px', marginBottom: '4px' }, text: 'Pick a starting point for your site — pages, sample cards and copy included. Everything is fully editable afterward.' }),
      grid,
    ];
  }
  function pickFooter() { return [ghostBtn('Cancel', () => closeDrawer())]; }

  function confirmBody() {
    const t = state.picked;
    return [
      el('div', { class: 'ap-row', style: { marginBottom: '14px' } }, [
        el('span', { class: 'ap-addtile__icon' }, [icon('layout')]),
        el('div', {}, [
          el('div', { style: { fontWeight: 800, fontSize: '16px' }, text: t.name }),
          el('div', { class: 'ap-muted', text: t.tagline }),
        ]),
      ]),
      subhead('Pages included'),
      el('ul', { class: 'ap-consent-list' }, t.config.tabs.map((tab) => el('li', {}, [icon('layout'), el('span', { text: tab.title })]))),
      divider(),
      el('div', { class: 'ap-trust' }, [
        icon('trash'),
        el('div', {}, [
          el('strong', { text: 'This replaces your current design.' }),
          el('div', { class: 'ap-muted', text: 'Applying a template overwrites your current pages, theme and blocks. This can\'t be undone once you save — Cancel to keep what you have.' }),
        ]),
      ]),
    ];
  }
  function confirmFooter() {
    return [
      ghostBtn('Back', () => { state.picked = null; render(); }),
      primaryBtn('Apply this template', 'check', () => {
        const applied = adaptConfigToTable(state.picked.config, provider);
        closeDrawer();
        onApply(applied);
      }),
    ];
  }
}

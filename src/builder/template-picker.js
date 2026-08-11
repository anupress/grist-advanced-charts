// Industry starter-template picker: pick -> confirm-before-replace (a real rendered preview,
// using that industry's own sample dataset, + an explicit "can't be undone" callout) -> apply.
// Same {state; render()->openDrawer()} shape as wizard.js. Applying always runs through
// adaptConfigToTable() (data/provider.js) — the same remap used for the demo->first-real-table
// jump on connect — so every template's stat/chart blocks point at the user's actual
// table/columns immediately, in demo mode too. The PREVIEW runs that exact same remap, just
// against a small bundled per-industry dataset (data/templates/sample-data.js) instead of the
// real provider — so breakdown/map (which adaptConfigToTable does NOT remap, a documented
// limitation) also show industry-appropriate categories and locations before you commit,
// rather than generic Sales categories with different labels stuck on top.

import { el, clone } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider } from './ui.js';
import { TEMPLATES } from '../data/templates/index.js';
import { adaptConfigToTable, DummyProvider } from '../data/provider.js';
import { TEMPLATE_SAMPLE_DATA } from '../data/templates/sample-data.js';
import { renderBlock, mountCharts } from '../render/blocks.js';
import { mountMaps } from '../render/map.js';
import { mountCounters } from '../render/counter.js';
import { mountAttachmentImages } from '../render/media-mount.js';
import { mountCountdowns } from '../render/countdown.js';
import { mountCalendars } from '../render/calendar.js';

export function openTemplatePicker({ provider, onApply }) {
  const state = { picked: null };
  let previewHost = null; // set by buildLivePreview(); mounted only once actually in the document
  render();

  function render() {
    previewHost = null;
    openDrawer({
      title: state.picked ? 'Preview & apply' : 'Choose a starting template',
      body: state.picked ? confirmBody() : pickBody(),
      footer: state.picked ? confirmFooter() : pickFooter(),
    });
    // Charts/maps/counters size themselves off clientWidth/clientHeight, which is only
    // meaningful once this content is actually attached — openDrawer() just appended it above,
    // so only now, not from inside confirmBody() itself (a detached tree measures as 0x0 and
    // the map's mount code gives up silently after a few zero-size retries).
    if (previewHost) { mountCharts(previewHost); mountMaps(previewHost); mountCounters(previewHost); mountAttachmentImages(previewHost); mountCountdowns(previewHost); mountCalendars(previewHost); }
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

  // A real rendered preview of every tab/block in the template, using its own sample dataset
  // (falls back to a bare "table not available" empty state for any template id missing one,
  // rather than throwing) — not a live block, so no edit-mode tools/click handlers attach.
  function buildLivePreview(t) {
    const sample = TEMPLATE_SAMPLE_DATA[t.id];
    if (!sample) return el('div', { class: 'ap-muted', text: 'Preview unavailable for this template.' });
    const previewProvider = new DummyProvider(sample);
    const previewConfig = adaptConfigToTable(t.config, previewProvider);
    const host = el('div', { class: 'ap-preview', style: { maxHeight: '380px', overflowY: 'auto' } });
    for (const tab of previewConfig.tabs || []) {
      host.append(
        el('div', { class: 'ap-muted', style: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.04em', margin: '14px 0 8px' }, text: tab.title }),
        el('div', { class: 'ap-grid' }, (tab.blocks || []).map((block) => renderBlock(clone(block), { provider: previewProvider, config: {} }))),
      );
    }
    previewHost = host; // mounted by render(), once this is actually attached to the document
    return host;
  }

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
      subhead('Preview with sample data'),
      buildLivePreview(t),
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

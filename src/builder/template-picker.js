// Industry starter-template picker: pick -> confirm-before-replace (a real rendered preview,
// using that industry's own sample dataset, + an explicit "can't be undone" callout) -> apply.
// Same {state; render()->openDrawer()} shape as wizard.js. Applying always runs through
// adaptTemplateToTable() (data/provider.js) — deliberately NOT the more aggressive
// adaptConfigToTable() used for the demo->first-real-table jump on connect. A template should
// install *intact*: a block only gets repointed at a different table when its own table name
// genuinely exists on the target, or it uses 'Data' (the shared placeholder every simple
// template is authored against) — never guessed onto an unrelated real table just because it was
// open. The PREVIEW runs the same function against a small bundled per-industry dataset
// (data/templates/sample-data.js) whose table names always match the template's own, so every
// block (including breakdown/map, which don't get column-level remapping when guessing) shows
// real industry-appropriate data before you commit.

import { el, clone } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider } from './ui.js';
import { TEMPLATES } from '../data/templates/index.js';
import { adaptTemplateToTable, DummyProvider } from '../data/provider.js';
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
    const previewConfig = adaptTemplateToTable(t.config, previewProvider);
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

  // Templates that name real tables (Research Labs' Samples/Reagents/Tasks/People) only connect to
  // your data where a table of that name actually exists — the rest install intact for you to point
  // at your own tables afterward. Say which is which up front, so an unconnected block on the
  // applied page reads as expected rather than broken. Skipped for the templates authored against
  // the shared 'Data' placeholder, where there's nothing meaningful to name.
  function tablesSection(t) {
    const wanted = [...new Set((t.config.tabs || []).flatMap((tab) => (tab.blocks || [])
      .map((b) => b.config?.table).filter((x) => x && x !== 'Data')))];
    if (!wanted.length) return [];
    const have = new Set((provider.tables() || []).map((x) => x.id));
    const missing = wanted.filter((x) => !have.has(x));
    return [
      subhead('Tables this template uses'),
      el('ul', { class: 'ap-consent-list' }, wanted.map((name) => el('li', {}, [
        icon(have.has(name) ? 'check' : 'database'),
        el('span', { text: have.has(name) ? `${name} — found in this document` : `${name} — not in this document yet` }),
      ]))),
      missing.length ? el('div', { class: 'ap-muted', style: { fontSize: '12px', lineHeight: '1.5', marginTop: '6px' } , text:
        `Blocks using ${missing.length === 1 ? 'that table' : 'those tables'} will install as-is and show a “needs a table” note until you point them at your own data — everything else connects automatically.` }) : null,
      divider(),
    ];
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
      ...tablesSection(t),
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
        const applied = adaptTemplateToTable(state.picked.config, provider);
        closeDrawer();
        onApply(applied);
      }),
    ];
  }
}

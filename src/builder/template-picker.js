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

import { el, clone, toast, escapeHtml } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider, field, selectInput } from './ui.js';
import { TEMPLATES } from '../data/templates/index.js';
import { adaptTemplateToTable, DummyProvider } from '../data/provider.js';
import { TEMPLATE_SAMPLE_DATA } from '../data/templates/sample-data.js';
import { renderBlock, mountCharts } from '../render/blocks.js';
import { mountMaps } from '../render/map.js';
import { mountCounters } from '../render/counter.js';
import { mountAttachmentImages } from '../render/media-mount.js';
import { mountCountdowns } from '../render/countdown.js';
import { mountCalendars } from '../render/calendar.js';
import * as bridge from '../grist/bridge.js';

const OWN = '__own__'; // sentinel: "materialize the template's own table" (create or backfill)

// Walks a template's tabs/blocks and returns the deduped list of real table names it references
// (skipping 'Data', the shared placeholder). Drives the confirm-step per-table setup controls.
function templateTables(t) {
  return [...new Set((t.config.tabs || []).flatMap((tab) => (tab.blocks || [])
    .map((b) => b.config?.table).filter((x) => x && x !== 'Data')))];
}

// Every column id each template table's blocks actually reference (only these matter for how the
// page renders, so only these are what the mapping step asks a user to match). -> {table: [ids]}.
function referencedColumns(config) {
  const map = {};
  const add = (table, ...cols) => { if (!table) return; (map[table] ||= new Set()); for (const c of cols) if (c) map[table].add(c); };
  for (const tab of config.tabs || []) for (const b of tab.blocks || []) {
    const c = b.config || {}; if (!c.table) continue;
    add(c.table, c.column, c.dateColumn, c.titleColumn, c.colorBy, c.valueColumn, c.targetColumn, c.latColumn, c.lonColumn, c.labelColumn);
    add(c.table, ...(c.dims || []), ...(c.measures || []), ...(c.columns || []), ...(c.popupColumns || []), ...(c.detailColumns || []));
  }
  const out = {}; for (const k of Object.keys(map)) out[k] = [...map[k]]; return out;
}

// Referenced columns for one template table, enriched with label/type from its sample-data column
// defs (in sample-column order) — the "required columns" shown in the (i) and mapped in the UI.
function templateTableColumns(t, tableName) {
  const refs = new Set(referencedColumns(t.config)[tableName] || []);
  const sampleCols = TEMPLATE_SAMPLE_DATA[t.id]?.tables?.[tableName]?.columns || [];
  const ordered = sampleCols.filter((c) => refs.has(c.id));
  const seen = new Set(ordered.map((c) => c.id));
  for (const id of refs) if (!seen.has(id)) ordered.push({ id, label: id, type: 'Text' });
  return ordered;
}

// Best guess for which of the user's columns corresponds to a template column: exact id, then
// case-insensitive id, then label, then cross id/label. '' when nothing looks right (user picks).
function bestMatch(colId, colLabel, targetCols) {
  const lid = String(colId).toLowerCase(), llab = String(colLabel || '').toLowerCase();
  const find = (fn) => targetCols.find(fn)?.id || null;
  return find((c) => c.id === colId)
    || find((c) => c.id.toLowerCase() === lid)
    || (llab && find((c) => (c.label || '').toLowerCase() === llab))
    || find((c) => c.id.toLowerCase() === llab || (c.label || '').toLowerCase() === lid)
    || '';
}

// Rewrites blocks whose template table was mapped onto one of the USER's tables: table id + every
// column reference are swapped to the mapped equivalents (unmapped columns drop to null/out of
// arrays). Read-only — no Grist writes; the user's table is untouched. Tables left on the OWN
// sentinel are skipped here (handled by the create/backfill path). Returns a fresh config.
function remapUsedTables(config, choices) {
  const c = clone(config);
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    const cfg = b.config; if (!cfg?.table) continue;
    const choice = choices[cfg.table];
    if (!choice || !choice.target || choice.target === OWN) continue;
    const colMap = choice.columns || {};
    const m = (id) => (id == null ? id : (colMap[id] || null));
    const arr = (a) => (a || []).map(m).filter(Boolean);
    for (const k of ['column', 'dateColumn', 'titleColumn', 'colorBy', 'valueColumn', 'targetColumn', 'latColumn', 'lonColumn', 'labelColumn']) if (k in cfg) cfg[k] = m(cfg[k]);
    for (const k of ['dims', 'measures', 'columns', 'popupColumns', 'detailColumns']) if (k in cfg) cfg[k] = arr(cfg[k]);
    cfg.table = choice.target;
  }
  return c;
}

export function openTemplatePicker({ provider, onApply }) {
  // tableChoices: per template-table, { target: OWN | <user table id>, columns: {templateCol: userCol} }.
  // Default OWN for every table = "create it with sample data" (or backfill if a same-named empty
  // one exists) — the user can instead point any table at one of their own via the confirm step.
  const state = { picked: null, tableChoices: {}, applying: false };
  let previewHost = null; // set by buildLivePreview(); mounted only once actually in the document
  render();

  function pick(t) { state.picked = t; initChoices(t); render(); }
  function initChoices(t) {
    state.tableChoices = {};
    if (!provider.isLive) return; // demo mode loads sample data directly; no per-table choices
    for (const name of templateTables(t)) state.tableChoices[name] = { target: OWN, columns: {} };
  }

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
        card.addEventListener('click', () => pick(t));
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

  // Per-table setup. Templates that name real tables (Research Labs' Samples/Reagents/Tasks/People)
  // let each one be either created with sample data (default) or pointed at one of the user's own
  // tables — with an (i) listing the columns the template needs and, when a user table is chosen, a
  // column-mapping step. Demo mode has no real doc to map onto, so it just summarizes the tables.
  function tablesSection(t) {
    const wanted = templateTables(t);
    if (!wanted.length) return [];

    if (!provider.isLive) {
      return [
        subhead('Tables this template uses'),
        el('ul', { class: 'ap-consent-list' }, wanted.map((name) => el('li', {}, [icon('database'), el('span', { text: name })]))),
        el('div', { class: 'ap-muted', style: { fontSize: '12px', marginTop: '6px' }, text: 'In this demo, applying loads sample data for these tables so every block is populated. Connect a Grist document to use your own tables.' }),
        divider(),
      ];
    }

    const docTables = provider.tables() || [];
    const haveIds = new Set(docTables.map((x) => x.id));
    const nodes = [
      subhead('Set up the template’s tables'),
      el('div', { class: 'ap-muted', style: { fontSize: '12px', lineHeight: '1.5', marginBottom: '10px' }, text: 'For each table this template uses: create it with sample data (default), or point it at one of your own. Using your own table only reads from it — its data is never changed.' }),
    ];

    for (const name of wanted) {
      const cols = templateTableColumns(t, name);
      const choice = state.tableChoices[name] || (state.tableChoices[name] = { target: OWN, columns: {} });
      const infoHtml = 'Columns this template uses:<br>' + cols.map((c) => `&bull; <b>${escapeHtml(c.label || c.id)}</b> <span style="opacity:.6">(${escapeHtml(c.type)})</span>`).join('<br>');
      const options = [
        { value: OWN, label: haveIds.has(name) ? `Use “${name}” (already in your document)` : `Create “${name}” with sample data` },
        ...docTables.filter((x) => x.id !== name).map((x) => ({ value: x.id, label: `Use my “${x.label || x.id}”` })),
      ];
      const sel = selectInput(options, choice.target, (v) => {
        choice.target = v;
        if (v !== OWN) { const tc = provider.columns(v) || []; choice.columns = {}; for (const c of cols) choice.columns[c.id] = bestMatch(c.id, c.label, tc); }
        render();
      });
      const row = el('div', { class: 'ap-maptable' }, [field(name, sel, null, infoHtml)]);

      if (choice.target && choice.target !== OWN) {
        const tc = provider.columns(choice.target) || [];
        const opts = [{ value: '', label: '— skip —' }].concat(tc.map((c) => ({ value: c.id, label: c.label || c.id })));
        row.append(el('div', { class: 'ap-mapcols' }, [
          el('div', { class: 'ap-mapcols__head', text: `Match columns → ${choice.target}` }),
          ...cols.map((c) => field(c.label || c.id, selectInput(opts, choice.columns[c.id] || '', (v) => { choice.columns[c.id] = v; }))),
        ]));
      }
      nodes.push(row);
    }
    nodes.push(divider());
    return nodes;
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
  async function doApply() {
    if (state.applying) return;
    const t = state.picked;
    const sample = TEMPLATE_SAMPLE_DATA[t.id];

    // Demo mode: no live Grist doc to write into, but the template ships its own sample tables.
    // Point the demo provider straight at them so every block on the applied page renders with
    // real, template-appropriate data (the applied page then matches its preview exactly) rather
    // than empty cards for tables the general demo never had. Clone so a later edit in Demo mode
    // (e.g. dragging a calendar event) mutates this copy, not the shared bundled dataset.
    if (!provider.isLive && sample && typeof provider.setData === 'function') {
      provider.setData(clone(sample));
      finishApply(adaptTemplateToTable(t.config, provider));
      return;
    }

    // Live mode. Each template table is either kept as its OWN name (create/backfill with sample
    // data) or mapped onto one of the user's tables (read-only). remapUsedTables rewrites the
    // mapped blocks up front; the OWN ones get materialized in Grist below, then adaptTemplateToTable
    // repairs everything against the now-current table list.
    const choices = state.tableChoices || {};
    const cfg = remapUsedTables(t.config, choices);
    const ownTables = templateTables(t).filter((name) => (choices[name]?.target ?? OWN) === OWN && sample?.tables?.[name]);

    if (ownTables.length) {
      state.applying = true;
      render(); // footer button -> "Setting up tables…"

      const have = new Set((provider.tables() || []).map((x) => x.id));
      const absent = ownTables.filter((name) => !have.has(name));
      const present = ownTables.filter((name) => have.has(name));
      // A present OWN table with zero rows is a leftover from an earlier partial apply — backfill
      // it; one with rows is left untouched. refresh() force-fetches (bypasses the prime cache).
      const emptyPresent = [];
      for (const name of present) { let rows = []; try { rows = await provider.refresh(name); } catch {} if (!(rows && rows.length)) emptyPresent.push(name); }

      let created = 0, populated = 0, failed = 0;
      // Remember exactly which tables WE brought into existence. Nothing else can tell them apart
      // from the user's own afterwards — a table called Tasks might be ours or theirs — and
      // "Start from scratch" must only ever offer to remove tables on this list. Recorded on the
      // config so it travels with the document rather than living in this browser.
      const madeByUs = [];
      for (const name of absent) {
        const spec = sample.tables[name];
        if (await bridge.createTableWithRecords(name, spec.columns, spec.records)) { created++; madeByUs.push(name); } else failed++;
      }
      if (madeByUs.length) {
        const prev = Array.isArray(cfg.createdTables) ? cfg.createdTables : [];
        cfg.createdTables = [...new Set([...prev, ...madeByUs])];
      }
      await provider.refreshTables(); // learn the newly created tables (and load their rows)
      for (const name of emptyPresent) {
        const spec = sample.tables[name];
        const existingColIds = (provider.columns(name) || []).map((c) => c.id);
        const n = await bridge.addRecordsToTable(name, spec.columns, spec.records, existingColIds);
        if (n > 0) { populated++; try { await provider.refresh(name); } catch {} } else failed++;
      }

      const done = created + populated;
      if (failed && !done) toast('Couldn\'t add the template\'s tables — the affected blocks will show as unconfigured. See the console for the Grist error.', 'err');
      else if (failed) toast(`Set up ${done} table${done === 1 ? '' : 's'}; ${failed} couldn\'t be written — see the console.`, 'err');
      else if (done) toast(`Set up ${done} table${done === 1 ? '' : 's'} in your document with sample data.`, '');
    }

    finishApply(adaptTemplateToTable(cfg, provider));
  }

  function finishApply(applied) {
    state.applying = false;
    closeDrawer();
    onApply(applied);
  }

  function confirmFooter() {
    const label = state.applying ? 'Setting up tables…' : 'Apply this template';
    const btn = primaryBtn(label, 'check', doApply);
    if (state.applying) btn.disabled = true;
    return [ghostBtn('Back', () => { if (!state.applying) { state.picked = null; render(); } }), btn];
  }
}

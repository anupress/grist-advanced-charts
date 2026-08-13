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

import { el, clone, toast, escapeHtml, designSignature } from '../util.js';
import { icon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider, field, selectInput, checkboxRow } from './ui.js';
import { emptySite } from '../data/default-site.js';
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

// Which tables in this document came from one of our templates?
//
// config.createdTables is the trustworthy answer, but it only exists for tables created since we
// started recording it — a document that already had templates applied has nothing on that list,
// which is exactly the document whose owner most wants to tidy up. So legacy tables are INFERRED,
// and the inference is deliberately strict: the name must match a template table AND every column
// that template declares must be present, with almost no extras. Name alone is far too weak, since
// "Tasks", "Clients" or "Team" is a name anyone might pick — but a user's own Tasks table also
// happening to carry Task, Priority, Project, AssignedTo, DueDate, Status and Outcome is not a
// realistic coincidence.
//
// Inferred tables are still never removed on their own account: the UI lists them separately and
// leaves them unticked, so deleting one is always a deliberate act by the person who knows.
export function detectTemplateTables(provider) {
  const found = [];
  const seen = new Set();
  if (!provider?.columns) return found;
  // Only tables that are actually in the document. columns() reads a cache, and a cache can
  // outlive the thing it describes — this list drives a delete button, so it is checked against
  // the live table list rather than trusted to be fresh.
  const present = new Set((provider.tables?.() || []).map((t) => t.id));
  for (const [tplId, data] of Object.entries(TEMPLATE_SAMPLE_DATA)) {
    for (const [name, spec] of Object.entries(data.tables || {})) {
      if (name === 'Data' || seen.has(name) || !present.has(name)) continue;
      let cols;
      try { cols = provider.columns(name); } catch { cols = null; }
      if (!cols || !cols.length) continue;
      const have = new Set(cols.map((c) => c.id));
      const want = (spec.columns || []).map((c) => c.id);
      if (!want.length) continue;
      const allPresent = want.every((id) => have.has(id));
      const noBloat = have.size <= want.length + 2; // tolerate a stray user column or two
      if (allPresent && noBloat) { found.push({ name, template: tplId }); seen.add(name); }
    }
  }
  return found;
}

/**
 * Where a template stands relative to the design currently loaded.
 *
 *   'fresh'    — not this template. Applying it replaces whatever is here.
 *   'active'   — this template, exactly as it was installed. Applying it again would do nothing,
 *                so the picker says so instead of spending several seconds proving it.
 *   'modified' — this template, built on since. Applying it again is a reset, and it throws away
 *                work, so it has to be described as one and warned about again.
 *
 * The 'modified' case is the one that matters. A design nobody has touched is cheap to rebuild; an
 * afternoon of edits is not, and the old flow discarded both without distinguishing them.
 */
export function templateStatus(config, templateId) {
  if (!config || !templateId) return 'fresh';

  if (config.templateId === templateId) {
    // A design stamped by an older version has an id but no signature. Treating that as untouched
    // would offer to skip a reinstall someone may genuinely want, so assume it has been worked on
    // — the cautious direction, since it only ever adds a confirmation.
    if (!config.templateSig) return 'modified';
    return designSignature(config) === config.templateSig ? 'active' : 'modified';
  }
  if (config.templateId) return 'fresh'; // stamped, and stamped as something else

  // Nothing stamped at all, which is every document where a template was installed before stamping
  // existed — precisely the documents whose owners are most likely to reinstall by accident, since
  // the picker would otherwise show what they are already using as a fresh choice. Recognise the
  // design by its blocks instead. 'modified' rather than 'active', because the ids identify the
  // template but say nothing about whether its contents have been edited since.
  return inferTemplateId(config) === templateId ? 'modified' : 'fresh';
}

/**
 * Which template a design came from, judged only by the block ids it carries.
 *
 * Every block a template ships has a hand-written id ('rl11', 'lg22t'), all 634 of them unique
 * across the ten templates, and installing one never rewrites them — adaptation repoints tables and
 * columns, not identities. So the ids that survive in a design name the template it grew from, even
 * after pages have been deleted and blocks added.
 *
 * Both directions have to agree, which is what keeps it honest. Coverage — how much of this design
 * belongs to that template — stops a design with two leftover blocks from being claimed. Presence —
 * how much of the template is still here — stops a heavily gutted design from being confidently
 * labelled. Fail either and the answer is "no idea", which costs one unnecessary confirmation.
 */
export function inferTemplateId(config) {
  const here = new Set();
  for (const tab of config?.tabs || []) for (const b of tab.blocks || []) if (b?.id) here.add(b.id);
  if (!here.size) return null;

  let best = null;
  for (const t of TEMPLATES) {
    const own = new Set();
    for (const tab of t.config.tabs || []) for (const b of tab.blocks || []) if (b?.id) own.add(b.id);
    if (!own.size) continue;
    let hits = 0;
    for (const id of here) if (own.has(id)) hits++;
    if (!hits) continue;
    const coverage = hits / here.size;
    const presence = hits / own.size;
    if (coverage < 0.6 || presence < 0.4) continue;
    const score = coverage + presence;
    if (!best || score > best.score) best = { id: t.id, score };
  }
  return best?.id || null;
}

/**
 * Which previously-created tables may be offered for removal when a template is applied.
 *
 * Pure, exported and separately tested because it is the gate in front of a delete: everything it
 * returns is ticked by default, so a mistake here removes a table nobody agreed to lose.
 *
 *   recorded — tables our templates created, from the durable record (never inferred: see the
 *              caller for why guessing is fine for "Start from scratch" and not for this).
 *   present  — table ids actually in the document right now.
 *   inUse    — tables the incoming template has been pointed at, which must survive.
 */
export function tablesToCleanUp({ recorded = [], present = [], inUse = [] } = {}) {
  const here = new Set(present);
  const keep = new Set(inUse);
  return [...new Set(recorded)].filter((id) => id && here.has(id) && !keep.has(id));
}

/**
 * Which of those candidates are ticked: on by default, unless the user has said otherwise.
 *
 * The list changes while the drawer is open — pointing a template table at one of the user's own
 * tables takes it off, unpointing puts it back — so "is it ticked" cannot be carried in the set
 * alone. Doing that meant a table that left and came back returned unticked, as though someone had
 * chosen to keep it. Only an id in `touched` has actually been decided by a person.
 */
export function resolveCleanupTicks({ candidates = [], wanted = new Set(), touched = new Set() } = {}) {
  return new Set(candidates.filter((id) => (touched.has(id) ? wanted.has(id) : true)));
}

// Walks a template's tabs/blocks and returns the deduped list of real table names it references
// (skipping 'Data', the shared placeholder). Drives the confirm-step per-table setup controls.
// Exported for tests: it decides which tables get created, and a table it misses is one whose
// blocks install pointing at nothing.
//
// An Invoice block reaches two tables beyond its own: the client directory it looks names up in,
// and the line-items table it bills from. Reading only `config.table` missed both, so a template
// whose items table is referenced nowhere else -- the demo dashboard's InvoiceItems -- never got
// created, and its invoices installed with no lines on them. This is the same set
// data/provider.js's tablesInConfig collects for priming; the two must agree, or a table gets
// fetched but never made, or made but never loaded.
export function templateTables(t) {
  const ids = new Set();
  for (const tab of t.config.tabs || []) {
    for (const b of tab.blocks || []) {
      for (const id of [b.config?.table, b.config?.clientTable, b.config?.itemsTable]) {
        if (id && id !== 'Data') ids.add(id);
      }
    }
  }
  return [...ids];
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
    // An Invoice block's client and line-item columns belong to those tables, not to its own.
    // Filing them under c.table would have asked the user to find a "Description" column in their
    // invoice header table, where it does not exist.
    add(c.clientTable, c.clientNameColumn, ...(c.clientAddressColumns || []));
    add(c.itemsTable, c.itemsLinkColumn, c.itemDescColumn, c.itemQtyColumn, c.itemPriceColumn, c.itemTotalColumn);
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

    // An Invoice block's client and item tables are chosen independently of its own, so they are
    // remapped on their own terms. Done before the main block below, which may return early.
    for (const [tableKey, colKeys, arrKeys] of [
      ['clientTable', ['clientNameColumn'], ['clientAddressColumns']],
      ['itemsTable', ['itemsLinkColumn', 'itemDescColumn', 'itemQtyColumn', 'itemPriceColumn', 'itemTotalColumn'], []],
    ]) {
      const sub = cfg[tableKey] && choices[cfg[tableKey]];
      if (!sub || !sub.target || sub.target === OWN) continue;
      const sm = (id) => (id == null ? id : (sub.columns?.[id] || null));
      for (const k of colKeys) if (k in cfg) cfg[k] = sm(cfg[k]);
      for (const k of arrKeys) if (k in cfg) cfg[k] = (cfg[k] || []).map(sm).filter(Boolean);
      cfg[tableKey] = sub.target;
    }

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

export function openTemplatePicker(opts) {
  const { provider, onApply } = opts;
  // tableChoices: per template-table, { target: OWN | <user table id>, columns: {templateCol: userCol} }.
  // Default OWN for every table = "create it with sample data" (or backfill if a same-named empty
  // one exists) — the user can instead point any table at one of their own via the confirm step.
  const state = { picked: null, tableChoices: {}, applying: false, scratch: false,
    scratchWanted: new Set(), cleanupWanted: new Set(), cleanupTouched: new Set(), createdRecord: null };
  let previewHost = null; // set by buildLivePreview(); mounted only once actually in the document
  render();

  // The durable record of tables our templates created. Read once and reused: both the scratch
  // view and the per-template cleanup need it, and both are rendered synchronously, so it has to
  // be in hand before either draws rather than fetched from inside them.
  async function ensureCreatedRecord() {
    if (state.createdRecord) return state.createdRecord;
    try { state.createdRecord = await bridge.loadCreatedTables(); }
    catch (e) { console.warn('[ANUPRESS] could not read the created-tables record', e); state.createdRecord = []; }
    return state.createdRecord;
  }

  async function pick(t) { state.picked = t; await ensureCreatedRecord(); initChoices(t); render(); }
  function initChoices(t) {
    state.tableChoices = {};
    if (!provider.isLive) return; // demo mode loads sample data directly; no per-table choices
    for (const name of templateTables(t)) state.tableChoices[name] = { target: OWN, columns: {} };
    // Leftovers from whatever template was here before, ticked to go. Someone switching template
    // is replacing a design, and the tables the old one brought with it are sample data they never
    // asked for -- keeping them was how a document ended up with five industries' tables in it.
    state.cleanupWanted = new Set(previousTemplateTables());
    state.cleanupTouched = new Set();
  }

  // Tables in this document that one of our templates created and that are still there.
  //
  // Only ever the recorded ones. The inference used by "Start from scratch" is deliberately not
  // consulted here: that view is an explicit destructive act the user navigated to, where a
  // best-guess list left unticked is a helpful offer. This list is ticked by default, so it may
  // contain nothing we are not certain about.
  function previousTemplateTables() {
    return tablesToCleanUp({
      recorded: [
        ...(state.createdRecord || []),
        ...(Array.isArray(opts.config?.createdTables) ? opts.config.createdTables : []),
      ],
      present: (provider?.tables?.() || []).map((x) => x.id),
      // Never offer to delete a table the incoming template has been pointed AT — that would
      // remove the data the new design is about to read.
      inUse: Object.values(state.tableChoices || {}).map((c) => c.target).filter((x) => x && x !== OWN),
    });
  }

  function render() {
    previewHost = null;
    openDrawer({
      title: state.scratch ? 'Start from scratch' : state.picked ? 'Preview & apply' : 'Choose a starting point',
      body: state.scratch ? scratchBody() : state.picked ? confirmBody() : pickBody(),
      footer: state.scratch ? scratchFooter() : state.picked ? confirmFooter() : pickFooter(),
    });
    // Charts/maps/counters size themselves off clientWidth/clientHeight, which is only
    // meaningful once this content is actually attached — openDrawer() just appended it above,
    // so only now, not from inside confirmBody() itself (a detached tree measures as 0x0 and
    // the map's mount code gives up silently after a few zero-size retries).
    // Guarded, and the guard is load-bearing rather than tidy. doApply() calls render() to put the
    // footer into its "Setting up tables…" state, so anything thrown while mounting the preview
    // propagated out of doApply and the install stopped there — no tables created, no error shown,
    // the button stuck on "Setting up tables…" for good. A preview is decoration; it cannot be
    // allowed to cancel the thing it is previewing.
    if (previewHost) {
      for (const [fn, what] of [[mountCharts, 'charts'], [mountMaps, 'maps'], [mountCounters, 'counters'],
        [mountAttachmentImages, 'images'], [mountCountdowns, 'countdowns'], [mountCalendars, 'calendars']]) {
        try { fn(previewHost); } catch (e) { console.warn(`[ANUPRESS] preview ${what} failed to mount`, e); }
      }
    }
  }

  function pickBody() {
    // Starting blank is a choice of starting point like any other, so it belongs on this list
    // rather than behind its own button in the toolbar.
    const blank = el('button', { class: 'ap-addtile ap-addtile--blank' }, [
      el('span', { class: 'ap-addtile__icon' }, [icon('plus')]),
      el('div', { class: 'ap-addtile__text' }, [
        el('div', { class: 'ap-addtile__title', text: 'Start from scratch' }),
        el('div', { class: 'ap-addtile__desc', text: 'One empty page — and optionally clean up demo tables a template left behind' }),
      ]),
    ]);
    // The durable record is read here rather than at render time, because scratchBody() is
    // synchronous and needs it in hand to decide which tables are confirmed-ours (ticked) versus
    // merely schema-matched (left alone).
    blank.addEventListener('click', async () => {
      await ensureCreatedRecord();
      state.scratch = true;
      render();
    });

    const grid = el('div', { style: { display: 'grid', gap: '10px' } },
      TEMPLATES.map((t) => {
        // The one already installed says so on the list, rather than letting someone find out by
        // reinstalling it and waiting through the table setup for a design they already had.
        const status = templateStatus(opts.config, t.id);
        const card = el('button', { class: 'ap-addtile' + (status === 'fresh' ? '' : ' is-current') }, [
          el('span', { class: 'ap-addtile__icon' }, [icon(status === 'fresh' ? 'layout' : 'check')]),
          el('div', { class: 'ap-addtile__text' }, [
            el('div', { class: 'ap-addtile__title' }, [
              el('span', { text: t.name }),
              status === 'active' ? el('span', { class: 'ap-tilebadge', text: 'Active' }) : null,
              status === 'modified' ? el('span', { class: 'ap-tilebadge ap-tilebadge--warn', text: 'Active · edited' }) : null,
            ].filter(Boolean)),
            el('div', { class: 'ap-addtile__desc', text: status === 'modified'
              ? 'Installed, and changed since — opening this offers to reset it'
              : status === 'active' ? 'Already installed and unchanged' : t.tagline }),
          ]),
        ]);
        card.addEventListener('click', () => pick(t));
        return card;
      }));
    return [
      el('p', { class: 'ap-muted', style: { fontSize: '13px', marginBottom: '4px' }, text: 'Pick a starting point for your site — pages, sample cards and copy included. Everything is fully editable afterward.' }),
      blank,
      divider(),
      grid,
    ];
  }
  function pickFooter() { return [ghostBtn('Cancel', () => closeDrawer())]; }

  // ---- Start from scratch ----
  function scratchBody() {
    // Two sources, unioned. state.createdRecord is the durable row in the config table, loaded
    // before this view renders; opts.config.createdTables is where the record used to live, read
    // as well so a document written by an earlier version still gets its tables recognised.
    const recorded = [...new Set([
      ...(state.createdRecord || []),
      ...(Array.isArray(opts.config?.createdTables) ? opts.config.createdTables : []),
    ])];
    const present = new Set((provider?.tables?.() || []).map((t) => t.id));
    const confirmed = recorded.filter((id) => present.has(id));
    // Inferred, minus anything already on the confirmed list.
    const guessed = detectTemplateTables(provider).map((x) => x.name).filter((n) => !confirmed.includes(n));
    state.scratchWanted = new Set(confirmed); // confirmed on by default, inferred off

    const rows = (names, on) => el('div', { class: 'ap-scratch-list' }, names.map((id) => checkboxRow(id, on, (v) => {
      if (v) state.scratchWanted.add(id); else state.scratchWanted.delete(id);
    })));

    const body = [
      el('div', { class: 'ap-trust' }, [
        el('div', {}, [
          el('strong', { text: 'This clears the design, not your data' }),
          el('div', { text: 'Your own tables and everything in them are left exactly as they are. '
            + 'Only the tables you tick below are removed, and nothing is ticked that we are not sure about.' }),
        ]),
      ]),
      subhead('Start with'),
      el('div', { class: 'ap-muted', style: { fontSize: '13px', marginBottom: '10px' }, text:
        'One empty page. Every page, block, theme choice and uploaded image in the current design is discarded.' }),
      divider(),
    ];

    if (confirmed.length) {
      body.push(subhead('Created by a template in this document'), rows(confirmed, true));
    }
    if (guessed.length) {
      body.push(
        subhead('Look like template tables'),
        el('div', { class: 'ap-muted', style: { fontSize: '12px', marginBottom: '8px' }, text:
          'Matched by name and by every column a template creates — most likely ours, but added before this widget started keeping a record. '
          + 'Left unticked on purpose: tick only the ones you know are demo data.' }),
        rows(guessed, false),
      );
    }
    if (!confirmed.length && !guessed.length) {
      body.push(el('div', { class: 'ap-muted', style: { fontSize: '13px' }, text:
        'No demo tables found — nothing in this document matches a table one of our templates creates.' }));
    }
    return body;
  }

  function scratchFooter() {
    const go = el('button', { class: 'ap-btn ap-btn--danger', text: 'Erase and start fresh' });
    go.addEventListener('click', async () => {
      const toRemove = [...(state.scratchWanted || [])];
      go.disabled = true;
      if (toRemove.length) {
        toast('Removing demo tables…');
        const res = await bridge.removeTables(toRemove);
        if (res.failed.length) toast(`Removed ${res.removed.length}; ${res.failed.length} could not be removed — see the console.`, 'err');
        else if (res.removed.length) toast(`Removed ${res.removed.length} table${res.removed.length === 1 ? '' : 's'}.`, 'ok');
        // Drop what actually went, so the record stays a list of tables that still exist. Skipped
        // ones (already gone) count too; only genuine failures stay on the list for a later try.
        const gone = [...res.removed, ...res.skipped].filter(Boolean);
        if (gone.length) { try { await bridge.forgetCreatedTables(gone); } catch {} }
        if (provider?.refreshTables) { try { await provider.refreshTables(); } catch {} }
      }
      await bridge.clearStoredConfig();
      closeDrawer();
      opts.onApply(keepChosenMode(emptySite()));
      toast('Blank canvas — add your first element to begin.', 'ok');
    });
    return [ghostBtn('Back', () => { state.scratch = false; render(); }), go];
  }

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

  /**
   * Clearing up after the template being replaced.
   *
   * Applying a template used to only ever ADD: try three of them and the document quietly
   * accumulated three industries' sample tables, none of which the new design reads. The only way
   * out was "Start from scratch", which also throws away the design — so people kept the clutter.
   *
   * Removal happens BEFORE the new tables are created, which is what makes a name collision come
   * out right: two templates both wanting "Clients" with different columns used to leave the first
   * one's table in place, and the new design's blocks pointed at columns that were not there.
   * Dropping it first means it is recreated with the schema the incoming template expects.
   */
  function cleanupSection() {
    if (!provider.isLive) return [];
    // Recomputed on each render, because pointing a template table at one of the user's own tables
    // takes it off the list — and that choice is made in the section above this one.
    //
    const candidates = previousTemplateTables();
    state.cleanupWanted = resolveCleanupTicks({
      candidates, wanted: state.cleanupWanted, touched: state.cleanupTouched });
    if (!candidates.length) return [];

    // Two different things happen to these tables, and calling both "no longer needed" was wrong.
    // A table the incoming template also builds is removed and immediately rebuilt from its sample
    // data — which is the point, since that is how it gets the right columns rather than the last
    // template's — but anything added to it in the meantime goes with it. Reinstalling the SAME
    // template puts every one of its tables in that group, and telling someone their data is being
    // discarded because "this template does not use them" would be false on both counts.
    const choices = state.tableChoices || {};
    const incoming = new Set(templateTables(state.picked)
      .filter((name) => (choices[name]?.target ?? OWN) === OWN));
    const rebuilt = candidates.filter((id) => incoming.has(id));
    const dropped = candidates.filter((id) => !incoming.has(id));

    const rows = (names) => el('div', { class: 'ap-scratch-list' }, names.map((id) =>
      checkboxRow(id, state.cleanupWanted.has(id), (v) => {
        state.cleanupTouched.add(id); // an explicit choice, to be honoured across re-renders
        if (v) state.cleanupWanted.add(id); else state.cleanupWanted.delete(id);
      })));

    const out = [subhead('Tables from the template already installed')];
    if (rebuilt.length) {
      out.push(el('div', { class: 'ap-muted', style: { fontSize: '12px', lineHeight: '1.5', marginBottom: '8px' }, text:
        'This template builds these too. Ticked, they are removed and recreated with fresh sample data, which is how '
        + 'they end up with the columns it expects — but any rows you have added to them are lost. Untick to keep them as they are.' }));
      out.push(rows(rebuilt));
    }
    if (dropped.length) {
      if (rebuilt.length) out.push(el('div', { style: { height: '10px' } }));
      out.push(el('div', { class: 'ap-muted', style: { fontSize: '12px', lineHeight: '1.5', marginBottom: '8px' }, text:
        'These are not used by the template you are applying, and are removed along with their sample data.' }));
      out.push(rows(dropped));
    }
    out.push(el('div', { class: 'ap-muted', style: { fontSize: '11.5px', marginTop: '8px' }, text:
      'Only tables this widget created are listed. Your own tables are never touched.' }));
    out.push(divider());
    return out;
  }

  function confirmBody() {
    const t = state.picked;
    const status = templateStatus(opts.config, t.id);

    // Already installed and untouched: reinstalling would rebuild, byte for byte, what is already
    // on screen — several seconds of table setup to arrive back where you started. Say so, and
    // stop, rather than performing the work to prove it.
    if (status === 'active') {
      return [
        el('div', { class: 'ap-trust' }, [
          icon('check'),
          el('div', {}, [
            el('strong', { text: 'This template is already active.' }),
            el('div', { class: 'ap-muted', text: `“${t.name}” is what this document is currently using, and nothing has been changed since it was installed. `
              + 'Applying it again would rebuild the same pages and re-create the same tables to arrive exactly where you already are.' }),
          ]),
        ]),
        el('div', { class: 'ap-muted', style: { fontSize: '13px', marginTop: '12px' }, text:
          'Edit the pages directly, or go back and choose a different starting point.' }),
      ];
    }

    return [
      el('div', { class: 'ap-row', style: { marginBottom: '14px' } }, [
        el('span', { class: 'ap-addtile__icon' }, [icon('layout')]),
        el('div', {}, [
          el('div', { style: { fontWeight: 800, fontSize: '16px' }, text: t.name }),
          el('div', { class: 'ap-muted', text: t.tagline }),
        ]),
      ]),
      // Reinstalling the template you are already on is a reset, not an install, and the thing it
      // destroys is your own work rather than a stock design. That deserves saying plainly and
      // separately from the ordinary "this replaces what is here" notice at the bottom.
      status === 'modified' ? el('div', { class: 'ap-trust ap-trust--warn' }, [
        icon('trash'),
        el('div', {}, [
          el('strong', { text: 'You have changed this design since installing it.' }),
          el('div', { class: 'ap-muted', text: `“${t.name}” is already active. Applying it again resets it to the original — every page, block, `
            + 'theme choice and edit you have made since will be discarded. Cancel to keep your version.' }),
        ]),
      ]) : null,
      subhead('Pages included'),
      el('ul', { class: 'ap-consent-list' }, t.config.tabs.map((tab) => el('li', {}, [icon('layout'), el('span', { text: tab.title })]))),
      divider(),
      ...tablesSection(t),
      ...cleanupSection(),
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
    const toDrop = [...(state.cleanupWanted || [])];
    let dropped = [];

    if (toDrop.length || ownTables.length) {
      state.applying = true;
      render(); // footer button -> "Setting up tables…"
    }

    // Out with the old first. Order is the point: if the incoming template also wants a table the
    // outgoing one created, removing it here means the loop below recreates it with the right
    // columns, instead of finding a same-named table sitting there with the wrong ones.
    if (toDrop.length) {
      toast('Removing the previous template’s tables…');
      const res = await bridge.removeTables(toDrop);
      // Skipped means already gone, which for our purposes is the same as removed — both should
      // leave the record. Only real failures stay on it, for a later attempt.
      dropped = [...res.removed, ...res.skipped].filter(Boolean);
      if (dropped.length) { try { await bridge.forgetCreatedTables(dropped); } catch {} }
      if (res.failed.length) toast(`${res.failed.length} old table${res.failed.length === 1 ? '' : 's'} could not be removed — see the console.`, 'err');
      try { await provider.refreshTables(); } catch {}
    }

    if (ownTables.length) {
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
        // Written to its own row in the config table, which survives "Start from scratch" wiping
        // the design and accumulates across installs. `prev` used to be read from `cfg` — the
        // TEMPLATE's config — which is always empty, so the record only ever held the last
        // template's tables and everything installed before it was silently forgotten.
        await bridge.recordCreatedTables(madeByUs);
        const prev = (Array.isArray(opts.config?.createdTables) ? opts.config.createdTables : [])
          .filter((id) => !dropped.includes(id)); // a table just removed is not one we still have
        cfg.createdTables = [...new Set([...prev, ...madeByUs])]; // legacy mirror, still read on load
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

  // Templates and the blank site all ship mode:'auto' so they follow the environment. But if the
  // person using this has already picked light or dark for themselves, that choice must survive
  // switching template — otherwise the page flips under them every time they try another one,
  // which is precisely the complaint. A palette is the template's to change; light/dark is not.
  function keepChosenMode(applied) {
    const current = opts.config?.theme?.mode;
    if (current !== 'light' && current !== 'dark') return applied; // never chosen — stay on auto
    applied.theme = { ...(applied.theme || {}), mode: current };
    return applied;
  }

  // Applying a template writes the design to the document straight away, rather than leaving it
  // dirty for the next Save.
  //
  // Creating the tables takes several seconds — one round trip per table, plus its rows — and the
  // edit bar's own Save button stays live behind this drawer the whole time. Pressing it during
  // "Setting up tables…" saved the config as it was BEFORE the template was applied: the new
  // tables existed, full of data, while the stored design was still the old one. That is the
  // "imported perfectly but didn't save the latest version" case. Writing it here closes the
  // window, because the design lands in the same operation that created the tables.
  async function finishApply(applied) {
    const cfg = keepChosenMode(applied);
    // Stamp which template this is, and what it looked like the moment it landed. Nothing recorded
    // either before, so the picker could not tell an untouched install from a design someone had
    // spent an afternoon on — it just reinstalled, silently discarding the afternoon.
    cfg.templateId = state.picked?.id || null;
    cfg.templateSig = designSignature(cfg);
    state.applying = false;
    closeDrawer();
    onApply(cfg);
    if (!provider?.isLive) return;
    try {
      const ok = await bridge.saveConfig(cfg);
      // Tell the editor the design is on disk. It marks itself dirty when onApply hands it the new
      // config — correctly, since at that moment it is — but the save below settles it moments
      // later, and nothing said so. Pressing Done then wrote the identical config a second time:
      // in a real session that was two more full reads and a write of a 21KB design, for nothing.
      // Only on success, so a failed save still leaves Done something to retry.
      if (ok) opts.onSaved?.();
      else toast('Template applied, but saving the design failed — press Save to try again.', 'err');
    } catch (e) {
      console.warn('[ANUPRESS] could not save the applied template', e);
      toast('Template applied, but saving the design failed — press Save to try again.', 'err');
    }
  }

  function confirmFooter() {
    const back = ghostBtn('Back', () => { if (!state.applying) { state.picked = null; render(); } });
    const status = templateStatus(opts.config, state.picked?.id);
    // Nothing to apply, so nothing to press. Offering a disabled "Apply" would leave someone
    // hunting for what they had to change to enable it; there is no such thing.
    if (status === 'active') return [back, ghostBtn('Close', () => closeDrawer())];

    const label = state.applying ? 'Setting up tables…'
      : status === 'modified' ? 'Reset to this template' : 'Apply this template';
    const btn = primaryBtn(label, 'check', doApply);
    if (state.applying) btn.disabled = true;
    return [back, btn];
  }
}

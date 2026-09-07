// Edit-mode controller. Holds a working copy of the site config, re-renders the site in edit
// mode after every change, and exposes panels for theme, header, footer, tabs and blocks.

import { el, clone, uid, toast, designSignature } from '../util.js';
import { icon, brandLogo } from '../assets/icons.js';
import { renderSite } from '../render/site.js';
import { applyTheme, applyDesign } from '../theme/apply.js';
import { PALETTES, FONT_PAIRS } from '../theme/palettes.js';
import * as bridge from '../grist/bridge.js';
import { tablesInConfig } from '../data/provider.js';
import { openBlockEditor } from './block-editor.js';
import { newBlock } from './new-block.js';
import { findBlockIn, flattenBlocks, emptyCells } from '../data/grid.js';
import { openGuidedWizard } from './wizard.js';
import { openBlockChooser } from './chooser.js';
import { openTemplatePicker } from './template-picker.js';
import { makeBlocksSortable, makeTabsSortable, makePagesSortable } from './dnd.js';
import { openDrawer, closeDrawer, field, textInput, selectInput, checkboxRow, segmented, colorInput, subhead, divider, primaryBtn, ghostBtn } from './ui.js';
import { heroEditorBody } from './hero-editor.js';
import { readFileAsDataURL } from './imageutil.js';
import { VERSION } from '../version.js';

let working, provider, live, root, onExit, activeTabId, dirty = false;

// ---------------- History (undo / redo) ----------------
// Every change the editor makes already goes through mark(); the snapshot taken after it is one
// step in this list. Session-scoped on purpose: it lives while the editor is open and is cleared
// when Done closes it, so "undo" means "since I started editing", which is what people mean by
// it. Entries hold the design as JSON — a copy no later edit can reach into.
const HISTORY_MAX = 100;
let history = [], cursor = -1, savedCursor = 0;
let markContext = 'Change';          // the label a panel's many small marks fall back to
let markTimer = null, pendingLabel = null;

export function openBuilder(opts) {
  working = clone(opts.config);
  provider = opts.provider; live = !!opts.live; root = opts.root; onExit = opts.onExit;
  activeTabId = working.tabs?.[0]?.id || null;
  dirty = false;
  history = [{ label: 'Opened the editor', at: Date.now(), json: JSON.stringify(working) }];
  cursor = 0; savedCursor = 0; markContext = 'Change';
  document.removeEventListener('keydown', onHistoryKey);
  document.addEventListener('keydown', onHistoryKey);
  rerender();
}

// Called after a change to `working`. The snapshot is taken on the next tick, so a caller that
// marks before its last assignment still gets the finished state, and a burst of marks from one
// gesture (typing a title, dragging a slider) collapses into one step.
function mark(label = markContext) {
  dirty = true;
  pendingLabel = label;
  if (markTimer) return;
  markTimer = setTimeout(() => { markTimer = null; pushHistory(pendingLabel); }, 0);
}
function pushHistory(label) {
  const json = JSON.stringify(working);
  const now = Date.now();
  const cur = history[cursor];
  if (cur && cur.json === json) return;   // marked, but nothing actually changed
  // The same kind of change again within a moment is the same step — unless that step is the
  // saved one, which must stay exactly what was saved.
  if (cur && cur.label === label && now - cur.at < 1500 && cursor !== savedCursor && cursor === history.length - 1) {
    history[cursor] = { label, at: now, json };
  } else {
    history = history.slice(0, cursor + 1);
    history.push({ label, at: now, json });
    if (history.length > HISTORY_MAX) { history.shift(); savedCursor = Math.max(-1, savedCursor - 1); }
    cursor = history.length - 1;
  }
  syncHistoryButtons();
}
function goTo(i) {
  if (i < 0 || i >= history.length || i === cursor) return;
  cursor = i;
  working = JSON.parse(history[i].json);
  if (!(working.tabs || []).some((t) => t.id === activeTabId)) activeTabId = working.tabs?.[0]?.id || null;
  dirty = cursor !== savedCursor;
  applyTheme(working.theme, root);
  applyDesign(working.design, root);
  closeDrawer();
  rerender();
}
const undo = () => goTo(cursor - 1);
const redo = () => goTo(cursor + 1);
function syncHistoryButtons() {
  root.querySelectorAll('.ap-editbar [data-history]').forEach((b) => {
    b.disabled = b.dataset.history === 'undo' ? cursor <= 0 : cursor >= history.length - 1;
  });
}
function onHistoryKey(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  const k = String(e.key).toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
}
const timeAgo = (t) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
function openHistoryPanel() {
  const rows = history.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => el('button', {
    class: 'ap-hist' + (i === cursor ? ' is-current' : '') + (i > cursor ? ' is-ahead' : ''), type: 'button',
    'aria-current': i === cursor ? 'step' : null,
    onClick: () => { goTo(i); openHistoryPanel(); },
  }, [
    el('span', { class: 'ap-hist__label', text: h.label }),
    el('span', { class: 'ap-hist__meta', text: [timeAgo(h.at), i === savedCursor ? 'saved' : null, i === cursor ? 'current' : null].filter(Boolean).join(' · ') }),
  ]));
  openDrawer({
    title: 'History',
    body: [
      el('p', { class: 'ap-muted', style: { fontSize: '13px', marginBottom: '12px' },
        text: 'Every change since you opened the editor, newest first. Click a step to go back to it; the steps after it stay here until you make a new change. Undo is Ctrl+Z, redo Ctrl+Y. The list is cleared when you leave the editor.' }),
      el('div', { class: 'ap-histlist' }, rows),
    ],
    footer: [ghostBtn('Close', () => closeDrawer())],
  });
}
const findTab = (id) => (working.tabs || []).find((t) => t.id === id);
// Where a block is: on a tab's page list, or in a cell of a Grid block on that tab (then `parent`
// is the grid and `idx` the cell).
function findBlock(blockId) {
  for (const tab of working.tabs || []) {
    const hit = findBlockIn(tab.blocks, blockId);
    if (hit) return { tab, idx: hit.index, block: hit.block, parent: hit.parent };
  }
  return null;
}
// Put a block where another one is, or was.
function placeBlock(found, nb) {
  if (found.parent) found.parent.config.cells[found.idx] = nb;
  else found.tab.blocks[found.idx] = nb;
}

function rerender() {
  const api = renderSite({
    root, config: working, provider,
    onToggleTheme: () => {
      const next = (root.getAttribute('data-mode') === 'dark') ? 'light' : 'dark';
      working.theme = { ...(working.theme || {}), mode: next };
      applyTheme(working.theme, root); mark('Switched light and dark'); rerender();
    },
    edit: {
      active: true,
      onEditHeader: openHeaderPanel,
      onEditFooter: openFooterPanel,
      onEditHero: openHeroEditor,
      onEditBlock: editBlock,
      onDeleteBlock: deleteBlock,
      onAddBlock: chooseNewBlock,
      onAddInGrid: addBlockInGrid,
    },
  });
  root.prepend(buildEditBar());
  if (activeTabId) api.showTab(activeTabId);
  // keep activeTab in sync when user clicks nav
  root.querySelectorAll('.ap-nav__link').forEach((a) => a.addEventListener('click', () => { activeTabId = a.dataset.tab; }));
  setupDnd();
}

function setupDnd() {
  root.querySelectorAll('.ap-tabpanel .ap-grid').forEach((grid) => {
    const tabId = grid.closest('.ap-tabpanel')?.dataset.tab;
    makeBlocksSortable(grid, (orderIds) => {
      const tab = findTab(tabId); if (!tab) return;
      tab.blocks.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
      mark('Reordered blocks');
    });
  });
  const nav = root.querySelector('#ap-nav');
  makeTabsSortable(nav, (orderIds) => { working.tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); mark('Reordered pages'); });
}

// Everything that configures the SITE lives behind one button; the bar keeps only the two actions
// that end the session. Five separate buttons made the bar the busiest thing on screen and put
// "Templates" — which replaces the entire design — one stray click from "Save & Publish".
function buildEditBar() {
  const hist = (kind, title) => el('button', {
    class: 'ap-btn ap-btn--icon ap-btn--sm', type: 'button', title, 'aria-label': title,
    dataset: { history: kind }, disabled: kind === 'undo' ? cursor <= 0 : cursor >= history.length - 1,
    onClick: kind === 'undo' ? undo : redo,
  }, [icon(kind)]);
  return el('div', { class: 'ap-editbar' }, [
    el('div', { class: 'ap-editbar__brand' }, [ brandLogo(24), el('span', { class: 'ap-editbar__tag', text: 'EDITING' }) ]),
    el('div', { class: 'ap-row' }, [
      hist('undo', 'Undo (Ctrl+Z)'),
      hist('redo', 'Redo (Ctrl+Y)'),
      barBtn('history', 'History', openHistoryPanel),
      barBtn('settings', 'Settings', openSettingsPanel),
      ghostBtnWhite('Done', finish),
      primaryWhite('Save & Publish', save),
    ]),
  ]);
}

// The settings menu. Each row opens the panel that used to sit on the bar; every one of them
// replaces the drawer it was opened from, so Back is not needed to get between them.
const SETTINGS_ITEMS = [
  { ic: 'palette', title: 'Theme & colors', desc: 'Palette, font pairing, light or dark', open: () => openThemePanel() },
  { ic: 'sliders', title: 'Design', desc: 'Corners, spacing, shadows and card style', open: () => openDesignPanel() },
  { ic: 'layout', title: 'Pages', desc: 'Add, rename, reorder or remove pages', open: () => openTabsPanel() },
  { ic: 'type', title: 'Header', desc: 'Site name, logo and the navigation menu', open: () => openHeaderPanel() },
  { ic: 'menu', title: 'Footer', desc: 'Footer text, links and the credit line', open: () => openFooterPanel() },
  { ic: 'copy', title: 'Templates', desc: 'Install a starting point, or start from scratch', open: () => openTemplatesPanel() },
];

function openSettingsPanel() {
  openDrawer({
    title: 'Settings',
    body: [
      el('p', { class: 'ap-muted', style: { fontSize: '13px', marginBottom: '12px' },
        text: 'Everything that applies to the whole site. Blocks are edited on the page itself.' }),
      el('div', { style: { display: 'grid', gap: '10px' } }, SETTINGS_ITEMS.map((s) => {
        const tile = el('button', { class: 'ap-addtile' }, [
          el('span', { class: 'ap-addtile__icon' }, [icon(s.ic)]),
          el('div', { class: 'ap-addtile__text' }, [
            el('div', { class: 'ap-addtile__title' }, [el('span', { text: s.title })]),
            el('div', { class: 'ap-addtile__desc', text: s.desc }),
          ]),
        ]);
        tile.addEventListener('click', s.open);
        return tile;
      })),
      // The build in use, where a person answering "which version do you see?" can find it.
      el('p', { class: 'ap-muted ap-version', style: { fontSize: '12px', marginTop: '16px' }, text: `Advanced Charts v${VERSION}` }),
    ],
    footer: [ghostBtn('Close', () => closeDrawer())],
  });
}
// Every settings panel is now reached THROUGH the settings menu, so each one offers the way back
// as well as the way out. Without it, changing a colour and then wanting to change a corner meant
// closing the drawer and reopening Settings from the bar.
const settingsFooter = () => [
  ghostBtn('Back', () => openSettingsPanel()),
  primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); }),
];

const barBtn = (ic, label, on) => el('button', { class: 'ap-btn ap-btn--sm', onClick: on }, [icon(ic), label]);
const ghostBtnWhite = (label, on) => el('button', { class: 'ap-btn ap-btn--sm', onClick: on, text: label });
const primaryWhite = (label, on) => el('button', { class: 'ap-btn ap-btn--primary ap-btn--sm', onClick: on }, [icon('save'), label]);

// ---------------- Blocks ----------------
// The per-type starting shapes live in new-block.js, where a test holds them against the catalog.
const defaultBlock = (type) => newBlock(type, { table: working.dataTable || provider.defaultTable(), provider });

function chooseNewBlock(tabId) {
  openBlockChooser({
    onPick: (type) => { closeDrawer(); addBlock(tabId, type); },
    onLayout: (cols, rows) => { closeDrawer(); addLayout(tabId, cols, rows); },
    onGuided: () => { closeDrawer(); openGuidedWizard({ provider, onCreate: (block) => { const tab = findTab(tabId); (tab.blocks ||= []).push(block); mark('Added chart'); rerender(); } }); },
    onTemplates: () => { closeDrawer(); openTemplatesPanel(); },
  });
}
// A section laid out first and filled second. The grid lands on the page at once and the chooser
// opens for its first cell, so "a slicer above a chart" is: pick 1 × 2, pick Slicer, pick Chart.
// Custom (no size) goes through the grid editor, where columns and rows are chosen by hand.
function addLayout(tabId, cols, rows) {
  const grid = defaultBlock('grid');
  if (!cols) {
    openBlockEditor(grid, { provider, site: working, tabId, onApply: (nb) => {
      delete nb.__isNew; const tab = findTab(tabId); (tab.blocks ||= []).push(nb);
      mark(`Added a ${nb.config.cols} × ${nb.config.rows} section`); rerender();
    } });
    return;
  }
  delete grid.__isNew;
  grid.config.cols = cols; grid.config.rows = rows; grid.config.cells = emptyCells(cols, rows);
  const tab = findTab(tabId); (tab.blocks ||= []).push(grid);
  mark(`Added a ${cols} × ${rows} section`); rerender();
  addBlockInGrid(grid.id, 0);
}

function openTemplatesPanel() {
  openTemplatePicker({
    provider,
    config: working,
    onApply: (newConfig) => {
      working = newConfig;
      activeTabId = working.tabs?.[0]?.id || null;
      mark('Applied a template');
      rerender();
    },
    // Applying a template writes the design itself, so once that lands there is nothing left
    // unsaved. Without this the editor stayed dirty and Done saved the same config again.
    //
    // Only if it is still the design that was saved. saveConfig takes a moment, and anything
    // edited while it was in flight is genuinely unsaved — clearing the flag regardless would let
    // Done discard it. templateSig is the fingerprint taken at the instant it was written, so any
    // change since shows up here.
    onSaved: () => { if (designSignature(working) === working.templateSig) { dirty = false; savedCursor = cursor; } },
  });
}

function addBlock(tabId, type) {
  const block = defaultBlock(type, tabId);
  openBlockEditor(block, { provider, site: working, tabId, onApply: (nb) => { delete nb.__isNew; const tab = findTab(tabId); (tab.blocks ||= []).push(nb); mark(`Added ${nb.type}`); rerender(); } });
}
function editBlock(blockId) {
  const found = findBlock(blockId); if (!found) return;
  // inGrid tells the editor's layout section how many columns and rows a cell block can span.
  const inGrid = found.parent ? { cols: found.parent.config?.cols || 1, rows: found.parent.config?.rows || 1 } : null;
  openBlockEditor(found.block, { provider, site: working, tabId: found.tab.id, inGrid, onApply: (nb) => { delete nb.__isNew; placeBlock(found, nb); mark(`Edited ${nb.type}`); rerender(); } });
}
function deleteBlock(blockId) {
  const found = findBlock(blockId); if (!found) return;
  // A deleted cell stays a cell: the grid keeps its shape and the cell goes back to empty.
  if (found.parent) found.parent.config.cells[found.idx] = null;
  else found.tab.blocks.splice(found.idx, 1);
  mark(`Deleted ${found.block.type}`); rerender();
}
// The Add button in an empty cell of a Grid block. Same chooser and same editors as the page's
// Add Element, landing in the cell instead of at the end of the page. One level only: the chooser
// does not offer a grid here.
function addBlockInGrid(gridId, cell) {
  const found = findBlock(gridId); if (!found || found.block.type !== 'grid') return;
  const grid = found.block;
  const put = (nb) => { delete nb.__isNew; (grid.config.cells ||= [])[cell] = nb; mark(`Added ${nb.type} to a cell`); rerender(); };
  const inGrid = { cols: grid.config?.cols || 1, rows: grid.config?.rows || 1 };
  openBlockChooser({
    exclude: ['grid'], title: 'Add to this cell',
    onPick: (type) => { closeDrawer(); openBlockEditor(defaultBlock(type), { provider, site: working, tabId: found.tab.id, inGrid, onApply: put }); },
    onGuided: () => { closeDrawer(); openGuidedWizard({ provider, onCreate: put }); },
    onTemplates: () => { closeDrawer(); openTemplatesPanel(); },
  });
}

// ---------------- Theme ----------------
function openThemePanel() {
  markContext = 'Changed theme';
  const t = working.theme || (working.theme = {});
  const cards = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
    PALETTES.map((p) => {
      const card = el('button', { class: 'ap-palette-card' + (t.paletteId === p.id ? ' is-active' : '') }, [
        el('div', { class: 'ap-palette-card__dots' }, p.series.slice(0, 4).map((c) => el('span', { class: 'ap-palette-card__dot', style: { background: c } }))),
        el('span', { class: 'ap-palette-card__name', text: p.name }),
      ]);
      card.addEventListener('click', () => { t.paletteId = p.id; t.primary = null; t.accent = null; if (p.mode) t.mode = p.mode; applyTheme(working.theme, root); mark(); openThemePanel(); rerenderSoon(); });
      return card;
    }));
  openDrawer({ title: 'Theme & colors', body: [
    subhead('Color templates'), cards, divider(),
    field('Font pairing', selectInput(FONT_PAIRS.map((f) => ({ value: f.id, label: f.name })), t.fontId || 'system', (v) => { t.fontId = v; applyTheme(working.theme, root); mark(); rerenderSoon(); })),
    field('Appearance', segmented([{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], t.mode || 'light', (v) => { t.mode = v; applyTheme(working.theme, root); mark(); rerenderSoon(); })),
    divider(), subhead('Custom accent (optional)'),
    el('div', { class: 'ap-row' }, [ el('span', { class: 'ap-label', text: 'Primary' }), colorInput(readPrimary(), (v) => { t.primary = v; applyTheme(working.theme, root); mark(); }) ]),
    el('div', { class: 'ap-row', style: { marginTop: '8px' } }, [ el('span', { class: 'ap-label', text: 'Accent' }), colorInput(t.accent || '#16c4a6', (v) => { t.accent = v; applyTheme(working.theme, root); mark(); }) ]),
  ], footer: settingsFooter() });
}
function readPrimary() { const p = PALETTES.find((x) => x.id === (working.theme?.paletteId)) || PALETTES[0]; return working.theme?.primary || p.primary; }

// ---------------- Global design ----------------
function openDesignPanel() {
  markContext = 'Changed design';
  const d = working.design || (working.design = {});
  const apply = () => { applyDesign(working.design, root); mark(); rerenderSoon(); };
  openDrawer({ title: 'Design', body: [
    field('Corners', segmented([{ value: 8, label: 'Sharp' }, { value: 14, label: 'Rounded' }, { value: 20, label: 'Soft' }, { value: 28, label: 'Round' }], d.radius ?? 14, (v) => { d.radius = Number(v); apply(); })),
    field('Density', segmented([{ value: 12, label: 'Compact' }, { value: 18, label: 'Cozy' }, { value: 26, label: 'Roomy' }], d.gap ?? 18, (v) => { d.gap = Number(v); apply(); })),
    field('Content width', segmented([{ value: 960, label: 'Narrow' }, { value: 1180, label: 'Medium' }, { value: 1400, label: 'Wide' }, { value: 'full', label: 'Full' }], d.maxw ?? 1180, (v) => { d.maxw = v; apply(); })),
    field('Shadows', segmented([{ value: 'flat', label: 'Flat' }, { value: 'soft', label: 'Soft' }, { value: 'bold', label: 'Bold' }], d.shadow || 'soft', (v) => { d.shadow = v; apply(); })),
    field('Text size', segmented([{ value: 0.92, label: 'Small' }, { value: 1, label: 'Normal' }, { value: 1.12, label: 'Large' }], d.fontScale ?? 1, (v) => { d.fontScale = Number(v); apply(); })),
    el('p', { class: 'ap-muted', style: { fontSize: '12px', marginTop: '6px' }, text: 'These apply site-wide, in both light and dark themes.' }),
  ], footer: settingsFooter() });
}

// ---------------- Header ----------------
function openHeaderPanel() {
  markContext = 'Edited header';
  const h = working.header || (working.header = {});
  const logoPreview = el('div', { class: 'ap-row', style: { marginBottom: '10px' } }, [logoThumb(h)]);
  const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  fileInput.addEventListener('change', async () => { const f = fileInput.files?.[0]; if (!f) return; h.logoData = await readFileAsDataURL(f, 320); logoPreview.replaceChildren(logoThumb(h)); mark(); rerenderSoon(); });
  openDrawer({ title: 'Header', body: [
    subhead('Logo'), logoPreview,
    el('div', { class: 'ap-row' }, [
      el('button', { class: 'ap-btn ap-btn--soft', onClick: () => fileInput.click() }, [icon('image'), 'Upload logo']), fileInput,
      h.logoData ? el('button', { class: 'ap-btn ap-btn--ghost ap-btn--danger', onClick: () => { h.logoData = null; logoPreview.replaceChildren(logoThumb(h)); mark(); rerenderSoon(); } }, [icon('trash'), 'Remove']) : null,
    ]),
    divider(),
    field('Site title', textInput(h.title || '', (v) => { h.title = v; mark(); rerenderSoon(); }, { placeholder: 'Your brand' })),
    field('Slogan', textInput(h.slogan || '', (v) => { h.slogan = v; mark(); rerenderSoon(); }, { placeholder: 'A short tagline' })),
  ], footer: settingsFooter() });
}
function logoThumb(h) {
  return h.logoData ? el('img', { src: h.logoData, alt: 'logo', style: { height: '40px', borderRadius: '8px' } }) : brandLogo(40);
}

// ---------------- Footer ----------------
function openFooterPanel() {
  markContext = 'Edited footer';
  const f = working.footer || (working.footer = {});
  const linksHost = el('div');
  function renderLinks() {
    linksHost.replaceChildren(subhead('Footer menu (right side)'));
    (f.links || []).forEach((lnk, i) => {
      const row = el('div', { class: 'ap-tabedit' }, [
        textInput(lnk.label || '', (v) => { lnk.label = v; mark(); rerenderSoon(); }, { placeholder: 'Label' }),
        selectInput([{ value: '', label: 'Custom URL…' }].concat((working.tabs || []).map((t) => ({ value: 'tab:' + t.id, label: 'Page: ' + t.title }))), lnk.tab ? 'tab:' + lnk.tab : '', (v) => { if (v.startsWith('tab:')) { lnk.tab = v.slice(4); lnk.href = null; } else { lnk.tab = null; lnk.href = lnk.href || '#'; } mark(); rerenderSoon(); }),
        el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-btn--danger', onClick: () => { f.links.splice(i, 1); renderLinks(); mark(); rerenderSoon(); } }, [icon('trash')]),
      ]);
      linksHost.append(row);
    });
    const t0 = working.tabs?.[0];
    linksHost.append(el('div', { class: 'ap-row', style: { gap: '8px', flexWrap: 'wrap' } }, [
      el('button', { class: 'ap-btn ap-btn--soft ap-btn--sm', onClick: () => { (f.links ||= []).push(t0 ? { label: t0.title, tab: t0.id } : { label: 'New link', href: '#' }); renderLinks(); mark(); rerenderSoon(); } }, [icon('plus'), 'Add page to menu']),
      el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', onClick: () => { (f.links ||= []).push({ label: 'New link', href: '#' }); renderLinks(); mark(); rerenderSoon(); } }, [icon('plus'), 'Add URL']),
    ]));
  }
  renderLinks();
  openDrawer({ title: 'Footer', body: [
    field('Footer text', textInput(f.text || '', (v) => { f.text = v; mark(); rerenderSoon(); }, { placeholder: '© 2026 Your Company' })),
    el('div', { class: 'ap-muted', style: { fontSize: '12px', marginBottom: '10px' }, text: 'The “Built with ANUPRESS” credit always appears on the right.' }),
    divider(), linksHost,
  ], footer: settingsFooter() });
}

// ---------------- Tabs / pages ----------------
function openTabsPanel() {
  markContext = 'Edited pages';
  const host = el('div');
  function render() {
    host.replaceChildren(subhead('Pages (tabs)'));
    (working.tabs || []).forEach((tab, i) => {
      const row = el('div', { class: 'ap-tabedit', dataset: { tabId: tab.id } }, [
        el('span', { class: 'ap-tab-grip', title: 'Drag to reorder' }, [icon('grip')]),
        textInput(tab.title || '', (v) => { tab.title = v; mark(); rerenderSoon(); }, { placeholder: 'Tab name' }),
        el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm', title: 'Edit hero / slider', onClick: () => openHeroEditor(tab) }, [icon('sparkles')]),
        working.tabs.length > 1 ? el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-btn--danger', onClick: () => { working.tabs.splice(i, 1); if (activeTabId === tab.id) activeTabId = working.tabs[0]?.id; render(); mark(); rerenderSoon(); } }, [icon('trash')]) : null,
      ]);
      host.append(row);
    });
    host.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: addTab }, [icon('plus'), 'Add page']));
  }
  function addTab() { const id = uid('tab'); working.tabs.push({ id, title: 'New Page', hero: { title: 'New Page', subtitle: '' }, blocks: [] }); activeTabId = id; render(); mark(); rerenderSoon(); }

  // External URL menu items (no page content) — shown in the nav after the pages.
  const menuHost = el('div', { style: { marginTop: '14px' } });
  function renderMenu() {
    const m = working.header || (working.header = {});
    m.menuLinks = m.menuLinks || [];
    menuHost.replaceChildren(subhead('Menu links (external URLs)'));
    m.menuLinks.forEach((lnk, i) => {
      menuHost.append(el('div', { class: 'ap-tabedit' }, [
        textInput(lnk.label || '', (v) => { lnk.label = v; mark(); rerenderSoon(); }, { placeholder: 'Label' }),
        textInput(lnk.href || '', (v) => { lnk.href = v; mark(); rerenderSoon(); }, { placeholder: 'https://example.com' }),
        el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-btn--danger', title: 'Remove', onClick: () => { m.menuLinks.splice(i, 1); renderMenu(); mark(); rerenderSoon(); } }, [icon('trash')]),
      ]));
    });
    menuHost.append(el('button', { class: 'ap-btn ap-btn--soft ap-btn--sm', onClick: () => { m.menuLinks.push({ label: 'New link', href: 'https://', newTab: true }); renderMenu(); mark(); rerenderSoon(); } }, [icon('plus'), 'Add URL link']));
  }

  render();
  renderMenu();
  openDrawer({ title: 'Pages & menu', body: [host, divider(), menuHost], footer: settingsFooter() });
  makePagesSortable(host, (orderIds) => { working.tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); mark(); rerenderSoon(); });
}

function openHeroEditor(tabOrId) {
  markContext = 'Edited hero';
  const tab = typeof tabOrId === 'string' ? findTab(tabOrId) : tabOrId;
  if (!tab) return;
  openDrawer({
    title: 'Hero / slider',
    // A hero belongs to one page and is opened by clicking it, not from Settings — so no Back.
    body: heroEditorBody(tab, { onChange: () => { mark(); rerenderSoon(); } }),
    footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })],
  });
}

// ---------------- Persist / exit ----------------
let _soon;
function rerenderSoon() { clearTimeout(_soon); _soon = setTimeout(() => rerender(), 350); }

function cleanConfig() {
  const c = clone(working);
  for (const tab of c.tabs || []) for (const b of flattenBlocks(tab.blocks)) delete b.__isNew;
  return c;
}

async function save() {
  const cfg = cleanConfig();
  if (live) {
    toast('Publishing…');
    const size = bridge.measureConfig(cfg);
    const ok = await bridge.saveConfig(cfg);
    // Size no longer decides whether a save succeeds — a large design is written across several
    // requests. It is still worth mentioning once it is heavy, because it counts against the
    // document's data allowance, which does vary by plan.
    if (ok && size.overSoft) {
      toast(`Published (${Math.round(size.bytes / 1024)} KB, saved in parts). Uploaded images are what make a design heavy.`, 'ok');
    } else {
      toast(ok ? 'Published to your Grist document' : 'Saved locally (could not write to Grist)', ok ? 'ok' : 'err');
    }
    // This used to call provider.invalidate() with no argument, which empties the ENTIRE row
    // cache. Saving a design does not change a single row, but the next render then had nothing
    // to draw — every KPI read 0 and every chart said "No data to display yet" until the widget
    // was reloaded. Most visible right after applying a template, where the tables had just been
    // created and populated moments earlier.
    //
    // Reload instead of discard: prime() re-fetches only tables that are not already cached, so
    // for the common case (nothing moved) this costs no requests at all, and a block repointed at
    // a different table during the edit gets its rows before the page is drawn again.
    if (ok) { try { await provider.prime?.(tablesInConfig(cfg)); } catch (e) { console.warn('[ANUPRESS] post-save prime failed', e); } }
  } else {
    toast('Demo mode — connect inside Grist to save', '');
  }
  dirty = false;
  savedCursor = cursor;
  syncHistoryButtons();
}

async function finish() {
  if (live && dirty) await save();
  closeDrawer();
  // The session's history goes with the editor; the next Edit starts a fresh one.
  document.removeEventListener('keydown', onHistoryKey);
  onExit?.(cleanConfig());
}

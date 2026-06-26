// Edit-mode controller. Holds a working copy of the site config, re-renders the site in edit
// mode after every change, and exposes panels for theme, header, footer, tabs and blocks.

import { el, clone, uid, toast } from '../util.js';
import { icon, brandLogo } from '../assets/icons.js';
import { renderSite } from '../render/site.js';
import { applyTheme, applyDesign } from '../theme/apply.js';
import { PALETTES, FONT_PAIRS } from '../theme/palettes.js';
import { autoPick, isMeasure, isDimension } from '../charts/recommend.js';
import { detectLatLon } from '../render/map.js';
import * as bridge from '../grist/bridge.js';
import { openBlockEditor } from './block-editor.js';
import { makeBlocksSortable, makeTabsSortable, makePagesSortable } from './dnd.js';
import { openDrawer, closeDrawer, field, textInput, selectInput, checkboxRow, segmented, colorInput, subhead, divider, primaryBtn, ghostBtn } from './ui.js';
import { heroEditorBody } from './hero-editor.js';
import { readFileAsDataURL } from './imageutil.js';

let working, provider, live, root, onExit, activeTabId, dirty = false;

export function openBuilder(opts) {
  working = clone(opts.config);
  provider = opts.provider; live = !!opts.live; root = opts.root; onExit = opts.onExit;
  activeTabId = working.tabs?.[0]?.id || null;
  dirty = false;
  rerender();
}

function mark() { dirty = true; }
const findTab = (id) => (working.tabs || []).find((t) => t.id === id);
function findBlock(blockId) {
  for (const tab of working.tabs || []) { const i = (tab.blocks || []).findIndex((b) => b.id === blockId); if (i >= 0) return { tab, idx: i, block: tab.blocks[i] }; }
  return null;
}

function rerender() {
  const api = renderSite({
    root, config: working, provider,
    onToggleTheme: () => {
      const next = (root.getAttribute('data-mode') === 'dark') ? 'light' : 'dark';
      working.theme = { ...(working.theme || {}), mode: next };
      applyTheme(working.theme, root); mark(); rerender();
    },
    edit: {
      active: true,
      onEditHeader: openHeaderPanel,
      onEditFooter: openFooterPanel,
      onEditHero: openHeroEditor,
      onEditBlock: editBlock,
      onDeleteBlock: deleteBlock,
      onAddBlock: chooseNewBlock,
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
      mark();
    });
  });
  const nav = root.querySelector('#ap-nav');
  makeTabsSortable(nav, (orderIds) => { working.tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); mark(); });
}

function buildEditBar() {
  return el('div', { class: 'ap-editbar' }, [
    el('div', { class: 'ap-editbar__brand' }, [ brandLogo(24), el('span', { class: 'ap-editbar__tag', text: 'EDITING' }) ]),
    el('div', { class: 'ap-row' }, [
      barBtn('palette', 'Theme', openThemePanel),
      barBtn('sliders', 'Design', openDesignPanel),
      barBtn('layout', 'Pages', openTabsPanel),
      barBtn('type', 'Header', openHeaderPanel),
      ghostBtnWhite('Done', finish),
      primaryWhite('Save & Publish', save),
    ]),
  ]);
}
const barBtn = (ic, label, on) => el('button', { class: 'ap-btn ap-btn--sm', onClick: on }, [icon(ic), label]);
const ghostBtnWhite = (label, on) => el('button', { class: 'ap-btn ap-btn--sm', onClick: on, text: label });
const primaryWhite = (label, on) => el('button', { class: 'ap-btn ap-btn--primary ap-btn--sm', onClick: on }, [icon('save'), label]);

// ---------------- Blocks ----------------
function defaultBlock(type, tabId) {
  const table = working.dataTable || provider.defaultTable();
  const cols = provider.columns(table);
  if (type === 'stat') {
    const m = cols.filter(isMeasure)[0];
    const col = m || cols[0];
    return { id: uid('blk'), type: 'stat', span: 3, __isNew: true, config: { table, label: 'New metric', column: col?.id, agg: m ? 'sum' : 'count', icon: 'pulse', deltaBy: null, format: { compact: true } } };
  }
  if (type === 'text') return { id: uid('blk'), type: 'text', span: 12, __isNew: true, config: { heading: 'New section', html: 'Write something here…' } };
  if (type === 'breakdown') {
    const dim = cols.filter(isDimension)[0] || cols[0];
    return { id: uid('blk'), type: 'breakdown', span: 4, __isNew: true, config: { table, title: dim?.label || 'Breakdown', column: dim?.id, limit: 12 } };
  }
  if (type === 'map') {
    const det = detectLatLon(cols);
    const label = cols.find((c) => /name|code|title|label/i.test(c.id)) || cols.filter(isDimension)[0] || cols[0];
    return { id: uid('blk'), type: 'map', span: 12, __isNew: true, config: { table, title: 'Map', latColumn: det.lat || '', lonColumn: det.lon || '', labelColumn: label?.id || null, colorBy: null } };
  }
  return { id: uid('blk'), type: 'chart', span: 6, __isNew: true, config: { table, title: 'New chart', ...autoPick(cols) } };
}

function chooseNewBlock(tabId) {
  const opt = (ic, title, desc, type) => el('button', { class: 'ap-addblock', style: { minHeight: '92px' }, onClick: () => { closeDrawer(); addBlock(tabId, type); } },
    [ el('div', { class: 'ap-stat__icon' }, [icon(ic)]), el('div', {}, [ el('div', { style: { fontWeight: '700' }, text: title }), el('div', { class: 'ap-muted', style: { fontWeight: '400', fontSize: '12px' }, text: desc }) ]) ]);
  openDrawer({ title: 'Add a block', body: [
    el('div', { style: { display: 'grid', gap: '10px' } }, [
      opt('trending', 'Stat card', 'A single KPI number with trend', 'stat'),
      opt('barchart', 'Chart', 'Bar, line, pie, scatter and more', 'chart'),
      opt('database', 'Breakdown', 'Group-wise counts with % and colored dots', 'breakdown'),
      opt('globe', 'Map', 'Plot lat/long points on a map', 'map'),
      opt('type', 'Text', 'A heading and rich text', 'text'),
    ]),
  ], footer: [ghostBtn('Cancel', () => closeDrawer())] });
}

function addBlock(tabId, type) {
  const block = defaultBlock(type, tabId);
  openBlockEditor(block, { provider, site: working, onApply: (nb) => { delete nb.__isNew; const tab = findTab(tabId); (tab.blocks ||= []).push(nb); mark(); rerender(); } });
}
function editBlock(blockId) {
  const found = findBlock(blockId); if (!found) return;
  openBlockEditor(found.block, { provider, site: working, onApply: (nb) => { delete nb.__isNew; found.tab.blocks[found.idx] = nb; mark(); rerender(); } });
}
function deleteBlock(blockId) {
  const found = findBlock(blockId); if (!found) return;
  found.tab.blocks.splice(found.idx, 1); mark(); rerender();
}

// ---------------- Theme ----------------
function openThemePanel() {
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
  ], footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })] });
}
function readPrimary() { const p = PALETTES.find((x) => x.id === (working.theme?.paletteId)) || PALETTES[0]; return working.theme?.primary || p.primary; }

// ---------------- Global design ----------------
function openDesignPanel() {
  const d = working.design || (working.design = {});
  const apply = () => { applyDesign(working.design, root); mark(); rerenderSoon(); };
  openDrawer({ title: 'Design', body: [
    field('Corners', segmented([{ value: 8, label: 'Sharp' }, { value: 14, label: 'Rounded' }, { value: 20, label: 'Soft' }, { value: 28, label: 'Round' }], d.radius ?? 14, (v) => { d.radius = Number(v); apply(); })),
    field('Density', segmented([{ value: 12, label: 'Compact' }, { value: 18, label: 'Cozy' }, { value: 26, label: 'Roomy' }], d.gap ?? 18, (v) => { d.gap = Number(v); apply(); })),
    field('Content width', segmented([{ value: 960, label: 'Narrow' }, { value: 1180, label: 'Medium' }, { value: 1400, label: 'Wide' }, { value: 'full', label: 'Full' }], d.maxw ?? 1180, (v) => { d.maxw = v; apply(); })),
    field('Shadows', segmented([{ value: 'flat', label: 'Flat' }, { value: 'soft', label: 'Soft' }, { value: 'bold', label: 'Bold' }], d.shadow || 'soft', (v) => { d.shadow = v; apply(); })),
    field('Text size', segmented([{ value: 0.92, label: 'Small' }, { value: 1, label: 'Normal' }, { value: 1.12, label: 'Large' }], d.fontScale ?? 1, (v) => { d.fontScale = Number(v); apply(); })),
    el('p', { class: 'ap-muted', style: { fontSize: '12px', marginTop: '6px' }, text: 'These apply site-wide, in both light and dark themes.' }),
  ], footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })] });
}

// ---------------- Header ----------------
function openHeaderPanel() {
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
  ], footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })] });
}
function logoThumb(h) {
  return h.logoData ? el('img', { src: h.logoData, alt: 'logo', style: { height: '40px', borderRadius: '8px' } }) : brandLogo(40);
}

// ---------------- Footer ----------------
function openFooterPanel() {
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
  ], footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })] });
}

// ---------------- Tabs / pages ----------------
function openTabsPanel() {
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
  openDrawer({ title: 'Pages & menu', body: [host, divider(), menuHost], footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })] });
  makePagesSortable(host, (orderIds) => { working.tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); mark(); rerenderSoon(); });
}

function openHeroEditor(tabOrId) {
  const tab = typeof tabOrId === 'string' ? findTab(tabOrId) : tabOrId;
  if (!tab) return;
  openDrawer({
    title: 'Hero / slider',
    body: heroEditorBody(tab, { onChange: () => { mark(); rerenderSoon(); } }),
    footer: [primaryBtn('Done', 'check', () => { closeDrawer(); rerender(); })],
  });
}

// ---------------- Persist / exit ----------------
let _soon;
function rerenderSoon() { clearTimeout(_soon); _soon = setTimeout(() => rerender(), 350); }

function cleanConfig() {
  const c = clone(working);
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) delete b.__isNew;
  return c;
}

async function save() {
  const cfg = cleanConfig();
  if (live) {
    toast('Publishing…');
    const ok = await bridge.saveConfig(cfg);
    toast(ok ? 'Published to your Grist document' : 'Saved locally (could not write to Grist)', ok ? 'ok' : 'err');
    if (ok && provider.invalidate) provider.invalidate();
  } else {
    toast('Demo mode — connect inside Grist to save', '');
  }
  dirty = false;
}

async function finish() {
  if (live && dirty) await save();
  closeDrawer();
  onExit?.(cleanConfig());
}

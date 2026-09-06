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
import { openGuidedWizard } from './wizard.js';
import { openBlockChooser } from './chooser.js';
import { openTemplatePicker } from './template-picker.js';
import { makeBlocksSortable, makeTabsSortable, makePagesSortable } from './dnd.js';
import { openDrawer, closeDrawer, field, textInput, selectInput, checkboxRow, segmented, colorInput, subhead, divider, primaryBtn, ghostBtn } from './ui.js';
import { heroEditorBody } from './hero-editor.js';
import { readFileAsDataURL } from './imageutil.js';
import { VERSION } from '../version.js';

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

// Everything that configures the SITE lives behind one button; the bar keeps only the two actions
// that end the session. Five separate buttons made the bar the busiest thing on screen and put
// "Templates" — which replaces the entire design — one stray click from "Save & Publish".
function buildEditBar() {
  return el('div', { class: 'ap-editbar' }, [
    el('div', { class: 'ap-editbar__brand' }, [ brandLogo(24), el('span', { class: 'ap-editbar__tag', text: 'EDITING' }) ]),
    el('div', { class: 'ap-row' }, [
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
    onGuided: () => { closeDrawer(); openGuidedWizard({ provider, onCreate: (block) => { const tab = findTab(tabId); (tab.blocks ||= []).push(block); mark(); rerender(); } }); },
    onTemplates: () => { closeDrawer(); openTemplatesPanel(); },
  });
}

function openTemplatesPanel() {
  openTemplatePicker({
    provider,
    config: working,
    onApply: (newConfig) => {
      working = newConfig;
      activeTabId = working.tabs?.[0]?.id || null;
      mark();
      rerender();
    },
    // Applying a template writes the design itself, so once that lands there is nothing left
    // unsaved. Without this the editor stayed dirty and Done saved the same config again.
    //
    // Only if it is still the design that was saved. saveConfig takes a moment, and anything
    // edited while it was in flight is genuinely unsaved — clearing the flag regardless would let
    // Done discard it. templateSig is the fingerprint taken at the instant it was written, so any
    // change since shows up here.
    onSaved: () => { if (designSignature(working) === working.templateSig) dirty = false; },
  });
}

function addBlock(tabId, type) {
  const block = defaultBlock(type, tabId);
  openBlockEditor(block, { provider, site: working, tabId, onApply: (nb) => { delete nb.__isNew; const tab = findTab(tabId); (tab.blocks ||= []).push(nb); mark(); rerender(); } });
}
function editBlock(blockId) {
  const found = findBlock(blockId); if (!found) return;
  openBlockEditor(found.block, { provider, site: working, tabId: found.tab.id, onApply: (nb) => { delete nb.__isNew; found.tab.blocks[found.idx] = nb; mark(); rerender(); } });
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
  ], footer: settingsFooter() });
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
  ], footer: settingsFooter() });
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
  ], footer: settingsFooter() });
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
  ], footer: settingsFooter() });
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
  openDrawer({ title: 'Pages & menu', body: [host, divider(), menuHost], footer: settingsFooter() });
  makePagesSortable(host, (orderIds) => { working.tabs.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); mark(); rerenderSoon(); });
}

function openHeroEditor(tabOrId) {
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
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) delete b.__isNew;
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
}

async function finish() {
  if (live && dirty) await save();
  closeDrawer();
  onExit?.(cleanConfig());
}

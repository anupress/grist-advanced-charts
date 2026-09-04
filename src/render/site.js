// Orchestrates the whole site: header + tabbed body + footer. Tabs switch in-page with no
// reload; charts mount lazily the first time their tab becomes visible (so they get a real size).

import { el, clear, fromHTML } from '../util.js';
import { applyTheme, applyDesign } from '../theme/apply.js';
import { buildHeader } from './header.js';
import { buildFooter } from './footer.js';
import { renderBlock, mountCharts } from './blocks.js';
import { buildHero } from './hero.js';
import { mountMaps, resizeMapsIn } from './map.js';
import { mountCounters } from './counter.js';
import { mountAttachmentImages } from './media-mount.js';
import { mountCountdowns } from './countdown.js';
import { mountCalendars } from './calendar.js';
import { resizeChartsIn, wireGlobalResize } from '../charts/echarts-adapter.js';
import { icon } from '../assets/icons.js';
import { selectButton, mountTray } from '../print/printout.js';
import { slicersFor, filteredProvider } from '../data/slicer.js';

export function renderSite(opts) {
  const { root, config, provider } = opts;
  const edit = opts.edit || null;
  const editing = !!edit?.active;

  applyTheme(config.theme, root);
  applyDesign(config.design, root);
  wireGlobalResize();
  clear(root);
  root.classList.toggle('is-editing', editing);

  let activeTabId = (config.tabs?.[0]?.id) || null;
  const panels = new Map();
  const mounted = new Set();

  const header = buildHeader(config, {
    editing, activeTabId, onNav: showTab, onEdit: opts.onEnterEdit,
    onEditHeader: edit?.onEditHeader, onEditFooter: edit?.onEditFooter,
    mode: root.getAttribute('data-mode') || 'light', onToggleTheme: opts.onToggleTheme,
    onRefresh: opts.onRefresh,
  });

  const main = el('main', { class: 'ap-main' });
  for (const tab of config.tabs || []) {
    const panel = buildPanel(tab);
    panels.set(tab.id, panel);
    if (tab.id !== activeTabId) panel.hidden = true;
    main.append(panel);
  }
  if (!config.tabs?.length) main.append(el('div', { class: 'ap-container' }, [
    el('div', { class: 'ap-empty', text: 'No tabs yet. Click Edit to add your first tab.' })]));

  const footer = buildFooter(config, { editing, onNav: showTab, onEditFooter: edit?.onEditFooter });

  root.append(header, main, footer);

  // mount charts of the initial tab after layout settles. setTimeout (not rAF) so it still
  // fires when the page is backgrounded (e.g. an inactive Grist tab / headless preview).
  setTimeout(() => mountTab(activeTabId), 0);

  function buildPanel(tab) {
    const children = [];
    const heroInfo = tab.hero ? buildHero(tab, { editing, onEditHero: edit?.onEditHero }) : null;
    if (heroInfo?.fullWidth) children.push(heroInfo.el); // full-width slider, edge to edge

    const container = el('div', { class: 'ap-container' });
    if (heroInfo && !heroInfo.fullWidth) container.append(heroInfo.el); // gradient banner inside

    const grid = el('div', { class: 'ap-grid' });
    // onNav lives at the top level (not inside `edit`) so Button/Icon "jump to page" links work
    // for regular viewers too, not just while editing.
    // pickButton is only handed over on a live, non-editing page: in edit mode the block already
    // carries its own controls, and someone arranging a design is not the person assembling a
    // printout. Passed as a factory so blocks.js never has to import the printout module.
    const shared = { config, onNav: showTab, tabId: tab.id,
      pickButton: editing ? null : (b) => selectButton(b),
      // What a slicer calls when its selection changes. Only on a live page: in the editor the
      // slicer is a preview of a control, and redrawing the tab under the author mid-edit would be
      // the block fighting the person configuring it.
      slicers: editing ? null : { refresh: () => refreshTab(tab.id) },
      edit: editing ? {
        active: true, onEditBlock: edit?.onEditBlock, onDeleteBlock: edit?.onDeleteBlock } : null };
    // Each block gets its own provider, narrowed by whichever slicers on this tab reach it. With
    // nothing selected that is the real provider itself, so a page with no slicers pays nothing.
    for (const block of tab.blocks || []) {
      const ctx = { ...shared, provider: filteredProvider(provider, slicersFor(block, tab)) };
      grid.append(renderBlock(block, ctx));
    }
    if (editing) grid.append(addBlockTile(tab.id, edit));
    container.append(grid);
    children.push(container);
    return el('section', { class: 'ap-tabpanel', dataset: { tab: tab.id } }, children);
  }

  function addBlockTile(tabId, edit) {
    const tile = el('div', { class: 'ap-block', dataset: { span: '4' } }, [
      el('button', { class: 'ap-addblock', onClick: () => edit.onAddBlock?.(tabId) }, [icon('plus'), 'Add Element']),
    ]);
    return tile;
  }

  /**
   * Redraw one tab in place, after a slicer changes what its blocks should show.
   *
   * The whole panel is rebuilt rather than patched, because that is the only way every block gets
   * a provider reflecting the new selection — and the blocks were built to be rebuilt; it is what
   * the editor does on every change. The scroll position is kept, because a reader who clicked a
   * chip halfway down the page should still be halfway down the page.
   */
  function refreshTab(id) {
    const tab = (config.tabs || []).find((t) => t.id === id);
    const old = panels.get(id);
    if (!tab || !old) return;
    const scroller = root.closest('.ap-scroll') || document.scrollingElement || document.documentElement;
    const y = scroller.scrollTop;
    const fresh = buildPanel(tab);
    fresh.hidden = old.hidden;
    old.replaceWith(fresh);
    panels.set(id, fresh);
    scroller.scrollTop = y;
    if (id === activeTabId) setTimeout(() => mountTab(id), 0);
  }

  function showTab(id) {
    if (!panels.has(id)) return;
    activeTabId = id;
    for (const [tid, panel] of panels) panel.hidden = (tid !== id);
    header.querySelectorAll('.ap-nav__link').forEach((a) =>
      a.classList.toggle('is-active', a.dataset.tab === id));
    header.querySelector('#ap-nav')?.classList.remove('is-open');
    setTimeout(() => mountTab(id), 0);
  }

  function mountTab(id) {
    const panel = panels.get(id);
    if (!panel) return;
    // Each mount is isolated. These are decorations on top of markup that is already on the page,
    // and they run in a fixed order, so one throwing used to take every later one with it — a
    // page whose map library had not loaded lost its charts, its counters and its calendar too,
    // for a reason none of them had anything to do with.
    const step = (fn, what) => { try { fn(panel); } catch (e) { console.warn(`[ANUPRESS] ${what} failed to mount`, e); } };
    const go = () => {
      step(mountCharts, 'charts'); step(resizeChartsIn, 'chart resize');
      step(mountMaps, 'maps'); step(resizeMapsIn, 'map resize');
      step(mountCounters, 'counters'); step(mountAttachmentImages, 'images');
      step(mountCountdowns, 'countdowns'); step(mountCalendars, 'calendars');
    };
    go();
    setTimeout(go, 120);
    // Tell blocks that pause work while off-screen that they are back. A calendar stops polling
    // when its page is hidden (see mountCalendars) and uses this to catch up at once, instead of
    // showing data that could be a poll cycle out of date.
    setTimeout(() => panel.querySelectorAll('.ap-calendar').forEach((c) => c.dispatchEvent(new CustomEvent('ap:shown'))), 130);
    mounted.add(id);
  }

  // The running count of collected blocks. Only on a viewing page: in edit mode the printout
  // affordance is absent, so a tray counting nothing would be furniture.
  if (!editing) { try { mountTray(root, config, provider, opts.onSaveLayout); } catch (e) { console.warn('[ANUPRESS] printout tray failed', e); } }

  return {
    showTab,
    getActiveTab: () => activeTabId,
    refreshActive: () => mountTab(activeTabId),
  };
}

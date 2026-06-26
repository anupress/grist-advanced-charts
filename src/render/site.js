// Orchestrates the whole site: header + tabbed body + footer. Tabs switch in-page with no
// reload; charts mount lazily the first time their tab becomes visible (so they get a real size).

import { el, clear, fromHTML } from '../util.js';
import { applyTheme, applyDesign } from '../theme/apply.js';
import { buildHeader } from './header.js';
import { buildFooter } from './footer.js';
import { renderBlock, mountCharts } from './blocks.js';
import { buildHero } from './hero.js';
import { mountMaps, resizeMapsIn } from './map.js';
import { resizeChartsIn, wireGlobalResize } from '../charts/echarts-adapter.js';
import { icon } from '../assets/icons.js';

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
    const ctx = { provider, config, edit: editing ? {
      active: true, onEditBlock: edit?.onEditBlock, onDeleteBlock: edit?.onDeleteBlock } : null };
    for (const block of tab.blocks || []) grid.append(renderBlock(block, ctx));
    if (editing) grid.append(addBlockTile(tab.id, edit));
    container.append(grid);
    children.push(container);
    return el('section', { class: 'ap-tabpanel', dataset: { tab: tab.id } }, children);
  }

  function addBlockTile(tabId, edit) {
    const tile = el('div', { class: 'ap-block', dataset: { span: '4' } }, [
      el('button', { class: 'ap-addblock', onClick: () => edit.onAddBlock?.(tabId) }, [icon('plus'), 'Add a block']),
    ]);
    return tile;
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
    const go = () => { mountCharts(panel); resizeChartsIn(panel); mountMaps(panel); resizeMapsIn(panel); };
    go();
    setTimeout(go, 120);
    mounted.add(id);
  }

  return {
    showTab,
    getActiveTab: () => activeTabId,
    refreshActive: () => mountTab(activeTabId),
  };
}

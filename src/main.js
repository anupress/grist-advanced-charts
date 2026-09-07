// Bootstrap. Decides the runtime mode and wires the Edit flow.
//   Demo  : opened directly / no saved config  -> bundled data + default site
//   View  : a saved ANUPRESS_Config exists      -> the user's live site
//   Edit  : triggered by the Edit button        -> consent -> full access -> builder

import { clone, toast } from './util.js';
import * as bridge from './grist/bridge.js';
import { DummyProvider, GristProvider, tablesInConfig, adaptConfigToTable, adaptTemplateToTable } from './data/provider.js';
import { DEFAULT_SITE, emptySite } from './data/default-site.js';
import { shouldAskDashboard, isDesigned } from './grist/dashboards.js';
import { askDashboardForWidget } from './builder/dashboard-choice.js';
import { TEMPLATES } from './data/templates/index.js';
import { TEMPLATE_SAMPLE_DATA } from './data/templates/sample-data.js';
import { renderSite } from './render/site.js';
import { showConsent } from './consent/modal.js';
import { VERSION } from './version.js';
import { installWidgetHost } from './grist/widget-host.js';
import { hostThemeForWidgets } from './render/embed.js';

const root = document.getElementById('anupress-root');

// Before the handshake, so the first things Grist sends — theme, access, the linked table — are
// on record for any nested widget that asks later.
installWidgetHost({ isLive: bridge.isLive, getOption: bridge.getOption, setOption: bridge.setOption, getColumns: bridge.getColumns, hostTheme: hostThemeForWidgets });

const app = {
  config: clone(DEFAULT_SITE),
  provider: new DummyProvider(),
  live: false,      // true once connected to Grist with data
  siteApi: null,
};

async function boot() {
  // Timed handshake: true only when actually embedded in a live Grist document.
  const live = await bridge.connect();
  // One line in the console that says which build answered. Pages caches the bundle for ten
  // minutes, so "still broken after the fix" needs this to be answerable.
  console.info(`[ANUPRESS] Advanced Charts v${VERSION} · ${live ? 'live document' : 'demo'}`);
  if (live) {
    try {
      // Which dashboard this widget instance shows, then that dashboard's design. A pointer at a
      // dashboard that no longer exists falls back to the main one rather than to a blank page.
      const wanted = await bridge.initDashboard();
      let saved = await bridge.loadConfig();
      if (!saved && wanted !== 'site') {
        console.warn(`[ANUPRESS] dashboard "${wanted}" has no design; showing the main dashboard`);
        await bridge.setDashboard('site');
        saved = await bridge.loadConfig();
      }
      if (saved) {
        app.config = saved;
        const gp = new GristProvider();
        await gp.init();
        await gp.prime(tablesInConfig(saved));
        if (gp.tables().length) { app.provider = gp; app.live = true; }
      }
    } catch (e) { console.warn('[ANUPRESS] boot view-mode load failed', e); }
  }
  maybeApplyTemplateParam();
  renderView();
  maybeStartTour();
}

// ?template=<id> (demo only) boots straight into an installed template — the same demo-mode apply
// the picker performs, driven from the URL so a template can be linked to or screenshotted without
// clicking through the drawer. Ignored on a live document: there, applying creates tables, and
// that must stay behind the picker's confirm step.
function maybeApplyTemplateParam() {
  if (app.live) return;
  let params; try { params = new URLSearchParams(location.search); } catch { return; }
  const id = params.get('template');
  if (!id) return;
  const t = TEMPLATES.find((x) => x.id === id);
  const sample = TEMPLATE_SAMPLE_DATA[id];
  if (!t || !sample || typeof app.provider.setData !== 'function') return;
  app.provider.setData(clone(sample));
  app.config = adaptTemplateToTable(t.config, app.provider);
}

// ?tour=1 (or ?tour=<seconds>) auto-cycles the tabs for a hands-off looping demo.
// Pauses as soon as the viewer hovers or interacts, so they can take over.
let _tourTimer = null;
function maybeStartTour() {
  let params; try { params = new URLSearchParams(location.search); } catch { return; }
  if (!params.has('tour') || _tourTimer) return;
  let i = 0, stopped = false;
  // Keep looping for a hands-off demo; stop for good once the viewer clicks/taps to explore.
  root.addEventListener('pointerdown', () => { stopped = true; });
  const every = Math.max(2500, (Number(params.get('tour')) || 6) * 1000);
  _tourTimer = setInterval(() => {
    const tabs = app.config.tabs || [];
    if (stopped || !app.siteApi || tabs.length < 2) return;
    i = (i + 1) % tabs.length;
    app.siteApi.showTab(tabs[i].id);
  }, every);
}

function renderView() {
  // A viewer's own light/dark choice (if any) overrides the saved site mode.
  let saved = null;
  try { saved = localStorage.getItem('apMode'); } catch {}
  if (saved) app.config.theme = { ...(app.config.theme || {}), mode: saved };
  app.siteApi = renderSite({
    root, config: app.config, provider: app.provider,
    onEnterEdit: startEdit,
    // Saving a printable layout writes a new page into the design, so it needs the same full
    // access the editor does. Escalation happens here, at the moment it is asked for, rather than
    // up front — a viewer who only ever prints should never see a permission prompt. Offered only
    // on a live document; in demo mode there is nothing to write to.
    onSaveLayout: bridge.isLive() ? async (tab) => {
      try {
        const ok = await bridge.escalateToFull();
        if (!ok) { toast(bridge.ACCESS_HELP + ' You can still print the layout.', 'err'); return; }
        app.config = { ...app.config, tabs: [...(app.config.tabs || []), tab] };
        const saved = await bridge.saveConfig(app.config);
        if (!saved) { toast('Could not write the page to your document.', 'err'); return; }
        renderView();
        app.siteApi?.showTab(tab.id);
      } catch (e) {
        console.warn('[ANUPRESS] could not save the printable layout', e);
        toast('Could not save the layout — ' + (e?.message || 'unknown error'), 'err');
      }
    } : null,
    // Re-read every table this page uses, then draw again. Grist offers a custom widget no change
    // notification to subscribe to, so without this the only way to see rows edited in the
    // document next door was to reload the whole widget. Only offered on a live document — in
    // demo mode there is nothing behind the bundled data to re-read.
    onRefresh: app.live ? async () => {
      const tables = tablesInConfig(app.config);
      try {
        // reload(), not invalidate()+prime(): the latter replaces rows only, so a column added or
        // renamed in Grist — or a whole new table — stayed invisible. Refresh exists precisely to
        // answer "what does the document say now", so it re-reads schema and the table list too.
        const { reloaded } = await app.provider.reload(tables);
        renderView();
        toast(`Refreshed ${reloaded} table${reloaded === 1 ? '' : 's'} from your document`, 'ok');
      } catch (e) {
        console.warn('[ANUPRESS] refresh failed', e);
        toast('Could not refresh — ' + (e?.message || 'unknown error'), 'err');
      }
    } : null,
    onToggleTheme: () => {
      const next = (root.getAttribute('data-mode') === 'dark') ? 'light' : 'dark';
      app.config.theme = { ...(app.config.theme || {}), mode: next };
      try { localStorage.setItem('apMode', next); } catch {}
      renderView();
    },
  });
}

async function startEdit() {
  const docName = await bridge.getDocName();
  const accepted = await showConsent({ docName });
  if (!accepted) return;

  let provider = app.provider;
  let live = false;

  // Nothing below here was previously guarded — any throw (a Grist API rejection, a table with
  // an unexpected shape, etc.) became a silent unhandled promise rejection: no toast, no console
  // hint, the click just looked like it did nothing. Surfacing it, even generically, beats that.
  try {
    if (bridge.isLive()) {
      const ok = await bridge.escalateToFull();
      if (ok) {
        await bridge.ensureTables();
        // Reuse the provider boot() already built and primed rather than constructing a second
        // one. A fresh GristProvider starts with an empty cache, so prime() below re-downloaded
        // every table the page had just loaded — visible in the Grist console as an identical
        // second run of fetchTable calls for the same tables on every click of Edit.
        // refreshTables() still re-lists (tables that only become visible once full access is
        // granted do appear) but fetches only what is genuinely new.
        const reuse = app.live && app.provider instanceof GristProvider;
        const gp = reuse ? app.provider : new GristProvider();
        if (reuse) await gp.refreshTables(); else await gp.init();
        if (gp.tables().length) {
          // Map the default site onto the user's first real table if we were on demo data.
          if (!app.live) app.config = adaptConfigToTable(app.config, gp);
          await gp.prime(tablesInConfig(app.config));
          provider = gp; live = true;
        } else {
          toast('No data tables found — add a table in Grist, then reopen Edit.', 'err');
        }
      } else {
        toast(bridge.ACCESS_HELP + ' Until then the editor is a preview and cannot save.', 'err');
      }
    } else {
      toast('Demo editor — changes are not saved outside Grist.', '');
    }
  } catch (e) {
    console.error('[ANUPRESS] startEdit: failed to load your Grist data', e);
    toast('Could not load your Grist data (' + (e?.message || 'unknown error') + '). Opening the editor anyway.', 'err');
  }

  app.provider = provider; app.live = live;

  // A widget that has never chosen a dashboard, in a document that already has one: ask before
  // opening the editor on the main design, which a second widget would otherwise replace the
  // moment someone installed a template into it. Asked once; the answer is kept with the widget.
  if (live && !bridge.hasDashboardPointer()) {
    try {
      const dashboards = await bridge.listDashboards();
      const main = await bridge.loadConfig('site');
      if (shouldAskDashboard({ hasPointer: false, mainDesigned: isDesigned(main), dashboards })) {
        const choice = await askDashboardForWidget({ dashboards, currentId: bridge.currentDashboard() });
        if (!choice) return;   // "Not now": nothing opens, nothing is written
        if (choice.action === 'show') {
          await bridge.setDashboard(choice.id);
          const cfg = await bridge.loadConfig(choice.id);
          app.config = cfg || { ...emptySite(), theme: clone(app.config.theme || {}) };
        } else {
          const cfg = choice.mode === 'copy' ? clone(app.config) : { ...emptySite(), theme: clone(app.config.theme || {}) };
          const id = await bridge.createDashboard(choice.name, cfg);
          if (!id) { toast('Could not create the dashboard. Opening the current one instead.', 'err'); }
          else { await bridge.setDashboard(id); app.config = cfg; }
        }
        try { await provider.prime?.(tablesInConfig(app.config)); } catch (e) { console.warn('[ANUPRESS] could not load the dashboard\'s tables', e); }
      } else {
        // One dashboard and it is empty: nothing to ask. Record the choice so it is never asked.
        await bridge.setDashboard(bridge.currentDashboard());
      }
    } catch (e) { console.warn('[ANUPRESS] dashboard choice skipped', e); }
  }

  try {
    const { openBuilder } = await import('./builder/index.js');
    openBuilder({
      root, config: app.config, provider, live,
      onExit: (finalConfig) => { if (finalConfig) app.config = finalConfig; renderView(); },
    });
  } catch (e) {
    console.error('[ANUPRESS] startEdit: failed to open the editor', e);
    toast('Could not open the editor (' + (e?.message || 'unknown error') + ').', 'err');
  }
}

boot();

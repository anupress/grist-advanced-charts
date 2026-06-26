// Bootstrap. Decides the runtime mode and wires the Edit flow.
//   Demo  : opened directly / no saved config  -> bundled data + default site
//   View  : a saved ANUPRESS_Config exists      -> the user's live site
//   Edit  : triggered by the Edit button        -> consent -> full access -> builder

import { clone, toast } from './util.js';
import * as bridge from './grist/bridge.js';
import { DummyProvider, GristProvider, tablesInConfig } from './data/provider.js';
import { DEFAULT_SITE } from './data/default-site.js';
import { renderSite } from './render/site.js';
import { showConsent } from './consent/modal.js';

const root = document.getElementById('anupress-root');

const app = {
  config: clone(DEFAULT_SITE),
  provider: new DummyProvider(),
  live: false,      // true once connected to Grist with data
  siteApi: null,
};

async function boot() {
  // Timed handshake: true only when actually embedded in a live Grist document.
  const live = await bridge.connect();
  if (live) {
    try {
      const saved = await bridge.loadConfig();
      if (saved) {
        app.config = saved;
        const gp = new GristProvider();
        await gp.init();
        await gp.prime(tablesInConfig(saved));
        if (gp.tables().length) { app.provider = gp; app.live = true; }
      }
    } catch (e) { console.warn('[ANUPRESS] boot view-mode load failed', e); }
  }
  renderView();
  maybeStartTour();
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

  if (bridge.isLive()) {
    const ok = await bridge.escalateToFull();
    if (ok) {
      await bridge.ensureTables();
      const gp = new GristProvider();
      await gp.init();
      if (gp.tables().length) {
        // Map the default site onto the user's first real table if we were on demo data.
        if (!app.live) app.config = adaptConfigToTable(app.config, gp);
        await gp.prime(tablesInConfig(app.config));
        provider = gp; live = true;
      } else {
        toast('No data tables found — add a table in Grist, then reopen Edit.', 'err');
      }
    } else {
      toast('Access not granted. You can still preview the editor.', 'err');
    }
  } else {
    toast('Demo editor — changes are not saved outside Grist.', '');
  }

  app.provider = provider; app.live = live;
  const { openBuilder } = await import('./builder/index.js');
  openBuilder({
    root, config: app.config, provider, live,
    onExit: (finalConfig) => { if (finalConfig) app.config = finalConfig; renderView(); },
  });
}

// When a fresh user opens the demo and connects Grist, point demo blocks at their table so
// they see *something* immediately; they can then remap columns in the builder.
function adaptConfigToTable(config, provider) {
  const table = provider.defaultTable();
  if (!table) return config;
  const cols = provider.columns(table);
  const c = clone(config);
  c.dataTable = table;
  const dim = cols.find((x) => /text|choice|date/i.test(x.type)) || cols[0];
  const measure = cols.find((x) => /int|numeric|number|currency/i.test(x.type)) || cols[1] || cols[0];
  for (const tab of c.tabs || []) for (const b of tab.blocks || []) {
    if (!b.config) continue;
    b.config.table = table;
    if (b.type === 'stat') b.config.column = measure?.id;
    if (b.type === 'chart') {
      b.config.dims = dim ? [dim.id] : [];
      b.config.measures = measure ? [measure.id] : [];
    }
  }
  return c;
}

boot();

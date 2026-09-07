// Several dashboards in one document. Two layers: the pure key shapes, then the bridge against a
// pretend Grist whose config table is a plain array — so a save under one dashboard can be shown to
// leave every other dashboard's rows exactly as they were, which is the whole promise.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as _resolve, dirname } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };
const eq = (name, got, want) => ok(JSON.stringify(got) === JSON.stringify(want), `${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);

// ---- pure ----
const D = await import(pathToFileURL(_resolve(ROOT, 'src/grist/dashboards.js')).href);
eq('slug of a name', D.slugId('Finance 2026 / Q3'), 'finance-2026-q3');
eq('slug never empty', D.slugId('!!!'), 'dashboard');
eq('slug never the default id', D.slugId('site'), 'dashboard');
eq('slug trims accents', D.slugId('Opérations Été'), 'operations-ete');
ok(D.slugId('x'.repeat(80)).length <= 40, 'slug capped');
eq('unique id steps a suffix', D.uniqueId('Ops', ['ops', 'ops-2']), 'ops-3');
eq('default keys unchanged', [D.configKeyFor('site'), D.chunkPrefixFor('site'), D.optionKeyFor('site')], ['site', 'site~', 'anupressSiteConfig']);
eq('other dashboard keys', [D.configKeyFor('ops'), D.chunkPrefixFor('ops'), D.optionKeyFor('ops')], ['site:ops', 'site:ops~', 'anupressSiteConfig:ops']);
ok(D.isChunkOf('site~abc~0', 'site') && !D.isChunkOf('site:ops~abc~0', 'site') && !D.isChunkOf('site:ops', 'site'), 'the default sees only its own chunks');
ok(D.isChunkOf('site:ops~abc~1', 'ops') && !D.isChunkOf('site:ops2~abc~1', 'ops') && !D.isChunkOf('site~abc~1', 'ops'), 'a dashboard sees only its own chunks');
eq('dashboard of a key', ['site', 'site~g~0', 'site:ops', 'site:ops~g~2', 'dashboards', 'createdTables'].map(D.dashboardOfKey), ['site', 'site', 'ops', 'ops', null, null]);
ok(D.isValidId('ops-2') && !D.isValidId('Ops') && !D.isValidId('a:b') && !D.isValidId('a~b') && !D.isValidId(''), 'id validity');
eq('registry: missing row', D.parseRegistry(null), [{ id: 'site', name: 'Main dashboard' }]);
eq('registry: damaged row', D.parseRegistry('{nope'), [{ id: 'site', name: 'Main dashboard' }]);
eq('registry: default first, found ids appended', D.parseRegistry('[{"id":"ops","name":"Operations"},{"id":"site","name":"Home"}]', ['fin', 'ops']),
  [{ id: 'site', name: 'Home' }, { id: 'ops', name: 'Operations' }, { id: 'fin', name: 'fin' }]);

// ---- the bridge against a pretend Grist ----
// One config table as an array of {id, Key, Value}; applyUserActions edits it the way Grist would.
function fakeGrist() {
  const rows = []; let nextId = 1;
  const options = {};
  const listeners = [];
  const table = () => ({ id: rows.map((r) => r.id), Key: rows.map((r) => r.Key), Value: rows.map((r) => r.Value) });
  return {
    rows, options,
    ready: () => { setTimeout(() => listeners.forEach((f) => f({ settings: { accessLevel: 'full' } })), 2); },
    on: (evt, fn) => { if (evt === 'message') listeners.push(fn); },
    getOption: async (k) => options[k] ?? null,
    setOption: async (k, v) => { options[k] = v; },
    docApi: {
      listTables: async () => ['Sales', 'ANUPRESS_Config'],
      fetchTable: async (t) => { if (t === 'ANUPRESS_Config') return table(); if (t === '_grist_Tables') return { id: [], tableId: [] }; throw new Error('no ' + t); },
      applyUserActions: async (actions) => {
        for (const a of actions) {
          if (a[0] === 'AddRecord') rows.push({ id: nextId++, ...a[3] });
          else if (a[0] === 'UpdateRecord') Object.assign(rows.find((r) => r.id === a[2]), a[3]);
          else if (a[0] === 'BulkRemoveRecord') for (const id of a[2]) { const i = rows.findIndex((r) => r.id === id); if (i >= 0) rows.splice(i, 1); }
          else if (a[0] === 'AddTable') { /* already there */ }
          else throw new Error('unexpected action ' + a[0]);
        }
      },
    },
  };
}
let n = 0;
async function bridgeWith(grist) {
  globalThis.window = globalThis; globalThis.self = globalThis; globalThis.top = {}; globalThis.location = { search: '' };
  globalThis.grist = grist;
  const b = await import(pathToFileURL(_resolve(ROOT, 'src/grist/bridge.js')).href + `?d=${++n}`);
  ok(await b.connect(500), 'connected to the pretend host');
  return b;
}
const keys = (g) => g.rows.map((r) => r.Key).sort();

{
  const g = fakeGrist();
  const b = await bridgeWith(g);
  eq('boot: no pointer means the main dashboard', await b.initDashboard(), 'site');
  ok(await b.saveConfig({ tabs: [{ id: 't1', title: 'Main' }] }), 'main design saved');
  eq('main design lands under the key it always had', keys(g), ['site']);
  eq('and in the option cache it always had', Object.keys(g.options), ['anupressSiteConfig']);

  // A second dashboard, as a copy.
  const id = await b.createDashboard('Operations', { tabs: [{ id: 't1', title: 'Ops' }] });
  eq('new dashboard id is its slug', id, 'operations');
  eq('its design has its own row, the registry its own, main untouched', keys(g), ['dashboards', 'site', 'site:operations']);
  eq('registry lists both, default first', (await b.listDashboards()).map((d) => d.id + ':' + d.name), ['site:Main dashboard', 'operations:Operations']);
  eq('the main design still reads as main', (await b.loadConfig('site')).tabs[0].title, 'Main');
  eq('the new one reads as its own', (await b.loadConfig('operations')).tabs[0].title, 'Ops');

  // This widget instance points at it.
  ok(await b.setDashboard('operations'), 'pointed at operations');
  eq('the pointer is kept in the widget\'s own options', g.options.anupressDashboard, 'operations');
  eq('loadConfig() with no argument now reads that dashboard', (await b.loadConfig()).tabs[0].title, 'Ops');
  ok(await b.saveConfig({ tabs: [{ id: 't1', title: 'Ops v2' }] }), 'saved while pointed at it');
  eq('the save went to its row, not main', (await b.loadConfig('site')).tabs[0].title, 'Main');
  eq('the cache is keyed by dashboard too', Object.keys(g.options).sort(), ['anupressDashboard', 'anupressSiteConfig', 'anupressSiteConfig:operations']);

  // A fresh boot of this instance lands on the pointer.
  const b2 = await bridgeWith(g);
  eq('boot reads the pointer', await b2.initDashboard(), 'operations');
  eq('and the design that goes with it', (await b2.loadConfig()).tabs[0].title, 'Ops v2');

  // Rename, then delete: only its rows go.
  ok(await b2.renameDashboard('operations', 'Ops team'), 'renamed');
  eq('rename is in the registry', (await b2.listDashboards())[1].name, 'Ops team');
  ok(!(await b2.deleteDashboard('site')), 'the main dashboard cannot be deleted');
  ok(await b2.deleteDashboard('operations'), 'deleted operations');
  eq('its rows are gone, main and the registry stay', keys(g), ['dashboards', 'site']);
  eq('the instance that showed it now points at main', b2.currentDashboard(), 'site');
  eq('and its pointer option is cleared', g.options.anupressDashboard, '');
  eq('its cache is cleared', g.options['anupressSiteConfig:operations'], '');
}

{
  // Chunked designs: each dashboard sweeps only its own generations.
  const g = fakeGrist();
  const b = await bridgeWith(g);
  const big = { pad: 'x'.repeat(700 * 1024), tabs: [] };
  ok(await b.saveConfig(big, 'site'), 'big main design saved in parts');
  const mainChunks = keys(g).filter((k) => k.startsWith('site~'));
  ok(mainChunks.length >= 2, `main has chunk rows (${mainChunks.length})`);
  ok(await b.saveConfig({ ...big, tabs: [{ id: 'a' }] }, 'fin'), 'big finance design saved in parts');
  ok(keys(g).filter((k) => k.startsWith('site~')).length === mainChunks.length, 'finance\'s save left main\'s chunks alone');
  ok(await b.saveConfig({ ...big, tabs: [{ id: 'b' }] }, 'fin'), 'finance saved again');
  const finChunks = keys(g).filter((k) => k.startsWith('site:fin~'));
  ok(finChunks.length === mainChunks.length, `finance's old generation was swept (${finChunks.length} chunk rows)`);
  eq('both still read back whole', [(await b.loadConfig('site')).tabs.length, (await b.loadConfig('fin')).tabs[0].id], [0, 'b']);
  ok(await b.clearStoredConfig('fin'), 'cleared finance');
  ok(!keys(g).some((k) => k.startsWith('site:fin')), 'finance rows gone');
  ok(keys(g).filter((k) => k.startsWith('site~')).length === mainChunks.length && keys(g).includes('site'), 'main untouched by clearing finance');
  eq('a dashboard never registered but present in the table is still listed', (await b.listDashboards()).map((d) => d.id), ['site']);
}

{
  // Outside Grist: the same calls work for the session.
  globalThis.window = globalThis; globalThis.self = globalThis; globalThis.top = globalThis; globalThis.location = { search: '' };
  delete globalThis.grist;
  const b = await import(pathToFileURL(_resolve(ROOT, 'src/grist/bridge.js')).href + `?d=${++n}`);
  ok(!(await b.connect(100)), 'demo: not live');
  eq('demo starts on main', await b.initDashboard(), 'site');
  b.rememberConfig({ tabs: [{ id: 'm' }] });
  const id = await b.createDashboard('Try', { tabs: [] });
  eq('demo: created in memory', id, 'try');
  ok(await b.setDashboard('try'), 'demo: switched');
  eq('demo: listed', (await b.listDashboards()).map((d) => d.id), ['site', 'try']);
  eq('demo: main remembered', (await b.loadConfig('site')).tabs[0].id, 'm');
  ok(await b.deleteDashboard('try') && b.currentDashboard() === 'site', 'demo: deleted and back on main');
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

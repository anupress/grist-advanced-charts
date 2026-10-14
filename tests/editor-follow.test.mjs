// Settings that have to follow another setting in the editor, found while scripting the tutorial
// video on 3.8.4, each confirmed in a real Grist document first:
//
//   map      a change of table kept the old table's coordinate, popup and colour columns
//   slicer   a change of column, or table, kept the old column's name as the label
//   chart    categories came back in table order, so a later column could never be the axis
//   pages    renaming a page left its menu entry on the old name, for good
//   new page every page added opened with a "New Page" banner that ignored a rename
//   footer   a link pointed at another page kept the first page's name
//
// The rules are pure functions beside the editors that use them, so they are tested here
// directly; the editors only call them.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;

// Just enough of a document for the column picker's pills: each records its listeners, children
// and pressed state, so a test can click one and read what the picker reported.
const node = (tag) => {
  const n = {
    nodeType: 1, tagName: tag.toUpperCase(), dataset: {}, style: {}, children: [], attrs: {}, listeners: {}, parent: null,
    classList: { set: new Set(), toggle(c, on) { if (on ?? !this.set.has(c)) this.set.add(c); else this.set.delete(c); } },
    set className(v) { v.split(/\s+/).filter(Boolean).forEach((c) => n.classList.set.add(c)); },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    addEventListener(t, fn) { (n.listeners[t] ||= []).push(fn); },
    append(...kids) { for (const k of kids) { k.parent = n; n.children.push(k); } },
    get firstChild() { return n.children[0]; },
    replaceWith(other) { const sib = n.parent.children; sib[sib.indexOf(n)] = other; other.parent = n.parent; },
    click() { (n.listeners.click || []).forEach((fn) => fn()); },
  };
  if (tag === 'template') n.content = { firstElementChild: null };
  Object.defineProperty(n, 'innerHTML', { set() { if (n.content) n.content.firstElementChild = node('svg'); } });
  return n;
};
globalThis.document = { createElement: node, createTextNode: (t) => ({ nodeType: 3, textContent: t }) };

const { fitMapColumns, followColumnLabel, togglePick, columnPicker } = await import(R('src/builder/block-editor.js'));
const { renameTab, newPage, pointLinkAt } = await import(R('src/builder/index.js'));
const { newBlock } = await import(R('src/builder/new-block.js'));
const { DUMMY_DATA } = await import(R('src/data/dummy-data.js'));
const { emptySite, DEFAULT_SITE } = await import(R('src/data/default-site.js'));
const { groupAggregate } = await import(R('src/stats/aggregate.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const provider = {
  tables: () => Object.values(DUMMY_DATA.tables).map((t) => ({ id: t.id, label: t.label })),
  columns: (id) => (DUMMY_DATA.tables[id]?.columns || []).map((c) => ({ ...c })),
};
const cols = (...ids) => ids.map((id) => ({ id, label: id, type: 'Any' }));

console.log('map: a change of table');
{
  // The demo's Sales table has no coordinates and People has Latitude/Longitude: the tutorial's
  // case. A new map starts on Sales and the editor's first pass fills in stand-ins.
  const sales = provider.columns('Sales'), people = provider.columns('People');
  const c = fitMapColumns(newBlock('map', { table: 'Sales', provider }).config, sales);
  eq('a new map on a table without coordinates gets its first two columns as stand-ins', [c.latColumn, c.lonColumn], ['Month', 'Region']);
  Object.assign(c, { colorBy: 'Channel', popupColumns: ['Revenue', 'Units'] });
  fitMapColumns(c, people, { tableChanged: true });
  eq('switching to a table with coordinates finds them', [c.latColumn, c.lonColumn], ['Latitude', 'Longitude']);
  eq('popup title, colour and tooltip columns the new table lacks are dropped', [c.labelColumn, c.colorBy, c.popupColumns], [null, null, []]);

  // An id both tables have (Date here) was still a stand-in chosen for the old table.
  const orders = cols('Order', 'Date', 'Amount'), stores = cols('Name', 'Date', 'Latitude', 'Longitude');
  const m = fitMapColumns({ latColumn: '', lonColumn: '', labelColumn: 'Order', popupColumns: ['Date', 'Amount'] }, orders);
  eq('stand-ins on Orders', [m.latColumn, m.lonColumn], ['Order', 'Date']);
  fitMapColumns(m, stores, { tableChanged: true });
  eq('detected coordinates win over an id both tables share', [m.latColumn, m.lonColumn], ['Latitude', 'Longitude']);
  eq('a tooltip column both tables have is kept, the other dropped', m.popupColumns, ['Date']);
  eq('a popup title the new table lacks is dropped', m.labelColumn, null);
  fitMapColumns(m, orders, { tableChanged: true });
  eq('back to a table without coordinates: stand-ins again, so the dropdowns show what is set', [m.latColumn, m.lonColumn], ['Order', 'Date']);

  // Two tables of the same shape: the author's own coordinate columns, which detectLatLon
  // cannot recognise, carry over.
  const y = fitMapColumns({ latColumn: 'Y', lonColumn: 'X', colorBy: 'Kind' }, cols('Site', 'Y', 'X', 'Kind'), { tableChanged: true });
  eq('undetectable coordinates the new table also has are kept', [y.latColumn, y.lonColumn, y.colorBy], ['Y', 'X', 'Kind']);

  // Opening the editor is not a change of table. A column since renamed in Grist must stay as it
  // is, so the dropdown can say "not in this document" instead of quietly swapping it.
  const o = fitMapColumns({ latColumn: 'Lat_old', lonColumn: 'Longitude', labelColumn: 'Gone', popupColumns: ['Gone'] }, people);
  eq('opening keeps a column the table no longer has', [o.latColumn, o.labelColumn, o.popupColumns], ['Lat_old', 'Gone', ['Gone']]);
}

console.log('slicer: the label follows the column');
{
  const s = newBlock('slicer', { table: 'Sales', provider }).config;
  // The editor names a column the way new-block.js does: its label, else its id.
  const name = (table, id) => { const col = provider.columns(table).find((x) => x.id === id); return col ? (col.label || col.id) : (id || ''); };
  eq('a new slicer is labelled with its column\'s name', s.label, name('Sales', s.column));
  let label = followColumnLabel(s.label, name('Sales', s.column), name('Sales', 'Channel'));
  eq('changing the column takes the new column\'s name', label, 'Channel');
  label = followColumnLabel(label, name('Sales', 'Channel'), '');
  eq('changing the table empties it while no column is picked', label, '');
  label = followColumnLabel(label, '', name('People', 'JoinDate'));
  eq('...and the next column picked names it, by its label', label, 'Join Date');
  eq('a label the author typed stays', followColumnLabel('Sales channel', 'Channel', 'Region'), 'Sales channel');
  eq('so does one they emptied (the slicer shows the column\'s name anyway)', followColumnLabel('', 'Channel', 'Region'), '');
  eq('a slicer saved without a label at all', followColumnLabel(undefined, 'Channel', 'Region'), undefined);
}

console.log('chart: categories in the order picked');
{
  eq('a pick appends', togglePick(togglePick([], 'Month'), 'Channel'), ['Month', 'Channel']);
  eq('an unpick removes', togglePick(['Month', 'Channel'], 'Month'), ['Channel']);
  eq('unpicking and picking again moves a column to the end (the funnel hint)', togglePick(togglePick(['Leads', 'Clicks', 'Sales'], 'Clicks'), 'Clicks'), ['Leads', 'Sales', 'Clicks']);
  eq('a saved list is not re-sorted, only added to', togglePick(['Region', 'Month'], 'Channel'), ['Region', 'Month', 'Channel']);

  // "Revenue by Month and Channel", where Month is a formula column added after Channel. The
  // author picks Month first, so Month must be the axis and Channel the series.
  const table = cols('Date', 'Channel', 'Revenue', 'Month');
  const rows = [
    { Channel: 'Web', Revenue: 10, Month: '2026-01' }, { Channel: 'Store', Revenue: 4, Month: '2026-01' },
    { Channel: 'Web', Revenue: 7, Month: '2026-02' }, { Channel: 'Store', Revenue: 6, Month: '2026-02' },
  ];
  const picked = ['Month', 'Channel'].reduce(togglePick, []);
  const r = groupAggregate(rows, { dims: picked, measures: ['Revenue'], agg: 'sum', cols: table });
  eq('the column picked first is the axis', r.categories, ['2026-01', '2026-02']);
  eq('...and the second is one series each', r.series.map((x) => `${x.name}:${x.data.join(',')}`), ['Web:10,7', 'Store:4,6']);
  const tableOrder = table.filter((c) => picked.includes(c.id)).map((c) => c.id);
  eq('(table order, as before, would have put Channel on the axis)', tableOrder, ['Channel', 'Month']);

  // The picker itself, clicked as the chart editor uses it. The editor rebuilds the picker from
  // the saved list after every click, so each click here gets a fresh one, the same way.
  const clickThrough = (selected, ids, opts) => {
    let saved = selected;
    for (const id of ids) {
      const list = columnPicker(table, saved, (got) => { saved = got; }, opts);
      list.children.find((p) => p.dataset.id === id).click();
    }
    return saved;
  };
  eq('picking Month then Channel reports Month first', clickThrough([], ['Month', 'Channel'], { pickOrder: true }), ['Month', 'Channel']);
  eq('an existing chart keeps its order when a value is added', clickThrough(['Month', 'Channel'], ['Revenue'], { pickOrder: true }), ['Month', 'Channel', 'Revenue']);
  eq('a saved id the table no longer has goes on the first click', clickThrough(['Gone', 'Month'], ['Channel'], { pickOrder: true }), ['Month', 'Channel']);
  eq('the other pickers keep table order', clickThrough([], ['Month', 'Channel']), ['Channel', 'Month']);
  const one = columnPicker(table, [], () => {}, { pickOrder: true });
  const pill = one.children.find((p) => p.dataset.id === 'Month');
  pill.click();
  eq('a clicked pill shows itself pressed', [pill.classList.set.has('is-on'), pill.attrs['aria-pressed']], [true, 'true']);
}

console.log('pages: renaming a page');
{
  const site = emptySite();
  // Typed one key at a time, as the Pages & menu field reports it.
  for (const step of ['Page 1x', 'Page ', '', 'S', 'Sales']) renameTab(site, site.tabs[0], step);
  eq('the blank site\'s menu entry follows the rename', site.header.menu, [{ label: 'Sales', tab: 'tab-1' }]);
  eq('...and the page has the new title', site.tabs[0].title, 'Sales');

  const demo = clone(DEFAULT_SITE);
  renameTab(demo, demo.tabs.find((t) => t.id === 'tab-overview'), 'Summary');
  eq('the demo\'s menu entry follows', demo.header.menu.find((m) => m.tab === 'tab-overview').label, 'Summary');
  eq('...as does its footer link of the same name', demo.footer.links.find((l) => l.tab === 'tab-overview').label, 'Summary');
  eq('other pages\' entries are untouched', demo.header.menu.filter((m) => m.tab !== 'tab-overview'), DEFAULT_SITE.header.menu.filter((m) => m.tab !== 'tab-overview'));

  const own = clone(DEFAULT_SITE);
  own.header.menu.find((m) => m.tab === 'tab-start').label = 'Start here';
  own.footer.links.find((l) => l.tab === 'tab-start').label = 'How to begin';
  renameTab(own, own.tabs.find((t) => t.id === 'tab-start'), 'Setup');
  eq('a menu label that differs from the title stays', own.header.menu.find((m) => m.tab === 'tab-start').label, 'Start here');
  eq('a footer link the author renamed stays', own.footer.links.find((l) => l.tab === 'tab-start').label, 'How to begin');

  const added = { ...emptySite(), tabs: [newPage('tab-x')] };
  renameTab(added, added.tabs[0], 'Leads');
  eq('a page with no menu entry gets none, and the nav shows its title', [added.header.menu.length, added.tabs[0].title], [1, 'Leads']);
}

console.log('pages: a new page');
{
  const p = newPage('tab-x');
  eq('starts with its hero off, like a blank site\'s first page', p.hero, emptySite().tabs[0].hero);
  eq('...and no headline of its own, so a hero switched on shows the page title', 'title' in p.hero, false);
  eq('the rest of its shape', [p.id, p.title, p.blocks], ['tab-x', 'New Page', []]);
}

console.log('footer: a link pointed at another page');
{
  // the case study (3.10.3): Add page to menu twice gives two links to the first page; the second one is pointed at This week
  const tabs = [{ id: 'tab-1', title: 'Overview' }, { id: 'tab-w', title: 'This week' }];
  const lnk = { label: 'Overview', tab: 'tab-1' };
  pointLinkAt(lnk, tabs, 'tab:tab-w');
  eq('an untouched label follows the page', lnk, { label: 'This week', tab: 'tab-w', href: null });
  const typed = { label: 'Roast plan', tab: 'tab-1' };
  pointLinkAt(typed, tabs, 'tab:tab-w');
  eq('a typed label stays', [typed.label, typed.tab], ['Roast plan', 'tab-w']);
  const blank = { label: '', href: '#' };
  pointLinkAt(blank, tabs, 'tab:tab-w');
  eq('an empty label takes the page title', [blank.label, blank.tab, blank.href], ['This week', 'tab-w', null]);
  const away = { label: 'Overview', tab: 'tab-1' };
  pointLinkAt(away, tabs, '');
  eq('Custom URL keeps the label and drops the page', [away.label, away.tab, away.href], ['Overview', null, '#']);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

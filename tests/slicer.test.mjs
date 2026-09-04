// The slicer's resolution rules, against a small relational document of the shape Grist gives us.
//
// Three tables: Clients (Country), Invoices (Client is Ref:Clients, Region is a Choice), Sales
// (Region is a Choice). Every rule in data/slicer.js is exercised, plus the two things that are
// easy to get wrong — that an empty selection filters nothing, and that a table with no relation
// to the slicer is left completely alone.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;
const S = await import(R('src/data/slicer.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

// ---- a tiny document -------------------------------------------------------------------------
const clientLabels = { 1: 'Harbour Freight', 2: 'Meridian Biotech', 3: 'Cedar Mills' };
const TABLES = {
  Clients: {
    columns: [{ id: 'Name', type: 'Text' }, { id: 'Country', type: 'Choice' }],
    records: [
      { id: 1, Name: 'Harbour Freight', Country: 'UK' },
      { id: 2, Name: 'Meridian Biotech', Country: 'DE' },
      { id: 3, Name: 'Cedar Mills', Country: 'UK' },
    ],
  },
  Invoices: {
    columns: [
      { id: 'Number', type: 'Text' },
      { id: 'Client', type: 'Ref:Clients', refTable: 'Clients', refVisibleCol: 'Name', refLabels: clientLabels },
      { id: 'Region', type: 'Choice' },
      { id: 'Tags', type: 'RefList:Clients', refTable: 'Clients', refVisibleCol: 'Name', refLabels: clientLabels },
      { id: 'Amount', type: 'Numeric' },
    ],
    records: [
      { id: 10, Number: 'INV-1', Client: 1, Region: 'North', Tags: ['L', 1, 2], Amount: 100 },
      { id: 11, Number: 'INV-2', Client: 2, Region: 'South', Tags: ['L', 2], Amount: 200 },
      { id: 12, Number: 'INV-3', Client: 3, Region: 'North', Tags: null, Amount: 300 },
      { id: 13, Number: 'INV-4', Client: 0, Region: 'South', Tags: ['L', 3], Amount: 400 },
    ],
  },
  Sales: {
    columns: [{ id: 'Region', type: 'Choice' }, { id: 'Revenue', type: 'Numeric' }],
    records: [{ id: 1, Region: 'North', Revenue: 5 }, { id: 2, Region: 'South', Revenue: 7 }, { id: 3, Region: 'North', Revenue: 9 }],
  },
  Unrelated: {
    columns: [{ id: 'Thing', type: 'Text' }],
    records: [{ id: 1, Thing: 'a' }, { id: 2, Thing: 'b' }],
  },
};
const base = {
  tables: () => Object.keys(TABLES).map((id) => ({ id, label: id })),
  columns: (t) => TABLES[t]?.columns || [],
  records: (t) => TABLES[t]?.records || [],
  defaultTable: () => 'Sales',
  isLive: false,
};
const ids = (rows) => rows.map((r) => r.id);
const sl = (table, column, ...values) => ({ table, column, values: new Set(values.map(String)) });

// ---- rule 1: same table ----------------------------------------------------------------------
console.log('rule 1 — same table');
let p = S.resolveFilter(sl('Sales', 'Region', 'North'), 'Sales', base.columns('Sales'), base);
eq('Region=North on Sales keeps the North rows', ids(base.records('Sales').filter(p)), [1, 3]);
p = S.resolveFilter(sl('Sales', 'Region', 'North', 'South'), 'Sales', base.columns('Sales'), base);
eq('two values are OR', ids(base.records('Sales').filter(p)), [1, 2, 3]);

// ---- rule 2: same column id elsewhere ----------------------------------------------------------
console.log('rule 2 — same column name on another table');
p = S.resolveFilter(sl('Sales', 'Region', 'South'), 'Invoices', base.columns('Invoices'), base);
eq('a Region slicer on Sales narrows Invoices by their own Region', ids(base.records('Invoices').filter(p)), [11, 13]);

// ---- rule 3: slicer column is a reference ------------------------------------------------------
console.log('rule 3 — slicer on a reference column');
p = S.resolveFilter(sl('Invoices', 'Client', 2), 'Clients', base.columns('Clients'), base);
eq('picking a client narrows the Clients table to that row', ids(base.records('Clients').filter(p)), [2]);
p = S.resolveFilter(sl('Invoices', 'Client', 2), 'Invoices', base.columns('Invoices'), base);
eq('...and its own table by the same column (rule 1 wins first)', ids(base.records('Invoices').filter(p)), [11]);
p = S.resolveFilter(sl('Invoices', 'Tags', 2), 'Invoices', base.columns('Invoices'), base);
eq('a RefList matches any-of', ids(base.records('Invoices').filter(p)), [10, 11]);

// ---- rule 4: the target references the slicer's table -------------------------------------------
console.log('rule 4 — through a reference, Grist\'s "select by"');
p = S.resolveFilter(sl('Clients', 'Country', 'UK'), 'Invoices', base.columns('Invoices'), base);
eq('Country=UK on Clients narrows Invoices through Client', ids(base.records('Invoices').filter(p)), [10, 12]);
p = S.resolveFilter(sl('Clients', 'Country', 'DE'), 'Invoices', base.columns('Invoices'), base);
eq('Country=DE finds the one German client\'s invoice', ids(base.records('Invoices').filter(p)), [11]);
eq('an empty reference (0) never matches', base.records('Invoices').filter(p).some((r) => r.Client === 0), false);

// ---- rule 5: leave unrelated tables alone --------------------------------------------------------
console.log('rule 5 — unrelated');
eq('Unrelated is not touched', S.resolveFilter(sl('Sales', 'Region', 'North'), 'Unrelated', base.columns('Unrelated'), base), null);
eq('an empty selection is no filter at all', S.resolveFilter(sl('Sales', 'Region'), 'Sales', base.columns('Sales'), base), null);

// ---- the provider wrapper ----------------------------------------------------------------------
console.log('filteredProvider');
const fp = S.filteredProvider(base, [sl('Sales', 'Region', 'North')]);
eq('records() is filtered', ids(fp.records('Sales')), [1, 3]);
eq('...for every table the rule reaches', ids(fp.records('Invoices')), [10, 12]);
eq('...and not for one it does not', ids(fp.records('Unrelated')), [1, 2]);
eq('columns() falls through untouched', fp.columns('Sales').map((c) => c.id), ['Region', 'Revenue']);
eq('tables() falls through untouched', fp.tables().length, 4);
eq('defaultTable() falls through', fp.defaultTable(), 'Sales');
eq('the base is reachable for slicer options', fp.baseProvider === base, true);
eq('no slicers means the base itself, not a wrapper', S.filteredProvider(base, []) === base, true);

// two slicers combine with AND
const both = S.filteredProvider(base, [sl('Sales', 'Region', 'North'), sl('Clients', 'Country', 'UK')]);
eq('two slicers AND together on Invoices', ids(both.records('Invoices')), [10, 12]);
const narrow = S.filteredProvider(base, [sl('Sales', 'Region', 'South'), sl('Clients', 'Country', 'UK')]);
eq('...and can narrow to nothing', ids(narrow.records('Invoices')), []);

// ---- selection state ------------------------------------------------------------------------
console.log('selection state');
S.clearAll();
eq('starts empty', S.hasSelection('s1'), false);
S.toggleValue('s1', 'North');
eq('toggle adds', [...S.getSelection('s1')], ['North']);
S.toggleValue('s1', 'South');
eq('toggle adds another (multi)', [...S.getSelection('s1')].sort(), ['North', 'South']);
S.toggleValue('s1', 'North');
eq('toggle removes', [...S.getSelection('s1')], ['South']);
S.toggleValue('s1', 2, { multi: false });
eq('single mode replaces', [...S.getSelection('s1')], ['2']);
S.toggleValue('s1', 2, { multi: false });
eq('single mode toggles off', S.hasSelection('s1'), false);
S.setSelection('s1', [1, 2]);
eq('values are stored as strings so ids and text compare alike', [...S.getSelection('s1')], ['1', '2']);
S.clearSelection('s1');
eq('clear', S.hasSelection('s1'), false);

// ---- which slicers reach which block ------------------------------------------------------------
console.log('slicersFor');
S.clearAll();
const tab = { id: 't', blocks: [
  { id: 'sl-region', type: 'slicer', config: { table: 'Sales', column: 'Region' } },
  { id: 'sl-country', type: 'slicer', config: { table: 'Clients', column: 'Country', targets: ['chart-b'] } },
  { id: 'chart-a', type: 'chart', config: { table: 'Sales' } },
  { id: 'chart-b', type: 'chart', config: { table: 'Invoices' } },
] };
eq('nothing selected, nothing reaches', S.slicersFor(tab.blocks[2], tab), []);
S.setSelection('sl-region', ['North']);
S.setSelection('sl-country', ['UK']);
eq('auto slicer reaches chart-a', S.slicersFor(tab.blocks[2], tab).map((s) => s.id), ['sl-region']);
eq('explicit targets reach only the listed block', S.slicersFor(tab.blocks[3], tab).map((s) => s.id), ['sl-region', 'sl-country']);
eq('a slicer never reaches another slicer', S.slicersFor(tab.blocks[0], tab), []);

// ---- the editor preview ------------------------------------------------------------------------
console.log('affectedBlocks');
eq('a Region slicer on Sales reaches both charts (rule 1 and rule 2)',
   S.affectedBlocks(tab.blocks[0], tab, base).map((b) => b.id), ['chart-a', 'chart-b']);
eq('a Country slicer on Clients reaches Invoices (rule 4) but not Sales',
   S.affectedBlocks(tab.blocks[1], tab, base).map((b) => b.id), ['chart-b']);

// ---- options ---------------------------------------------------------------------------------
console.log('slicerOptions');
eq('choices come with counts, most common first', S.slicerOptions(base, 'Sales', 'Region').map((o) => `${o.label}:${o.count}`), ['North:2', 'South:1']);
// Equal counts, so the documented order is by label; and the empty reference (Client: 0 on INV-4)
// must not appear as a chip called "0".
eq('a reference column offers the referenced names', S.slicerOptions(base, 'Invoices', 'Client').map((o) => o.label), ['Cedar Mills', 'Harbour Freight', 'Meridian Biotech']);
eq('...keyed by the row id underneath', S.slicerOptions(base, 'Invoices', 'Client').map((o) => o.key), ['3', '1', '2']);
eq('an empty reference is not offered', S.slicerOptions(base, 'Invoices', 'Client').some((o) => o.key === '0'), false);
eq('but a real zero in a numeric column is', S.slicerOptions({ ...base, records: () => [{ id: 1, N: 0 }, { id: 2, N: 5 }], columns: () => [{ id: 'N', type: 'Numeric' }] }, 'T', 'N').map((o) => o.key), ['0', '5']);
eq('a list column counts each member', S.slicerOptions(base, 'Invoices', 'Tags').map((o) => `${o.label}:${o.count}`), ['Meridian Biotech:2', 'Cedar Mills:1', 'Harbour Freight:1']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

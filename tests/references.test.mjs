import { fileURLToPath } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

// The repository root, derived from this file rather than hardcoded, so the suite runs from any
// checkout and any working directory.
const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { pathToFileURL } from 'node:url';
// Reference and Reference List columns, using the exact value shapes Grist hands back:
// a Ref cell is a row id (0 when empty), a RefList cell is the tuple ['L', id, id, ...].
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;

const { formatCellValue } = await import(R('src/util.js'));
const { groupAggregate } = await import(R('src/stats/aggregate.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

// A Clients table, as the provider would have cached it.
const clientRows = [
  { id: 1, Name: 'Harbour Freight Ltd' },
  { id: 2, Name: 'Meridian Biotech' },
  { id: 3, Name: 'Cedar Mills Group' },
];
const labels = Object.create(null);
for (const r of clientRows) labels[r.id] = r.Name;

const refCol = { id: 'Client', label: 'Client', type: 'Ref:Clients', refTable: 'Clients', refVisibleCol: 'Name', refLabels: labels };
const refListCol = { id: 'Tags', label: 'Tags', type: 'RefList:Clients', refTable: 'Clients', refVisibleCol: 'Name', refLabels: labels };
const bare = { id: 'Client', label: 'Client', type: 'Ref:Clients', refTable: 'Clients', refVisibleCol: null, refLabels: null };

console.log('formatCellValue');
eq('Ref resolves to the visible column', formatCellValue(2, refCol), 'Meridian Biotech');
eq('Ref of 0 is empty, not "0"', formatCellValue(0, refCol), '');
eq('Ref with no labels loaded falls back to the row id', formatCellValue(2, bare), '2');
eq('Ref to a row that no longer exists shows its id', formatCellValue(99, refCol), '99');
eq('RefList tuple resolves and joins', formatCellValue(['L', 1, 3], refListCol), 'Harbour Freight Ltd, Cedar Mills Group');
eq('RefList with one entry', formatCellValue(['L', 2], refListCol), 'Meridian Biotech');
eq('RefList empty tuple', formatCellValue(['L'], refListCol), '');
eq('RefList as a bare array is tolerated', formatCellValue([1, 2], refListCol), 'Harbour Freight Ltd, Meridian Biotech');
eq('null is still empty', formatCellValue(null, refCol), '');

// the bug this fixes, stated plainly
eq('BEFORE: a plain Text column is untouched', formatCellValue('Hello', { id: 'x', type: 'Text' }), 'Hello');
eq('a RefList without the fix would have read "L,1,3"', String(['L', 1, 3]), 'L,1,3');

console.log('grouping');
const invoices = [
  { id: 1, Client: 1, Amount: 100 },
  { id: 2, Client: 2, Amount: 250 },
  { id: 3, Client: 1, Amount: 50 },
  { id: 4, Client: 3, Amount: 400 },
  { id: 5, Client: 0, Amount: 25 },
];
const cols = [refCol, { id: 'Amount', label: 'Amount', type: 'Numeric' }];

const withCols = groupAggregate(invoices, { dims: ['Client'], measures: ['Amount'], agg: 'sum', cols });
eq('chart categories are client names', withCols.categories,
   ['Harbour Freight Ltd', 'Meridian Biotech', 'Cedar Mills Group', '—']);
eq('the sums still line up', withCols.series[0].data, [150, 250, 400, 25]);

// Unchanged behaviour when no columns are supplied — and a record of what that behaviour was.
// Note the fourth category: an EMPTY reference used to become a category called "0", because 0 is
// neither null nor '' and so read as a perfectly good group. The fix reads it as blank.
const withoutCols = groupAggregate(invoices, { dims: ['Client'], measures: ['Amount'], agg: 'sum' });
eq('without columns it groups by row id, exactly as before', withoutCols.categories, ['1', '2', '3', '0']);
eq('and the same totals', withoutCols.series[0].data, [150, 250, 400, 25]);
eq('the fix also stops an empty reference being a category called "0"',
   withCols.categories.includes('0'), false);

// a second dimension resolves too
const twoDim = groupAggregate(
  [{ Client: 1, Region: 'North', Amount: 10 }, { Client: 2, Region: 'North', Amount: 20 }],
  { dims: ['Region', 'Client'], measures: ['Amount'], agg: 'sum', cols },
);
eq('series names resolve as well as categories', twoDim.series.map((s) => s.name),
   ['Harbour Freight Ltd', 'Meridian Biotech']);

console.log('breakdown block');
const { computeBreakdown } = await import(R('src/render/breakdown.js'));
const bdRows = [{ Client: 1 }, { Client: 2 }, { Client: 2 }, { Client: 0 }];
eq('breakdown groups by name', computeBreakdown(bdRows, 'Client', { col: refCol }).shown,
   [['Meridian Biotech', 2], ['Harbour Freight Ltd', 1]]);
eq('an unset reference counts as empty, not as a group', computeBreakdown(bdRows, 'Client', { col: refCol }).empty, 1);
eq('without a column it is exactly the old behaviour', computeBreakdown(bdRows, 'Client', {}).shown,
   [['2', 2], ['1', 1], ['0', 1]]);
eq('...including counting the unset one as a real group', computeBreakdown(bdRows, 'Client', {}).empty, 0);
eq('a Choice column is untouched', computeBreakdown([{ S: 'Open' }, { S: 'Open' }, { S: 'Won' }], 'S', {}).shown,
   [['Open', 2], ['Won', 1]]);

console.log('other list-shaped columns');
const clCol = { id: 'Tags', label: 'Tags', type: 'ChoiceList' };
eq('ChoiceList joins its choices', formatCellValue(['L', 'Urgent', 'Billable'], clCol), 'Urgent, Billable');
eq('ChoiceList with one choice', formatCellValue(['L', 'Urgent'], clCol), 'Urgent');
eq('empty ChoiceList tuple', formatCellValue(['L'], clCol), '');
eq('null ChoiceList', formatCellValue(null, clCol), '');
eq('a plain Choice is a string and untouched', formatCellValue('Urgent', { id: 'c', type: 'Choice' }), 'Urgent');
eq('without the fix a ChoiceList read as this', String(['L', 'Urgent', 'Billable']), 'L,Urgent,Billable');

const attCol = { id: 'Docs', label: 'Docs', type: 'Attachments' };
eq('Attachments count, plural', formatCellValue(['L', 3, 7], attCol), '2 files');
eq('Attachments count, singular', formatCellValue(['L', 3], attCol), '1 file');
eq('no attachments', formatCellValue(['L'], attCol), '');

console.log('one definition of "structured"');
const { isStructuredType } = await import(R('src/util.js'));
for (const [t, want] of [['Ref:Clients', true], ['RefList:Tags', true], ['ChoiceList', true], ['Attachments', true],
  ['Ref', true], ['Choice', false], ['Text', false], ['Numeric', false], ['Refund', false], ['Reference', false], ['', false]]) {
  eq(`isStructuredType(${JSON.stringify(t)})`, isStructuredType(t), want);
}

// grouping and breakdown must agree with it
const clCol2 = { id: 'Tags', type: 'ChoiceList' };
const clRows = [{ Tags: ['L', 'Urgent'], N: 1 }, { Tags: ['L', 'Urgent', 'Billable'], N: 2 }];
eq('a ChoiceList groups by its choices', groupAggregate(clRows, { dims: ['Tags'], measures: ['N'], agg: 'sum', cols: [clCol2] }).categories,
   ['Urgent', 'Urgent, Billable']);
eq('and breaks down the same way', computeBreakdown(clRows, 'Tags', { col: clCol2 }).shown,
   [['Urgent', 1], ['Urgent, Billable', 1]]);

console.log('non-reference columns are unaffected');
eq('Bool still reads Yes', formatCellValue(true, { id: 'b', type: 'Bool' }), 'Yes');
eq('Int stays bare', formatCellValue(1234, { id: 'n', type: 'Int' }), '1234');
eq('a column literally named Reference is not a Ref', formatCellValue('abc', { id: 'r', type: 'Text', label: 'Reference' }), 'abc');
eq('"Refund" type would not match', formatCellValue('x', { id: 'r', type: 'Refund' }), 'x');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

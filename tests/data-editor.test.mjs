import { fileURLToPath } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

// The repository root, derived from this file rather than hardcoded, so the suite runs from any
// checkout and any working directory.
const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { pathToFileURL } from 'node:url';
// The data editor's handling of Reference columns: read-only, readable, searchable, filterable.
const m = await import(pathToFileURL(_resolve(ROOT, 'src/builder/data-editor.js')).href);

let pass = 0, fail = 0;
const eq = (n, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log(`  FAIL ${n}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); } };

const labels = { 1: 'Harbour Freight Ltd', 2: 'Meridian Biotech', 3: 'Cedar Mills Group' };
const cols = [
  { id: 'Number', label: 'Invoice', type: 'Text' },
  { id: 'Client', label: 'Client', type: 'Ref:Clients', refTable: 'Clients', refVisibleCol: 'Name', refLabels: labels },
  { id: 'Amount', label: 'Amount', type: 'Numeric' },
];
const rows = [
  { id: 1, Number: 'INV-001', Client: 2, Amount: 1234 },
  { id: 2, Number: 'INV-002', Client: 1, Amount: 90 },
  { id: 3, Number: 'INV-003', Client: 2, Amount: 500 },
  { id: 4, Number: 'INV-004', Client: 0, Amount: 10 },
];

// search now reaches the referenced name
eq('search "Meridian" finds its rows', m.applyView(rows, cols, { query: 'Meridian' }).map(r => r.id), [1, 3]);
eq('search still works on ordinary text', m.applyView(rows, cols, { query: 'INV-002' }).map(r => r.id), [2]);
eq('search on a number is unchanged', m.applyView(rows, cols, { query: '1234' }).map(r => r.id), [1]);

// the filter list offers names, not row ids
eq('filter values are labels', m.distinctValues(rows, 'Client', String, cols[1]).map(v => v.value),
   ['Meridian Biotech', 'Harbour Freight Ltd', '']);
// Order is the documented one: most common first, then lexicographic. "2" appears twice.
eq('filter values without a column stay raw', m.distinctValues(rows, 'Client', String).map(v => v.value),
   ['2', '0', '1']);
// All counts equal, so lexicographic wins — unchanged by any of this work.
eq('a numeric column is untouched by all this', m.distinctValues(rows, 'Amount', String).map(v => v.value),
   ['10', '1234', '500', '90']);

// filtering by a label keeps the right rows
eq('filter by label', m.applyView(rows, cols, { filters: { Client: new Set(['Meridian Biotech']) } }).map(r => r.id), [1, 3]);
eq('filter on a normal column still works', m.applyView(rows, cols, { filters: { Number: new Set(['INV-002']) } }).map(r => r.id), [2]);

// the wording
// Wording widened once ChoiceList and Attachments joined the same read-only rule.
eq('one reference column', m.lockedNote(0, 1), '1 reference or list column is shown read-only. Change it in Grist, where the values can be picked.');

// ChoiceList is locked for the same reason a Reference is: coerce() cannot build ['L', …].
eq('a ChoiceList is locked too', m.applyView(
  [{ id: 1, T: ['L', 'Urgent'] }, { id: 2, T: ['L', 'Billable'] }],
  [{ id: 'T', label: 'Tags', type: 'ChoiceList' }],
  { query: 'urgent' }).map(r => r.id), [1]);
eq('none at all', m.lockedNote(0, 0), '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

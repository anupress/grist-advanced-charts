// The table snapshot's model, held against the demo tables: what a reader sees while choosing a
// table must be the table — its label, honest counts, the first rows formatted the way the blocks
// format them, and a clear note about what is not shown.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => import(pathToFileURL(join(ROOT, 'src', p)).href);

const { peekModel, friendlyType, PEEK_ROWS, PEEK_COLS } = await src('builder/table-peek.js');
const { DUMMY_DATA } = await src('data/dummy-data.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };

const provider = {
  tables: () => Object.values(DUMMY_DATA.tables).map((t) => ({ id: t.id, label: t.label })),
  columns: (id) => DUMMY_DATA.tables[id]?.columns || [],
  records: (id) => DUMMY_DATA.tables[id]?.records || [],
};

// Sales: many rows, more columns than the panel shows.
const sales = peekModel(provider, 'Sales');
const salesCols = provider.columns('Sales'), salesRows = provider.records('Sales');
ok(sales && sales.label === 'Sales (demo)', 'label comes from the table, not the id');
ok(sales.rowCount === salesRows.length && sales.colCount === salesCols.length, 'counts are the real counts, not the shown ones');
ok(sales.rows.length === Math.min(PEEK_ROWS, salesRows.length), `shows at most ${PEEK_ROWS} rows`);
ok(sales.columns.length === Math.min(PEEK_COLS, salesCols.length), `shows at most ${PEEK_COLS} columns`);
ok(sales.moreCols === Math.max(0, salesCols.length - PEEK_COLS), 'says how many columns are not shown');
ok(sales.rows.every((r) => r.length === sales.columns.length), 'every row has one cell per shown column');
ok(sales.rows.every((r) => r.every((v) => typeof v === 'string')), 'cells are formatted strings, never raw values');
ok(sales.columns[0].id === salesCols[0].id, 'columns keep the table order');

// Cells are formatted like the blocks format them: a number column shows a number, not "undefined".
const productIdx = sales.columns.findIndex((c) => c.id === 'Product');
ok(productIdx >= 0 && sales.rows[0][productIdx] === String(salesRows[0].Product), 'a text cell is the text');

// Limits are parameters.
const small = peekModel(provider, 'Sales', { maxRows: 2, maxCols: 3 });
ok(small.rows.length === 2 && small.columns.length === 3 && small.moreCols === salesCols.length - 3, 'custom limits apply');

// Unknown table: nothing to show.
ok(peekModel(provider, 'NoSuchTable') === null, 'an unknown table gives null, not an empty panel');

// An empty table still describes its columns.
const emptyProvider = { tables: () => [{ id: 'T', label: 'T' }], columns: () => [{ id: 'A', label: 'A', type: 'Text' }], records: () => [] };
const empty = peekModel(emptyProvider, 'T');
ok(empty.rowCount === 0 && empty.rows.length === 0 && empty.columns.length === 1, 'an empty table shows its columns and zero rows');

// A reference cell reads as the name it points at when the provider supplies labels.
const refProvider = {
  tables: () => [{ id: 'Inv', label: 'Invoices' }],
  columns: () => [{ id: 'Client', label: 'Client', type: 'Ref:Clients', refLabels: { 2: 'Meridian Biotech' } }],
  records: () => [{ id: 1, Client: 2 }],
};
ok(peekModel(refProvider, 'Inv').rows[0][0] === 'Meridian Biotech', 'a reference cell shows the referenced name, not the row id');
ok(peekModel(refProvider, 'Inv').columns[0].type === 'Ref → Clients', 'a reference column says what it points at');

// Type words.
const types = [['Int', 'Number'], ['Numeric', 'Number'], ['Text', 'Text'], ['Choice', 'Choice'], ['ChoiceList', 'Choices'],
  ['Date', 'Date'], ['DateTime:Europe/Berlin', 'Date & time'], ['Bool', 'Yes/no'], ['Attachments', 'Files'], ['RefList:People', 'Refs → People'], ['', 'Any']];
for (const [t, want] of types) ok(friendlyType(t) === want, `friendlyType(${JSON.stringify(t)}) = ${friendlyType(t)}, wanted ${want}`);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

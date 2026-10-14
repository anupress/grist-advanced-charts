// Repeat once per record follows the slicers (3.10.6). It used to read the table whole, so a packing table narrowed to today's
// orders printed a label for every line of the order book; the tutorial had to warn "whatever a slicer says". Found building the
// Glutbohne case study.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;
// just enough of a browser for the module to load: nothing here is drawn
globalThis.document = { createElement: () => ({ style: {}, classList: { add() {} }, append() {}, setAttribute() {}, addEventListener() {} }), createTextNode: (t) => ({ t }) };
globalThis.window = globalThis;
const P = await import(R('src/print/printout.js'));
const S = await import(R('src/data/slicer.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) pass++; else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); } };

const ORDERS = [
  { id: 1, Order: 'R-1', Status: 'Delivered' }, { id: 2, Order: 'R-2', Status: 'Packed' },
  { id: 3, Order: 'R-3', Status: 'Packed' }, { id: 4, Order: 'R-4', Status: 'Late' },
];
const provider = {
  records: (t) => (t === 'Orders' ? ORDERS : []),
  columns: (t) => (t === 'Orders' ? [{ id: 'Order', type: 'Text' }, { id: 'Status', type: 'Choice' }] : []),
};
const config = { tabs: [{ id: 'tab-packing', blocks: [
  { id: 'status', type: 'slicer', config: { table: 'Orders', column: 'Status' } },
  { id: 'label', type: 'barcode', config: { table: 'Orders', value: '%Order' } },
  { id: 'note', type: 'text', config: { heading: 'Thank you' } },
] }] };

P.clear();
P.toggle('label');
P.setRepeat({ table: 'Orders', limit: 50 });
S.clearAll();
eq('nothing picked in the slicer: every order', P.repeatRows(provider, config).map((r) => r.Order), ['R-1', 'R-2', 'R-3', 'R-4']);
S.setSelection('status', ['Packed']);
eq('Packed picked: a label for each packed order', P.repeatRows(provider, config).map((r) => r.Order), ['R-2', 'R-3']);
eq('without the design (as before 3.10.6) the table is read whole', P.repeatRows(provider).map((r) => r.Order), ['R-1', 'R-2', 'R-3', 'R-4']);
P.setRepeat({ limit: 1 });
eq('the cap still applies, after the slicer', P.repeatRows(provider, config).map((r) => r.Order), ['R-2']);
P.setRepeat({ limit: 50 });
config.tabs[0].blocks[0].config.targets = ['note'];
eq('a slicer that leaves the collected block out leaves the run alone', P.repeatRows(provider, config).length, 4);
delete config.tabs[0].blocks[0].config.targets;
P.clear(); P.toggle('note');
eq('a block that reads no table still prints the page\'s narrowed rows', P.repeatRows(provider, config).map((r) => r.Order), ['R-2', 'R-3']);
P.toggle('label');
eq('one of the collected blocks it reaches is enough', P.repeatRows(provider, config).map((r) => r.Order), ['R-2', 'R-3']);
// a label template names the product, not its row id ("9 × 2" before)
const cols = [{ id: 'Order', type: 'Text' }, { id: 'Product', type: 'Ref:Products', refLabels: { 9: 'Coffee subscription' } }, { id: 'Quantity', type: 'Numeric' }];
const label = P.bindBlockToRow({ id: 'l', type: 'barcode', config: { value: '%Order', caption: '%Product × %Quantity' } }, { id: 1, Order: 'R-2371', Product: 9, Quantity: 2 }, cols);
eq('the label reads the product by name', [label.config.value, label.config.caption], ['R-2371', 'Coffee subscription × 2']);
const inv = P.bindBlockToRow({ id: 'i', type: 'invoice', config: {} }, { id: 7, Product: 9 }, cols);
eq('an invoice is still bound by row id', inv.config.rowId, 7);
eq('without columns, as before', P.bindBlockToRow({ id: 'l', type: 'barcode', config: { value: '%Product' } }, { id: 1, Product: 9 }).config.value, '9');

S.clearAll(); P.clear(); P.setRepeat({ table: null });

console.log(`print-repeat: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

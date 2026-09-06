// Every block type the Add Element chooser offers must start life as that type.
//
// The regression this guards: the builder's per-type defaults ended in a chart fallback, and two
// catalog entries (slicer, barcode) never got a branch — so picking "Slicer" opened "Add chart".
// A community member found it before we did. Holding the defaults against the catalog means a
// block type can no longer be added to the chooser without also being given a starting shape.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => import(pathToFileURL(join(ROOT, 'src', p)).href);

const { BLOCK_CATALOG } = await src('builder/block-catalog.js');
const { newBlock } = await src('builder/new-block.js');
const { DUMMY_DATA } = await src('data/dummy-data.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };

// A provider shaped like the real one, backed by the demo tables.
const provider = {
  tables: () => Object.values(DUMMY_DATA.tables).map((t) => ({ id: t.id, label: t.label })),
  columns: (id) => (DUMMY_DATA.tables[id]?.columns || []).map((c) => ({ ...c })),
};
const table = DUMMY_DATA.defaultTable;
const SPANS = new Set([3, 4, 6, 8, 12]);

for (const entry of BLOCK_CATALOG) {
  let b;
  try { b = newBlock(entry.type, { table, provider }); }
  catch (e) { ok(false, `${entry.type}: newBlock threw — ${e.message}`); continue; }
  ok(b.type === entry.type, `${entry.type}: came back as "${b.type}" (the chart fallback swallowed it)`);
  ok(typeof b.id === 'string' && b.id.length > 0, `${entry.type}: no id`);
  ok(b.__isNew === true, `${entry.type}: not marked __isNew, so the editor would say "Edit" not "Add"`);
  ok(SPANS.has(b.span), `${entry.type}: span ${b.span} is not one the grid offers`);
  ok(b.config && typeof b.config === 'object', `${entry.type}: no config`);
}

// The two that were missing, specifically.
const slicer = newBlock('slicer', { table, provider });
ok(slicer.config.table === table, 'slicer starts on the current table');
ok(typeof slicer.config.column === 'string' && slicer.config.column.length > 0, 'slicer picks a column so the preview has chips at once');
const slicerCol = provider.columns(table).find((c) => c.id === slicer.config.column);
ok(slicerCol && !/^(Int|Numeric|Number|Currency|Date|DateTime)/i.test(slicerCol.type), `slicer chose ${slicerCol?.type}, which would give one chip per row`);
ok(slicer.config.multi === true && slicer.config.style === 'auto', 'slicer defaults: several values, auto style');

const barcode = newBlock('barcode', { table, provider });
ok(barcode.config.symbology === 'code128', 'barcode starts as Code 128, the symbology that takes any text');
ok(barcode.config.value === '', 'barcode starts empty rather than with an invented code');
ok(barcode.config.moduleMm > 0 && barcode.config.heightMm > 0, 'barcode carries a physical size from the start');

// An unknown type is a programming error, not a chart.
let threw = false;
try { newBlock('no-such-block', { table, provider }); } catch { threw = true; }
ok(threw, 'an unknown type throws instead of silently becoming a chart');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

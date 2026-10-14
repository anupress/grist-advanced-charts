// Found building the Glutbohne case study (3.10.0): a Year slicer read "2,026", an invoice read "€30.5", a data table
// ignored the order its columns were picked in, a stat card had no unit, and map clusters ignored the theme.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = await import(pathToFileURL(_resolve(ROOT, 'src/util.js')).href);
const src = (p) => readFileSync(_resolve(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const sp = (s) => String(s).replace(/[  ]/g, ' ');
const eq = (n, got, want) => { if (sp(got) === sp(want)) pass++; else { fail++; console.log(`  FAIL ${n}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); } };
const ok = (n, cond) => { if (cond) pass++; else { fail++; console.log(`  FAIL ${n}`); } };

u.setLocale('en-US', null);
const year = { id: 'Year', type: 'Numeric', widgetOptions: {} };
eq('a year in an unformatted Numeric column, as a category', u.formatCategory(2026, year), '2026');
eq('an Int column too', u.formatCategory(2026, { type: 'Int' }), '2026');
eq('a fraction keeps its grouping', u.formatCategory(1234.5, year), '1,234.5');
eq('a column with a number format keeps it', u.formatCategory(2026, { type: 'Numeric', widgetOptions: { numMode: 'decimal' } }), '2,026');
eq('text is text', u.formatCategory('Late', { type: 'Choice' }), 'Late');
eq('a table cell still groups', u.formatCellValue(121066.47, year), '121,066.47');
ok('the slicer labels its choices as categories', /formatCategory\(v, col\)/.test(src('src/data/slicer.js')) && !/formatCellValue/.test(src('src/data/slicer.js')));

eq('two decimals means two: an invoice line', u.fmtNumber(30.5, { currency: '€', decimals: 2 }), '€30.50');
eq('and VAT of two euros', u.fmtNumber(2, { currency: '€', decimals: 2 }), '€2.00');
eq('no decimals asked: as before', u.fmtNumber(30.5, { currency: '€' }), '€30.5');
eq('compact: as before', u.fmtNumber(121066, { compact: true, currency: '€' }), '€121.07K');
u.setLocale('de-DE', 'EUR');
eq('German, two decimals', u.fmtNumber(30.5, { currency: '€', decimals: 2 }), '30,50 €');
u.setLocale('en-US', null);

const lt = src('src/render/livetable.js');
ok('a data table draws its columns in the order they were picked', /c\.columns\.map\(\(id\) => allCols\.find/.test(lt));
ok('and the editor keeps the pick order', /columnPicker\(cols, wb\.config\.columns, \(ids\) => \{ wb\.config\.columns = ids; refreshPreview\(\); \}, \{ pickOrder: true \}\)/.test(src('src/builder/block-editor.js')));
ok('a stat card has a unit after its number', /c\.format\?\.suffix/.test(src('src/render/blocks.js')) && /Unit after the number/.test(src('src/builder/block-editor.js')));
ok('map clusters are drawn in the theme colour', /iconCreateFunction/.test(src('src/render/map.js')) && /\.ap-cluster \{[^}]*var\(--ap-primary\)/.test(src('src/styles/site.css')));

const inv = src('src/render/invoice.js');
ok('an invoice line names a referenced product, not its row id (3.10.1)', /formatCellValue\(v, col\)/.test(inv) && /desc: describe\(r\)/.test(inv));

console.log(`case-study-fixes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

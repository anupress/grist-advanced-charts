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

// 3.10.2: a "Weekday" column (Mon, Tue…) is not a date because its name has "day" in it
const agg = await import(pathToFileURL(_resolve(ROOT, 'src/stats/aggregate.js')).href);
const rows = [['Fri', 5], ['Mon', 60], ['Sat', 7], ['Thu', 8], ['Tue', 55], ['Wed', 9]].map(([d, v]) => ({ Weekday: d, Revenue: v }));
const wcols = [{ id: 'Weekday', type: 'Text' }, { id: 'Revenue', type: 'Numeric' }];
const week = agg.groupAggregate(rows, { dims: ['Weekday'], measures: ['Revenue'], agg: 'sum', cols: wcols, order: 'custom', customOrder: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], labels: { Mon: 'Monday' } });
eq('a weekday column follows the order chosen for it', week.categories.join(','), 'Monday,Tue,Wed,Thu,Fri,Sat');
const months = agg.groupAggregate([{ Month: '2026-02', R: 1 }, { Month: '2026-01', R: 2 }], { dims: ['Month'], measures: ['R'], agg: 'sum', cols: [{ id: 'Month', type: 'Text' }], order: 'value' });
eq('months as text still keep their time order', months.categories.join(','), '2026-01,2026-02');
const dates = agg.groupAggregate([{ D: 1767225600, R: 1 }, { D: 1764547200, R: 9 }], { dims: ['D'], measures: ['R'], agg: 'sum', cols: [{ id: 'D', type: 'Date' }], order: 'value' });
ok('a Date column keeps its time order', dates.categories.length === 2);
const legacy = agg.groupAggregate([{ Month: 'b', R: 1 }, { Month: 'a', R: 2 }], { dims: ['Month'], measures: ['R'], agg: 'sum' });
eq('without column information the name still decides, as before', legacy.categories.join(','), 'a,b');

// 3.10.4: a progress bar's figures read like its target
eq('a year\'s revenue against a whole target', `${u.fmtProgress(118574.6, 150000, { prefix: '€' })} / ${u.fmtProgress(150000, 150000, { prefix: '€' })}`, '€118,575 / €150,000');
eq('an average pass rate keeps its decimals', u.fmtProgress(87.35, 100, { suffix: '%' }), '87.35 %');
eq('three quarters of 1 is not 1', u.fmtProgress(0.75, 1), '0.75');
eq('a target with decimals sets them', u.fmtProgress(2.25, 4.5), '2.3');
eq('a unit after the number', u.fmtProgress(9000, 9000, { suffix: 'leads' }), '9,000 leads');
ok('the progress bar uses it', /fmtProgress\(n, c\.target/.test(src('src/render/blocks.js')));

// 3.10.5: a stat card's figure, which has no decimals field in its editor
eq('a summed revenue, not compact', u.fmtFigure(118574.6, { compact: false, currency: '€' }), '€118,575');
eq('an average order keeps its cents', u.fmtFigure(8.73, { compact: false, currency: '€' }), '€8.73');
eq('decimals set are kept', u.fmtFigure(118574.6, { compact: false, currency: '€', decimals: 2 }), '€118,574.60');
eq('compact as before', u.fmtFigure(118574.6, { compact: true, currency: '€' }), '€118.57K');
eq('a count', u.fmtFigure(794, { compact: false }), '794');
ok('the stat card uses it', /fmtFigure\(value, c\.format/.test(src('src/render/blocks.js')));

// 3.10.4: "vs prev. period" compares periods, not two halves of the rows. A shop whose orders double while each order
// stays at ten euros: by rows both halves held the same number of orders, so the card said 0%.
const line = (m, n) => Array.from({ length: n }, () => ({ Month: m, Revenue: 10 }));
const growing = [...line('2026-01', 10), ...line('2026-02', 10), ...line('2026-03', 20), ...line('2026-04', 20)];
eq('orders doubling show as +100%', agg.computeKpi(growing, { column: 'Revenue', agg: 'sum', deltaBy: 'Month' }).delta, 100);
eq('the total is still everything', agg.computeKpi(growing, { column: 'Revenue', agg: 'sum', deltaBy: 'Month' }).value, 600);
const odd = [...line('2026-01', 4), ...line('2026-02', 99), ...line('2026-03', 6)];
eq('an odd middle period sits out: March against January', agg.computeKpi(odd, { column: 'Revenue', agg: 'sum', deltaBy: 'Month' }).delta, 50);
eq('one period alone has nothing to compare with', agg.computeKpi(line('2026-10', 8), { column: 'Revenue', agg: 'sum', deltaBy: 'Month' }).delta, null);
const shuffled = [...line('2026-04', 20), ...line('2026-01', 10), ...line('2026-03', 20), ...line('2026-02', 10)];
eq('row order does not matter', agg.computeKpi(shuffled, { column: 'Revenue', agg: 'sum', deltaBy: 'Month' }).delta, 100);
const years = [{ Y: 2025, R: 50 }, { Y: 2025, R: 50 }, { Y: 2026, R: 80 }, { Y: 2026, R: 70 }];
eq('numbers sort as numbers (a Year column)', agg.computeKpi(years, { column: 'R', agg: 'sum', deltaBy: 'Y' }).delta, 50);
const days = [1767225600, 1767225600, 1767312000, 1767312000].map((d, i) => ({ D: d, R: i < 2 ? 5 : 15 }));
eq('raw Grist dates (seconds) too', agg.computeKpi(days, { column: 'R', agg: 'sum', deltaBy: 'D' }).delta, 200);
eq('an average compares averages of the two halves', agg.computeKpi(growing.map((r, i) => ({ ...r, Revenue: i < 20 ? 10 : 12 })), { column: 'Revenue', agg: 'avg', deltaBy: 'Month' }).delta, 20);

console.log(`case-study-fixes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

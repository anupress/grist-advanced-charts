// How chart groups are ordered and named: the three asks from the community thread of October
// 2026 (a Choice column that went out of sequence, a wish for custom order, and display names
// kept in a helper column). Pure functions in stats/aggregate.js, plus the breakdown that shares
// them.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;
const A = await import(R('src/stats/aggregate.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

const AGE = { id: 'Age', type: 'Choice', widgetOptions: { choices: ['18–24', '25–34', '35–44', '45+'] } };
const COLS = [AGE, { id: 'Sex', type: 'Choice', widgetOptions: { choices: ['F', 'M'] } }, { id: 'N', type: 'Numeric' }];
// Rows arrive in no useful order, as a master list does.
const rows = [
  { Age: '35–44', Sex: 'M', N: 5 }, { Age: '18–24', Sex: 'F', N: 2 }, { Age: '45+', Sex: 'F', N: 9 },
  { Age: '25–34', Sex: 'M', N: 4 }, { Age: '18–24', Sex: 'M', N: 1 }, { Age: '35–44', Sex: 'F', N: 3 },
];
const cats = (o) => A.groupAggregate(rows, { dims: ['Age'], measures: ['N'], agg: 'sum', cols: COLS, ...o }).categories;
const data = (o) => A.groupAggregate(rows, { dims: ['Age'], measures: ['N'], agg: 'sum', cols: COLS, ...o }).series[0].data;

console.log('order');
eq('auto is source order, as every chart was before (no saved dashboard changes shape)', cats({}), ['35–44', '18–24', '45+', '25–34']);
eq('...and the numbers travel with their groups', data({ order: 'choice' }), [3, 4, 8, 9]);
eq('auto without a Choice list is source order too', cats({ cols: null }), ['35–44', '18–24', '45+', '25–34']);
eq('value: largest first', cats({ order: 'value' }), ['45+', '35–44', '25–34', '18–24']);
eq('the old sortByValue flag still means largest first', cats({ sortByValue: true }), ['45+', '35–44', '25–34', '18–24']);
eq('label: A to Z with numbers in numeric order', cats({ order: 'label', cols: null }), ['18–24', '25–34', '35–44', '45+']);
eq('label is numeric-aware', A.orderGroups(['item 10', 'item 9', 'item 1'], [{ data: [1, 2, 3] }], { mode: 'label' }).categories, ['item 1', 'item 9', 'item 10']);
eq('custom: the list first, the rest after in source order', cats({ order: 'custom', customOrder: ['45+', '18–24'] }), ['45+', '18–24', '35–44', '25–34']);
eq('source: as the rows came even on a Choice column', cats({ order: 'source' }), ['35–44', '18–24', '45+', '25–34']);
eq('choice: explicit', cats({ order: 'choice' }), ['18–24', '25–34', '35–44', '45+']);
eq('a date axis stays chronological whatever is asked', A.groupAggregate([{ Date: '2026-03', N: 9 }, { Date: '2026-01', N: 1 }], { dims: ['Date'], measures: ['N'], order: 'value' }).categories, ['2026-01', '2026-03']);
eq('choiceOrder reads the column', A.choiceOrder(COLS, 'Sex'), ['F', 'M']);
eq('choiceOrder is null for a plain column', A.choiceOrder(COLS, 'N'), null);

console.log('labels');
eq('groups are renamed for display, in their place', cats({ labels: { '45+': '45 and over' } }), ['35–44', '18–24', '45 and over', '25–34']);
eq('a renamed group keeps its Choice-list place', cats({ order: 'choice', labels: { '18–24': 'Youngest' } }), ['Youngest', '25–34', '35–44', '45+']);
const merged = A.groupAggregate(rows, { dims: ['Age'], measures: ['N'], agg: 'sum', cols: COLS, order: 'choice', labels: { '35–44': 'Adults', '45+': 'Adults' } });
eq('two values renamed alike become one group', merged.categories, ['18–24', '25–34', 'Adults']);
eq('...with their numbers added', merged.series[0].data, [3, 4, 17]);
eq('a custom list may use the new names', cats({ order: 'custom', customOrder: ['Young', '45+'], labels: { '18–24': 'Young' } }), ['Young', '45+', '35–44', '25–34']);
eq('...or the old ones', cats({ order: 'custom', customOrder: ['18–24', '45+'], labels: { '18–24': 'Young' } }), ['Young', '45+', '35–44', '25–34']);
eq('blank or missing names leave the value as it is', A.relabelGroups(['a', 'b'], [{ data: [1, 2] }], { a: '  ', c: 'x' }).categories, ['a', 'b']);
const two = A.groupAggregate(rows, { dims: ['Age', 'Sex'], measures: ['N'], agg: 'sum', cols: COLS, order: 'choice', labels: { '18–24': 'Young' } });
eq('renaming works with a series dimension too', two.categories, ['Young', '25–34', '35–44', '45+']);
eq('...series data stays aligned', two.series.map((s) => `${s.name}:${s.data.join(',')}`), ['M:1,4,5,0', 'F:2,0,3,9']);

console.log('breakdown');
const B = await import(R('src/render/breakdown.js'));
const bd = (o) => B.computeBreakdown(rows, 'Age', { col: AGE, ...o }).shown.map(([n, c]) => `${n}:${c}`);
eq('a breakdown still lists the biggest group first by default (ties in row order, as before)', bd({}), ['35–44:2', '18–24:2', '45+:1', '25–34:1']);
eq('...unless told to follow the Choice list', bd({ order: 'choice' }), ['18–24:2', '25–34:1', '35–44:2', '45+:1']);
eq('...and it renames and merges like a chart', bd({ labels: { '35–44': 'Adults', '45+': 'Adults' } }), ['Adults:3', '18–24:2', '25–34:1']);
eq('...and a plain column with no Choice list is unchanged', B.computeBreakdown(rows, 'N', {}).shown.length, 6);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

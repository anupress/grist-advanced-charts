// Which chart types fit a chosen set of columns. The one thing easy to get wrong: a text column
// that is COUNTED is the chart's number, not a second group. Until 3.8.1 the editor greyed out
// every type for "Count rows of Name by Department", the type in use included.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;
const { shapeOf, evaluateTypes } = await import(R('src/charts/recommend.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

const cols = [
  { id: 'Name', type: 'Text' }, { id: 'Department', type: 'Choice' }, { id: 'Joined', type: 'Date' },
  { id: 'Salary', type: 'Numeric' }, { id: 'Age', type: 'Int' },
];
const enabled = (sel) => evaluateTypes(cols, sel).filter((e) => e.enabled).map((e) => e.id);

console.log('shapeOf');
eq('a number summed is a measure', shapeOf(cols, { dims: ['Department'], measures: ['Salary'], agg: 'sum' }), { dims: 1, measures: 1, temporal: 0 });
eq('a text column counted is a measure too', shapeOf(cols, { dims: ['Department'], measures: ['Name'], agg: 'count' }), { dims: 1, measures: 1, temporal: 0 });
eq('...and with Count values and Distinct count', [shapeOf(cols, { dims: ['Department'], measures: ['Name'], agg: 'countv' }).measures, shapeOf(cols, { dims: ['Department'], measures: ['Name'], agg: 'countd' }).measures], [1, 1]);
eq('uncounted, a text measure still falls back to a group (the old reading)', shapeOf(cols, { dims: ['Department'], measures: ['Name'], agg: 'sum' }), { dims: 2, measures: 0, temporal: 0 });
eq('no aggregation given reads as before', shapeOf(cols, { dims: ['Department'], measures: ['Name'] }), { dims: 2, measures: 0, temporal: 0 });
eq('counting rows needs no column ("Just count entries")', shapeOf(cols, { dims: ['Department'], measures: [], agg: 'count' }), { dims: 1, measures: 1, temporal: 0 });
eq('a date group is temporal', shapeOf(cols, { dims: ['Joined'], measures: ['Salary'], agg: 'sum' }).temporal, 1);

console.log('evaluateTypes');
const counted = enabled({ dims: ['Department'], measures: ['Name'], agg: 'count' });
eq('a count chart can be a column, bar, pie or doughnut', ['column', 'bar', 'pie', 'doughnut'].every((t) => counted.includes(t)), true);
eq('...but not a scatter, which needs two numbers', counted.includes('scatter'), false);
eq('a summed chart is unchanged', enabled({ dims: ['Department'], measures: ['Salary'], agg: 'sum' }).includes('column'), true);
eq('two numbers fit a scatter', enabled({ dims: ['Department'], measures: ['Salary', 'Age'], agg: 'avg' }).includes('scatter'), true);
const rec = evaluateTypes(cols, { dims: ['Department'], measures: ['Name'], agg: 'count' }).filter((e) => e.recommended).map((e) => e.id);
eq('a count by one group gets a recommendation (column)', rec, ['column']);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

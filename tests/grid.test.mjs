// The Grid block's shape helpers, and the one property that matters most: every walk over a page's
// blocks sees the blocks inside a grid. A slicer must reach a chart in a cell, a live document must
// prime the table a stat in a cell reads, and the editor must find a cell's block by id.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => import(pathToFileURL(join(ROOT, 'src', p)).href);

const { normalizeGrid, resizeCells, flattenBlocks, findBlockIn, emptyCells, gridChildren, GRID_MAX } = await src('data/grid.js');
const { slicersFor, affectedBlocks, setSelection, clearAll } = await src('data/slicer.js');
const { tablesInConfig } = await src('data/provider.js');
const { newBlock } = await src('builder/new-block.js');
const { DUMMY_DATA } = await src('data/dummy-data.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };
const blk = (id, type, table) => ({ id, type, span: 3, config: table ? { table, title: id } : { title: id } });

// ---- normalizeGrid ----
const n = normalizeGrid({ cols: 9, rows: 0, cells: [blk('a', 'stat', 'Sales')], gap: 'huge' });
ok(n.cols === GRID_MAX && n.rows === 1, `dimensions clamp to 1..${GRID_MAX} (got ${n.cols}×${n.rows})`);
ok(n.cells.length === n.cols * n.rows, 'cell list is exactly cols × rows');
ok(n.cells[0].id === 'a' && n.cells.slice(1).every((c) => c === null), 'existing cells are kept, the rest are empty');
ok(n.gap === 'normal', 'an unknown gap falls back to normal');
ok(normalizeGrid({ cells: [{ id: 'g', type: 'grid', config: {} }] }).cells[0] === null, 'a grid inside a grid is treated as an empty cell');
ok(normalizeGrid(undefined).cells.length === 6, 'no config gives the default 3 × 2');
ok(emptyCells(2, 2).length === 4 && emptyCells(2, 2).every((c) => c === null), 'emptyCells');

// ---- resizeCells ----
// 3 × 2 with a block in every cell, shrunk to 2 × 2: four keep their place, two move or drop.
const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => blk(id, 'text'));
const shrink = resizeCells(six, 3, 2, 2, 2);
ok(shrink.cells.map((b) => b?.id).join() === 'a,b,d,e', `blocks keep their row and column where both still exist (got ${shrink.cells.map((b) => b?.id).join()})`);
ok(shrink.dropped.map((b) => b.id).join() === 'c,f', `blocks whose cells went away and found no room are reported (got ${shrink.dropped.map((b) => b.id).join()})`);
// 2 × 2 with two blocks grown to 3 × 2: nothing moves, nothing drops.
const grow = resizeCells([blk('a', 'text'), null, blk('c', 'text'), null], 2, 2, 3, 2);
ok(grow.cells[0]?.id === 'a' && grow.cells[3]?.id === 'c' && grow.dropped.length === 0, 'growing keeps positions and drops nothing');
// A homeless block takes the first free cell before anything is dropped.
const squeeze = resizeCells([null, blk('b', 'text'), blk('c', 'text')], 3, 1, 2, 1);
ok(squeeze.cells.map((b) => b?.id).join() === 'c,b' && squeeze.dropped.length === 0, `a displaced block moves into a free cell (got ${squeeze.cells.map((b) => b?.id).join()})`);

// ---- flattenBlocks / findBlockIn ----
const grid = { id: 'g1', type: 'grid', span: 12, config: { cols: 2, rows: 1, cells: [blk('in1', 'stat', 'Sales'), null] } };
const page = [blk('top', 'chart', 'Sales'), grid, blk('after', 'text')];
const flat = flattenBlocks(page);
ok(flat.map((b) => b.id).join() === 'top,g1,in1,after', `flatten lists each block followed by its cells (got ${flat.map((b) => b.id).join()})`);
ok(flat[2] === grid.config.cells[0], 'flatten returns the same objects, not copies');
ok(gridChildren(grid).length === 1 && gridChildren(blk('x', 'text')).length === 0, 'gridChildren');
const hit = findBlockIn(page, 'in1');
ok(hit && hit.parent === grid && hit.index === 0, 'a block in a cell is found with its grid and cell index');
const top = findBlockIn(page, 'after');
ok(top && top.parent === null && top.index === 2, 'a top-level block is found with its list index');
ok(findBlockIn(page, 'nope') === null, 'an unknown id is null');

// ---- the walks that must see inside a grid ----
const provider = {
  tables: () => Object.values(DUMMY_DATA.tables).map((t) => ({ id: t.id, label: t.label })),
  columns: (id) => DUMMY_DATA.tables[id]?.columns || [],
  records: (id) => DUMMY_DATA.tables[id]?.records || [],
  defaultTable: () => 'Sales',
};
// A slicer on the page reaches a chart inside a grid.
const slicer = { id: 's', type: 'slicer', span: 12, config: { table: 'Sales', column: 'Region' } };
const nestedChart = { id: 'nc', type: 'chart', span: 6, config: { table: 'Sales', title: 'Nested', dims: ['Region'], measures: ['Revenue'] } };
const tab = { id: 't', blocks: [slicer, { id: 'g2', type: 'grid', span: 12, config: { cols: 2, rows: 1, cells: [nestedChart, null] } }] };
ok(affectedBlocks(slicer, tab, provider).some((b) => b.id === 'nc'), 'affectedBlocks sees a chart inside a grid');
clearAll(); setSelection('s', ['North']);
ok(slicersFor(nestedChart, tab).length === 1, 'slicersFor finds the page slicer for a block inside a grid');
// A slicer INSIDE a grid still reaches the page.
const tab2 = { id: 't2', blocks: [{ id: 'g3', type: 'grid', span: 12, config: { cols: 2, rows: 1, cells: [slicer, null] } }, nestedChart] };
ok(slicersFor(nestedChart, tab2).length === 1, 'a slicer placed inside a grid reaches blocks on the page');
clearAll();
// Priming: the table a nested block reads is collected.
const cfg = { dataTable: 'Sales', tabs: [{ id: 't', blocks: [{ id: 'g4', type: 'grid', span: 12, config: { cols: 1, rows: 1, cells: [blk('p', 'stat', 'People')] } }] }] };
ok(tablesInConfig(cfg).includes('People'), 'tablesInConfig includes a table read only by a block inside a grid');

// ---- the default grid ----
const fresh = newBlock('grid', { table: 'Sales', provider });
ok(fresh.type === 'grid' && fresh.config.cols === 3 && fresh.config.rows === 2, 'a new grid is 3 × 2');
ok(fresh.config.cells.length === 6 && fresh.config.cells.every((c) => c === null), 'a new grid starts with six empty cells');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

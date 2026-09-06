// A Grid block holds other blocks in cells: `cols` across, `rows` down, one block or nothing per
// cell, row-major. These are the pure helpers for that shape, shared by the renderer, the editor,
// and every place that walks a page's blocks — which, once blocks can live inside blocks, is the
// list of places that would quietly miss them: slicer reach, table priming on a live document,
// "add to printout", the editor's find-by-id, template mapping, the integrity test.
//
// One level only. A grid cannot hold a grid; the chooser inside a cell does not offer one, and the
// renderer treats one as an empty cell. Nested layout puzzles are what the page grid is for.

export const GRID_MIN = 1;
export const GRID_MAX = 4;
export const GRID_GAPS = ['compact', 'normal', 'roomy'];

export const clampDim = (n, fallback) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(GRID_MAX, Math.max(GRID_MIN, v)) : fallback;
};

export const emptyCells = (cols, rows) => Array.from({ length: cols * rows }, () => null);

/** A grid config with its dimensions clamped and its cell list exactly cols × rows long. */
export function normalizeGrid(config) {
  const c = config || {};
  const cols = clampDim(c.cols, 3);
  const rows = clampDim(c.rows, 2);
  const want = cols * rows;
  const cells = (Array.isArray(c.cells) ? c.cells : []).slice(0, want)
    .map((b) => (b && typeof b === 'object' && b.type && b.type !== 'grid' ? b : null));
  while (cells.length < want) cells.push(null);
  return { ...c, cols, rows, cells, gap: GRID_GAPS.includes(c.gap) ? c.gap : 'normal' };
}

/**
 * The cells after a change of size. A block keeps its row and column when both still exist;
 * blocks whose cell went away move into the first free cells, in order; whatever still does not
 * fit is returned as `dropped` so the editor can say so before it happens.
 */
export function resizeCells(cells, oldCols, oldRows, newCols, newRows) {
  const out = emptyCells(newCols, newRows);
  const homeless = [];
  (cells || []).forEach((b, i) => {
    if (!b) return;
    const r = Math.floor(i / oldCols), c = i % oldCols;
    if (r < newRows && c < newCols) out[r * newCols + c] = b;
    else homeless.push(b);
  });
  const dropped = [];
  for (const b of homeless) {
    const free = out.indexOf(null);
    if (free >= 0) out[free] = b; else dropped.push(b);
  }
  return { cells: out, dropped };
}

/** The blocks inside a grid, in cell order, empties skipped. */
export function gridChildren(block) {
  return block?.type === 'grid' && Array.isArray(block.config?.cells) ? block.config.cells.filter(Boolean) : [];
}

/**
 * A page's blocks as one flat list: each top-level block, followed by the blocks inside it if it
 * is a grid. The same objects, not copies, so a caller that edits a block's config in place still
 * edits the real one.
 */
export function flattenBlocks(blocks) {
  const out = [];
  for (const b of blocks || []) {
    if (!b) continue;
    out.push(b);
    for (const child of gridChildren(b)) out.push(child);
  }
  return out;
}

/**
 * Where a block lives: at the top level (`parent` null, `index` into the list) or inside a grid
 * (`parent` the grid, `index` the cell). Null when it is nowhere in the list.
 */
export function findBlockIn(blocks, id) {
  const list = blocks || [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!b) continue;
    if (b.id === id) return { block: b, parent: null, index: i };
    const cells = b.type === 'grid' && Array.isArray(b.config?.cells) ? b.config.cells : [];
    for (let j = 0; j < cells.length; j++) {
      if (cells[j] && cells[j].id === id) return { block: cells[j], parent: b, index: j };
    }
  }
  return null;
}

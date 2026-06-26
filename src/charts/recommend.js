// Maps Grist column types to chart roles and recommends compatible chart types.

import { CHART_TYPES } from './catalog.js';

const MEASURE_TYPES = /^(Int|Numeric|Number|Currency)/i;
const TEMPORAL_TYPES = /^(Date|DateTime)/i;

export function roleOf(type) {
  if (MEASURE_TYPES.test(type || '')) return 'measure';
  if (TEMPORAL_TYPES.test(type || '')) return 'temporal'; // also usable as a dimension
  return 'dimension';
}

export const isMeasure = (col) => roleOf(col.type) === 'measure';
export const isTemporal = (col) => roleOf(col.type) === 'temporal';
export const isDimension = (col) => roleOf(col.type) !== 'measure';

// Count the column roles currently chosen for a chart.
export function shapeOf(columns, sel) {
  const byId = Object.fromEntries(columns.map((c) => [c.id, c]));
  let dims = 0, measures = 0, temporal = 0;
  for (const id of sel.dims || []) {
    const c = byId[id]; if (!c) continue;
    dims++; if (isTemporal(c)) temporal++;
  }
  for (const id of sel.measures || []) {
    const c = byId[id]; if (!c) continue;
    if (isMeasure(c)) measures++; else dims++; // a text measure falls back to count-style dim
  }
  return { dims, measures, temporal };
}

// For each chart type: is it usable, and is it a strong recommendation?
export function evaluateTypes(columns, sel) {
  const shape = shapeOf(columns, sel);
  const scored = CHART_TYPES.map((t) => ({ id: t.id, enabled: t.fits(shape), score: t.fits(shape) ? t.score(shape) : -1 }));
  const best = Math.max(...scored.map((s) => s.score));
  return scored.map((s) => ({ ...s, recommended: s.enabled && s.score >= 7 && s.score === best }));
}

// Suggest sensible default columns when a chart block is first added.
export function autoPick(columns) {
  const dims = columns.filter(isDimension);
  const temporal = columns.filter(isTemporal);
  const measures = columns.filter(isMeasure);
  const dim = (temporal[0] || dims[0] || columns[0]);
  const measure = measures[0] || columns.find((c) => c !== dim) || columns[0];
  return {
    chartType: temporal.length ? 'area' : 'column',
    dims: dim ? [dim.id] : [],
    measures: measure ? [measure.id] : [],
    agg: 'sum',
  };
}

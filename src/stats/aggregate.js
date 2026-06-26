// Pure-JS statistics engine (no server). Group-by + aggregation, KPI deltas, and the
// numeric helpers behind the "Excel-like" stats. Operates on plain row objects.

export const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  { id: 'count', label: 'Count' },
  { id: 'countd', label: 'Distinct count' },
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
  { id: 'median', label: 'Median' },
  { id: 'stdev', label: 'Std. deviation' },
];

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; };

export function aggregate(values, agg) {
  const nums = values.map(num).filter((v) => v !== null);
  switch (agg) {
    case 'count': return values.length;
    case 'countd': return new Set(values.map((v) => (v == null ? '∅' : v))).size;
    case 'min': return nums.length ? Math.min(...nums) : 0;
    case 'max': return nums.length ? Math.max(...nums) : 0;
    case 'avg': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case 'median': return median(nums);
    case 'stdev': return stdev(nums);
    case 'sum':
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

export function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function stdev(nums) {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1));
}

const keyOf = (v) => (v == null || v === '' ? '—' : String(v));

// Sort category keys: dates/numbers naturally, otherwise by value desc when sensible.
function sortCategories(cats, isTemporal) {
  if (isTemporal) return cats.sort();
  return cats;
}

/**
 * Group rows and aggregate.
 * opts: { dims:[catDim, seriesDim?], measures:[...], agg, sortByValue, limit, temporalDim }
 * Returns: { categories:[...], series:[{name, data:[...]}], total }
 */
export function groupAggregate(rows, opts) {
  const { dims = [], measures = [], agg = 'sum', sortByValue = false, limit = 0 } = opts;
  const catDim = dims[0];
  const seriesDim = dims[1];

  if (!catDim) {
    // No category: each measure becomes a single aggregated bar.
    const series = [{ name: agg, data: measures.map((m) => round(aggregate(rows.map((r) => r[m]), agg))) }];
    return { categories: measures, series, total: series[0].data.reduce((a, b) => a + b, 0) };
  }

  const cats = [];
  const catSet = new Set();
  for (const r of rows) { const k = keyOf(r[catDim]); if (!catSet.has(k)) { catSet.add(k); cats.push(k); } }
  const temporal = opts.temporalDim || /date|month|time|day|year/i.test(catDim);
  sortCategories(cats, temporal);

  let series;
  if (seriesDim) {
    // Pivot first measure across the series dimension.
    const measure = measures[0];
    const sNames = [];
    const sSet = new Set();
    for (const r of rows) { const k = keyOf(r[seriesDim]); if (!sSet.has(k)) { sSet.add(k); sNames.push(k); } }
    const bucket = new Map(); // `${cat}||${s}` -> values[]
    for (const r of rows) {
      const ck = keyOf(r[catDim]); const sk = keyOf(r[seriesDim]);
      const key = ck + '||' + sk;
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(measure ? r[measure] : 1);
    }
    series = sNames.map((sn) => ({
      name: sn,
      data: cats.map((c) => round(aggregate(bucket.get(c + '||' + sn) || [], measure ? agg : 'count'))),
    }));
  } else {
    // One series per measure.
    const bucket = new Map(); // cat -> {measure -> values[]}
    for (const r of rows) {
      const ck = keyOf(r[catDim]);
      if (!bucket.has(ck)) bucket.set(ck, {});
      const slot = bucket.get(ck);
      const list = measures.length ? measures : ['__count'];
      for (const m of list) { (slot[m] ||= []).push(m === '__count' ? 1 : r[m]); }
    }
    const list = measures.length ? measures : ['__count'];
    series = list.map((m) => ({
      name: m === '__count' ? 'Count' : m,
      data: cats.map((c) => round(aggregate((bucket.get(c) || {})[m] || [], m === '__count' ? 'count' : agg))),
    }));
  }

  // Optional sort by total value of the first series (great for bar/pie ranking).
  let categories = cats;
  if (sortByValue && !temporal && series.length) {
    const order = categories.map((c, i) => i).sort((a, b) => series[0].data[b] - series[0].data[a]);
    categories = order.map((i) => categories[i]);
    series = series.map((s) => ({ ...s, data: order.map((i) => s.data[i]) }));
  }
  if (limit > 0 && categories.length > limit) {
    categories = categories.slice(0, limit);
    series = series.map((s) => ({ ...s, data: s.data.slice(0, limit) }));
  }

  const total = series.reduce((acc, s) => acc + s.data.reduce((a, b) => a + b, 0), 0);
  return { categories, series, total };
}

// Scatter / bubble: raw points, optionally grouped by a dimension.
export function scatterPoints(rows, { x, y, size, group }) {
  if (!group) return [{ name: y || 'Points', points: rows.map((r) => pt(r, x, y, size)) }];
  const map = new Map();
  for (const r of rows) {
    const g = keyOf(r[group]);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(pt(r, x, y, size));
  }
  return [...map.entries()].map(([name, points]) => ({ name, points }));
}
function pt(r, x, y, size) {
  const p = [num(r[x]) ?? 0, num(r[y]) ?? 0];
  if (size) p.push(num(r[size]) ?? 0);
  return p;
}

// KPI value + optional delta vs previous period (orders rows by a temporal/order dim,
// splits in half, compares the two halves).
export function computeKpi(rows, { column, agg = 'sum', deltaBy }) {
  const value = round(aggregate(rows.map((r) => r[column]), agg));
  let delta = null;
  if (deltaBy && rows.length > 3) {
    const ordered = [...rows].sort((a, b) => String(a[deltaBy]).localeCompare(String(b[deltaBy])));
    const mid = Math.floor(ordered.length / 2);
    const prev = round(aggregate(ordered.slice(0, mid).map((r) => r[column]), agg));
    const curr = round(aggregate(ordered.slice(mid).map((r) => r[column]), agg));
    if (prev !== 0) delta = round(((curr - prev) / Math.abs(prev)) * 100);
  }
  return { value, delta };
}

// Sparkline series for a KPI card (aggregate measure across a temporal dim).
export function sparkSeries(rows, { column, deltaBy, agg = 'sum' }) {
  if (!deltaBy) return [];
  const g = groupAggregate(rows, { dims: [deltaBy], measures: [column], agg, temporalDim: true });
  return g.series[0] ? g.series[0].data : [];
}

function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// Pure-JS statistics engine (no server). Group-by + aggregation, KPI deltas, and the
// numeric helpers behind the spreadsheet-style stats. Operates on plain row objects.

import { formatCellValue, isStructuredType } from '../util.js';

export const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  // 'count' counts every row, blanks included. That is a reasonable thing to want, but it is not
  // what "Count" on a *column* suggests, and it disagrees with Average on the same column, which
  // divides by the values that are actually there. Both are now offered under names that say which
  // is which. 'count' keeps its old behaviour so no dashboard already built changes its numbers.
  { id: 'count', label: 'Count rows' },
  { id: 'countv', label: 'Count values' },
  { id: 'countd', label: 'Distinct count' },
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
  { id: 'median', label: 'Median' },
  { id: 'stdev', label: 'Std. deviation' },
];

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; };
const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');

export function aggregate(values, agg) {
  const nums = values.map(num).filter((v) => v !== null);
  switch (agg) {
    case 'count': return values.length;
    case 'countv': return values.filter((v) => !isBlank(v)).length;
    case 'countd': return new Set(values.map((v) => (v == null ? '∅' : v))).size;
    // min/max used to return 0 when there was nothing to measure, which renders as a real "$0" —
    // indistinguishable from a genuine zero, and most misleading in exactly the case where someone
    // would act on it. null flows through fmtNumber as an em-dash instead.
    case 'min': return nums.length ? Math.min(...nums) : null;
    case 'max': return nums.length ? Math.max(...nums) : null;
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

/**
 * The category label for one dimension.
 *
 * Grouping is done on whatever the cell holds, and for a Reference column that is a row id. "Revenue
 * by Client" then draws one bar per number, which is a chart of the right shape carrying labels
 * nobody can read. Given the column, the reference resolves to the name the document shows.
 *
 * Without a column descriptor this is exactly the old behaviour, so every caller that has no
 * columns to hand keeps working unchanged.
 */
function keyerFor(cols, dim) {
  const col = Array.isArray(cols) ? cols.find((c) => c.id === dim) : null;
  if (!col || !isStructuredType(col.type)) return keyOf;
  return (v) => {
    if (v == null || v === '' || v === 0) return '—';
    return formatCellValue(v, col) || '—';
  };
}

// Sort category keys: dates/numbers naturally, otherwise by value desc when sensible.
function sortCategories(cats, isTemporal) {
  if (isTemporal) return cats.sort();
  return cats;
}

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// The Choice list of a column, in the order its owner wrote it — for an age group column that is
// "18–24, 25–34, 35–44", which no sort of the labels themselves can recover. Null when the column
// is not a Choice column or the document did not send its options.
export function choiceOrder(cols, dim) {
  const col = Array.isArray(cols) ? cols.find((c) => c.id === dim) : null;
  const choices = col?.widgetOptions?.choices;
  return Array.isArray(choices) && choices.length ? choices.map(String) : null;
}

// Rename groups. `labels` maps a group as it reads (the display key) to what it should read; two
// groups renamed to the same thing become one, their numbers added. Asked for on the community
// forum, where the workaround was a helper column holding the display names.
export function relabelGroups(categories, series, labels) {
  if (!labels || typeof labels !== 'object') return { categories, series };
  const out = [];
  const index = new Map();
  const merged = series.map(() => []);
  categories.forEach((c, i) => {
    const name = Object.prototype.hasOwnProperty.call(labels, c) && String(labels[c]).trim() ? String(labels[c]).trim() : c;
    let at = index.get(name);
    if (at === undefined) { at = out.length; out.push(name); index.set(name, at); merged.forEach((m) => m.push(0)); }
    merged.forEach((m, s) => { m[at] = round((m[at] || 0) + (Number(series[s].data[i]) || 0)); });
  });
  return { categories: out, series: series.map((s, i) => ({ ...s, data: merged[i] })) };
}

// Put groups in order. mode: 'value' (first series, largest first), 'label' (A to Z, numbers in
// numeric order), 'custom' (the given list first, in that order, anything else after in source
// order), 'choice' (the column's Choice list), 'source' (as the rows came). 'auto' is source
// order, exactly what every chart did before this option existed, so no saved dashboard changes
// shape on its own; the Choice list is one pick away in the editor.
export function orderGroups(categories, series, { mode = 'auto', custom = [], choices = null, aliasOf = null } = {}) {
  let idx = categories.map((c, i) => i);
  const byList = (list) => {
    const rank = new Map(list.map((v, i) => [String(v), i]));
    const n = list.length;
    // A group is found in the list under its own name or, when it is about to be renamed, under
    // its new one — so "one per line" accepts whichever the author has in mind.
    const place = (i) => {
      const c = categories[i];
      if (rank.has(c)) return rank.get(c);
      const alias = aliasOf ? aliasOf(c) : null;
      if (alias != null && rank.has(String(alias))) return rank.get(String(alias));
      return n + i;
    };
    idx.sort((a, b) => place(a) - place(b));
  };
  const effective = mode === 'auto' ? 'source' : mode;
  if (effective === 'value' && series.length) idx.sort((a, b) => (Number(series[0].data[b]) || 0) - (Number(series[0].data[a]) || 0));
  else if (effective === 'label') idx.sort((a, b) => natural.compare(categories[a], categories[b]));
  else if (effective === 'custom') byList(custom || []);
  else if (effective === 'choice' && choices) byList(choices);
  if (idx.every((v, i) => v === i)) return { categories, series };
  return { categories: idx.map((i) => categories[i]), series: series.map((s) => ({ ...s, data: idx.map((i) => s.data[i]) })) };
}

// Order, then rename. Ordering runs on the values as they appear in the data, which is what the
// Choice list refers to; renaming afterwards keeps each group's place (a merged group takes the
// place of its first member). A custom list may name a group by its old or its new name.
export function shapeGroups(categories, series, { mode = 'auto', custom = [], choices = null, labels = null } = {}) {
  const aliasOf = labels && typeof labels === 'object' ? (c) => (Object.prototype.hasOwnProperty.call(labels, c) ? labels[c] : null) : null;
  const g = orderGroups(categories, series, { mode, custom, choices, aliasOf });
  return relabelGroups(g.categories, g.series, labels);
}

/**
 * Group rows and aggregate.
 * opts: { dims:[catDim, seriesDim?], measures:[...], agg, sortByValue, limit, temporalDim,
 *         order, customOrder, labels }
 * `sortByValue` is the older spelling of order: 'value' and still works.
 * Returns: { categories:[...], series:[{name, data:[...]}], total }
 */
export function groupAggregate(rows, opts) {
  const { dims = [], measures = [], agg = 'sum', sortByValue = false, limit = 0, cols = null } = opts;
  const catDim = dims[0];
  const seriesDim = dims[1];
  const catKey = keyerFor(cols, catDim);
  const seriesKey = keyerFor(cols, seriesDim);

  if (!catDim) {
    // No category: each measure becomes a single aggregated bar.
    const series = [{ name: agg, data: measures.map((m) => round(aggregate(rows.map((r) => r[m]), agg))) }];
    return { categories: measures, series, total: series[0].data.reduce((a, b) => a + b, 0) };
  }

  const cats = [];
  const catSet = new Set();
  for (const r of rows) { const k = catKey(r[catDim]); if (!catSet.has(k)) { catSet.add(k); cats.push(k); } }
  // Time-like groups keep their order. Known by the column when there is one: a Date column, or values that read as
  // a year, a month or a day (2026, 2026-01, 2026-01-31). The name alone decided it before 3.10.2, and "Weekday",
  // with Mon, Tue… in it, matched "day": it was sorted A to Z and its chosen order ignored.
  const catCol = Array.isArray(cols) ? cols.find((c) => c.id === catDim) : null;
  const isoLike = (list) => list.length > 0 && list.every((v) => v === '—' || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(v)));
  const temporal = opts.temporalDim || (catCol
    ? (/^Date/i.test(String(catCol.type || '')) || isoLike(cats))
    : /date|month|time|day|year/i.test(catDim));
  sortCategories(cats, temporal);

  let series;
  if (seriesDim) {
    // Pivot first measure across the series dimension.
    const measure = measures[0];
    const sNames = [];
    const sSet = new Set();
    for (const r of rows) { const k = seriesKey(r[seriesDim]); if (!sSet.has(k)) { sSet.add(k); sNames.push(k); } }
    const bucket = new Map(); // `${cat}||${s}` -> values[]
    for (const r of rows) {
      const ck = catKey(r[catDim]); const sk = seriesKey(r[seriesDim]);
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
      const ck = catKey(r[catDim]);
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

  // Order, then rename. Dates keep their chronological order whatever the chart says, because a
  // time axis sorted by value is not a time axis.
  let categories = cats;
  // An order chosen by hand is followed even for dates: someone who typed one meant it.
  if (temporal && opts.order !== 'custom') ({ categories, series } = relabelGroups(categories, series, opts.labels));
  else {
    const mode = opts.order || (sortByValue ? 'value' : 'auto');
    ({ categories, series } = shapeGroups(categories, series, { mode, custom: opts.customOrder, choices: choiceOrder(cols, catDim), labels: opts.labels }));
  }
  if (limit > 0 && categories.length > limit) {
    // With otherLabel set, the tail is pooled into one final category instead of being dropped —
    // see the call site in charts/echarts-adapter.js for which chart shapes need that.
    if (opts.otherLabel) {
      series = series.map((s) => ({
        ...s,
        data: [...s.data.slice(0, limit), round(s.data.slice(limit).reduce((a, b) => a + (Number(b) || 0), 0))],
      }));
      categories = [...categories.slice(0, limit), opts.otherLabel];
    } else {
      categories = categories.slice(0, limit);
      series = series.map((s) => ({ ...s, data: s.data.slice(0, limit) }));
    }
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
// The "vs prev. period" figure under a KPI: the later half of the periods in view against the
// earlier half, the same number of periods on each side (an odd middle one sits out). By Month over
// 2026 so far that is June to October against January to May.
//
// It used to split the ROWS in half, so both halves always held the same number of rows: a shop
// whose orders doubled showed about 0% on a summed revenue, because only the average order could
// move it (found building the Glutbohne case study, 3.10.4). One period alone has nothing before it,
// so no figure is shown rather than a made-up one.
export function computeKpi(rows, { column, agg = 'sum', deltaBy }) {
  const value = round(aggregate(rows.map((r) => r[column]), agg));
  let delta = null;
  if (deltaBy && rows.length > 3) {
    const key = (r) => (r[deltaBy] == null ? '' : String(r[deltaBy]));
    const num = (k) => k.trim() !== '' && Number.isFinite(Number(k));
    const periods = [...new Set(rows.map(key))].filter((k) => k !== '')
      .sort((a, b) => (num(a) && num(b) ? Number(a) - Number(b) : a.localeCompare(b)));
    const half = Math.floor(periods.length / 2);
    if (half >= 1) {
      const early = new Set(periods.slice(0, half));
      const late = new Set(periods.slice(periods.length - half));
      const prev = round(aggregate(rows.filter((r) => early.has(key(r))).map((r) => r[column]), agg));
      const curr = round(aggregate(rows.filter((r) => late.has(key(r))).map((r) => r[column]), agg));
      if (prev !== 0) delta = round(((curr - prev) / Math.abs(prev)) * 100);
    }
  }
  return { value, delta };
}

// Which column should a KPI's delta and sparkline run along? Three states, deliberately:
//   undefined   -> not configured. Pick the table's first date column, so a stat shows its trend
//                  without the author having to discover the option. This is what makes the little
//                  wave under a KPI the norm rather than something only the demo site had.
//   null        -> the author explicitly turned it off. Respected; never auto-filled.
//   'ColumnId'  -> that column — but only while it still exists on the table. Repointing a stat at
//                  another table used to leave this dangling at the old table's column, which
//                  silently killed the sparkline; now it falls back to automatic.
export function autoDeltaColumn(columns) {
  return (columns || []).find((c) => /date/i.test(c.type || ''))?.id ?? null;
}
export function resolveDeltaBy(configured, columns) {
  if (configured === null) return null;
  if (configured !== undefined && (columns || []).some((c) => c.id === configured)) return configured;
  return autoDeltaColumn(columns);
}

// Sparkline series for a KPI card (aggregate measure across a temporal dim).
export function sparkSeries(rows, { column, deltaBy, agg = 'sum' }) {
  if (!deltaBy) return [];
  const g = groupAggregate(rows, { dims: [deltaBy], measures: [column], agg, temporalDim: true });
  return g.series[0] ? g.series[0].data : [];
}

// null passes straight through: min/max return it when there is nothing to measure, and collapsing
// that to 0 here would put the misleading "$0" back that removing it from aggregate() just fixed.
function round(n) {
  if (n == null) return null;
  return Math.round((Number(n) || 0) * 100) / 100;
}

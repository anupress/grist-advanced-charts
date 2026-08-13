// Builds ECharts options from a chart block config + dataset, and renders/updates.
// Uses the global `echarts` (vendored). Reads theme colors from CSS variables so charts
// restyle instantly when the palette changes.

import { groupAggregate, scatterPoints, aggregate } from '../stats/aggregate.js';

// Chart types whose shape claims to show a whole. Treemap is included for the same reason as pie;
// funnel is not, because its stages are a sequence rather than a partition of one total.
const WHOLE_SHAPED = new Set(['pie', 'doughnut', 'treemap']);
import { getChartType, CARTESIAN, SINGLE_SERIES } from './catalog.js';
import { currentSeriesColors, readVar } from '../theme/apply.js';
import { fmtNumber } from '../util.js';

const ec = () => window.echarts;

function palette(block) {
  if (block?.config?.colors && block.config.colors.length) return block.config.colors;
  return currentSeriesColors();
}
const axisText = () => readVar('--ap-text-soft') || '#5b6076';
const gridLine = () => readVar('--ap-border') || '#e6e8f0';
const fmt = (v) => fmtNumber(v, { compact: true });

function baseGrid(showLegend) {
  return { left: 8, right: 16, top: showLegend ? 38 : 16, bottom: 6, containLabel: true };
}
function legendCfg(show) {
  return { show, top: 6, type: 'scroll', icon: 'roundRect', itemWidth: 11, itemHeight: 11,
           textStyle: { color: axisText(), fontSize: 12 } };
}
function tooltipCfg(trigger = 'axis') {
  return { trigger, appendToBody: true, valueFormatter: (v) => fmtNumber(v, { compact: false }),
           backgroundColor: readVar('--ap-surface') || '#fff', borderColor: gridLine(),
           textStyle: { color: readVar('--ap-text') || '#1f2233' }, extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);' };
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A category axis built from a Date column arrives as raw ISO strings. Twelve of "2025-01-01" is
// long enough to trip the rotation heuristic below, so a simple monthly trend rendered as a wall
// of angled timestamps. Shortening to "Jan"/"Feb" (or "Jan 25" when the range crosses a year, or
// "12 Aug" for daily data) is both readable and short enough that rotation stops being needed.
// Safe to do here because groupAggregate has already sorted temporal categories lexically — this
// only changes how they are LABELLED, never their order.
function shortenDateCategories(cats) {
  if (cats.length < 2 || !cats.every((c) => ISO_DATE.test(String(c)))) return cats;
  const sameYear = new Set(cats.map((c) => String(c).slice(0, 4))).size === 1;
  const monthly = cats.every((c) => String(c).slice(8, 10) === '01');
  return cats.map((c) => {
    const s = String(c);
    const mon = MON[Number(s.slice(5, 7)) - 1] || s.slice(5, 7);
    const yy = s.slice(2, 4);
    if (monthly) return sameYear ? mon : `${mon} ${yy}`;
    return sameYear ? `${Number(s.slice(8, 10))} ${mon}` : `${Number(s.slice(8, 10))} ${mon} ${yy}`;
  });
}

const catAxis = (data, { rotate = 0, showAll = false } = {}) => ({
  type: 'category', data, boundaryGap: true,
  axisLine: { lineStyle: { color: gridLine() } }, axisTick: { show: false },
  // showAll forces every category label to render (interval:0) — used once we've rotated them
  // enough to fit. Otherwise let echarts drop overlapping labels rather than overprint them into
  // an unreadable smear. (echarts' default hides labels that collide, which on 6 longish names
  // like "Emily Johnson" left only 2 of them visible — the bug this addresses.)
  axisLabel: { color: axisText(), fontSize: 11, rotate, hideOverlap: !showAll, interval: showAll ? 0 : 'auto' },
});
const valAxis = () => ({
  type: 'value', splitLine: { lineStyle: { color: gridLine(), type: 'dashed' } },
  axisLabel: { color: axisText(), fontSize: 11, formatter: fmt }, axisLine: { show: false }, axisTick: { show: false },
});

export function buildOption(block, ctx) {
  const cfg = block.config || {};
  const rows = ctx.rows || [];
  const type = cfg.chartType || 'column';
  const colors = palette(block);
  const stacked = !!cfg.stacked;
  const smooth = cfg.smooth !== false;

  if (type === 'scatter') return scatterOption(cfg, rows, colors);
  if (type === 'gauge') return gaugeOption(cfg, rows, colors);
  if (type === 'radar') return radarOption(cfg, rows, colors);
  // Checked before groupAggregate, which needs a dimension to group by and has none here.
  if (isMeasureFunnel(cfg)) return funnelOption(measureFunnelData(cfg, rows, ctx.columns), colors, { staged: true });

  const g = groupAggregate(rows, {
    dims: cfg.dims || [], measures: cfg.measures || [], agg: cfg.agg || 'sum',
    sortByValue: cfg.sortByValue ?? SINGLE_SERIES.has(type), limit: cfg.limit || 0,
    // A pie or doughnut asserts parts-of-a-whole by its shape, so truncating the tail draws a
    // complete circle out of incomplete data — an 8-category pie limited to 5 showed 83% of the
    // total and looked like all of it. Pooling the remainder keeps the circle honest. Bars and
    // lines make no such claim, so there a limit still simply means "top N".
    otherLabel: WHOLE_SHAPED.has(type) ? 'Other' : null,
  });

  // Display labels only — the aggregation above already used the raw values.
  const cats = shortenDateCategories(g.categories);

  if (SINGLE_SERIES.has(type)) {
    const data = cats.map((c, i) => ({ name: c, value: g.series[0]?.data[i] ?? 0 }));
    if (type === 'treemap') return treemapOption(data, colors);
    if (type === 'funnel') return funnelOption(data, colors);
    return pieOption(data, colors, type === 'doughnut');
  }

  // Cartesian: column / bar / line / area
  const isBar = type === 'bar';
  const isLineish = type === 'line' || type === 'area';
  const showLegend = g.series.length > 1;
  // Category-axis label strategy: rotate when labels are long or numerous so they stop overlapping,
  // and force every one to show while rotation keeps them legible. Only past ~18 categories do we
  // fall back to letting echarts hide overlaps — beyond that even angled labels become a wall.
  const nCats = g.categories.length;
  const maxLabelLen = cats.reduce((m, c) => Math.max(m, String(c).length), 0);
  // Rotate only when the labels genuinely will not fit flat. Judge that on the total width they
  // need — count AND length together — rather than on either alone: a bare "more than 8 categories"
  // rule tilted twelve three-letter month labels that had room to spare, while six names like
  // "Emily Johnson" must still tilt. At 11px a card's axis fits roughly 55 characters laid flat.
  const flatWidth = nCats * (maxLabelLen + 1);
  const catRotate = flatWidth > 55 ? (maxLabelLen > 14 || nCats > 12 ? 45 : 30) : 0;
  const showAllCats = catRotate > 0 && nCats <= 18;

  const series = g.series.map((s) => {
    if (isLineish) {
      return { name: s.name, type: 'line', data: s.data, smooth, symbol: 'circle', symbolSize: 6,
        showSymbol: g.categories.length <= 14, lineStyle: { width: 3 },
        areaStyle: type === 'area' ? { opacity: 0.18 } : undefined,
        stack: stacked ? 'total' : undefined, emphasis: { focus: 'series' } };
    }
    return { name: s.name, type: 'bar', data: s.data, stack: stacked ? 'total' : undefined,
      barMaxWidth: 46, itemStyle: { borderRadius: isBar ? [0, 6, 6, 0] : [6, 6, 0, 0] }, emphasis: { focus: 'series' } };
  });

  return {
    color: colors, animationDuration: 600, animationEasing: 'cubicOut',
    grid: baseGrid(showLegend), legend: legendCfg(showLegend), tooltip: tooltipCfg('axis'),
    xAxis: isBar ? valAxis() : catAxis(cats, { rotate: catRotate, showAll: showAllCats }),
    yAxis: isBar ? catAxis(cats, { showAll: nCats <= 18 }) : valAxis(),
    series,
  };
}

function pieOption(data, colors, doughnut) {
  return {
    color: colors, tooltip: { ...tooltipCfg('item'), formatter: (p) => `${p.name}<br/><b>${fmtNumber(p.value, { compact: false })}</b> (${p.percent}%)` },
    legend: { ...legendCfg(true), top: 'bottom', left: 'center' },
    series: [{ type: 'pie', radius: doughnut ? ['46%', '72%'] : ['0%', '72%'], center: ['50%', '46%'],
      avoidLabelOverlap: true, itemStyle: { borderColor: readVar('--ap-surface') || '#fff', borderWidth: 2, borderRadius: 6 },
      label: { color: axisText(), fontSize: 11 }, labelLine: { length: 8, length2: 8 },
      data, animationType: 'scale', animationEasing: 'elasticOut' }],
  };
}
function treemapOption(data, colors) {
  return { color: colors, tooltip: tooltipCfg('item'),
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false },
      itemStyle: { borderColor: readVar('--ap-surface') || '#fff', borderWidth: 2, gapWidth: 2, borderRadius: 4 },
      label: { color: '#fff', fontSize: 12, fontWeight: 600 }, data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })) }] };
}
/**
 * A funnel, in one of two modes.
 *
 * `staged` means the caller declared the order — the stages came from the measures the author
 * listed, in the sequence they listed them. That order is the whole meaning of the chart, so it is
 * neither re-sorted here nor by ECharts (`sort: 'none'`), and each stage is labelled with what
 * survived from the first one. Drop-off between stages is the only reason to draw a funnel rather
 * than a bar chart, so it should not take arithmetic to read it.
 *
 * Otherwise the stages came from a category column, where nothing guarantees an order at all, so
 * the widths are sorted largest-first and no percentage is claimed.
 */
// A conversion rate, printed so it never rounds away. A real funnel spans orders of magnitude —
// six million impressions to under a thousand customers — and at that range a percentage of the
// first stage renders every later stage as "0%", which is worse than showing nothing.
function ratePct(value, base) {
  if (!(base > 0)) return null;
  const p = (value / base) * 100;
  return (p >= 10 ? Math.round(p) : p >= 1 ? p.toFixed(1) : p.toFixed(2)) + '%';
}

function funnelOption(data, colors, { staged = false } = {}) {
  const rows = staged ? [...data] : [...data].sort((a, b) => b.value - a.value);
  const first = rows[0]?.value || 0;
  // Stage labels carry conversion from the PREVIOUS stage, not from the first. "Of the leads we
  // got, 16% became customers" is the number anyone acts on; "0% of impressions" is arithmetic
  // nobody can use. The tooltip still gives the run from the top, for the overall picture.
  const label = staged
    ? { color: '#fff', fontSize: 12, fontWeight: 600,
        formatter: (p) => {
          const prev = rows[p.dataIndex - 1];
          const r = p.dataIndex > 0 ? ratePct(p.value, prev?.value) : null;
          return r ? `${p.name} · ${r}` : p.name;
        } }
    : { color: '#fff', fontSize: 12, fontWeight: 600 };
  return { color: colors, tooltip: { ...tooltipCfg('item'),
      formatter: (p) => {
        const head = `${p.name}<br/><b>${fmtNumber(p.value, {})}</b>`;
        if (!staged || p.dataIndex === 0) return head;
        const step = ratePct(p.value, rows[p.dataIndex - 1]?.value);
        const all = ratePct(p.value, first);
        return `${head}<br/>${step} of ${rows[p.dataIndex - 1].name}<br/>${all} of ${rows[0].name}`;
      } },
    legend: legendCfg(true),
    series: [{ type: 'funnel', left: '8%', right: '8%', top: 40, bottom: 8, minSize: '14%', gap: 2,
      sort: staged ? 'none' : 'descending',
      label, labelLine: { show: false },
      itemStyle: { borderColor: readVar('--ap-surface') || '#fff', borderWidth: 1 }, data: rows }] };
}

/**
 * Stages built from the measures themselves: impressions, then the clicks among them, then the
 * leads among those. This is what a funnel actually means, and until now it could not be expressed
 * — the chart could only take one measure across a category column, which required a table to
 * happen to carry a cumulative stage column. Almost none do: a "Stage" field records where each
 * record is NOW, so its groups partition the total rather than containing one another, and drawing
 * that as a funnel puts the largest group at the widest point whatever the sequence really is.
 */
export function measureFunnelData(cfg, rows, columns) {
  const labelOf = (id) => columns?.find((c) => c.id === id)?.label || id;
  return (cfg.measures || []).map((m) => ({
    name: labelOf(m), value: aggregate(rows.map((r) => r[m]), cfg.agg || 'sum') || 0 }));
}

// A funnel whose stages are its measures: no category dimension, two or more values in order.
export const isMeasureFunnel = (cfg) =>
  (cfg?.chartType === 'funnel') && !(cfg.dims || []).length && (cfg.measures || []).length >= 2;
function radarOption(cfg, rows, colors) {
  const g = groupAggregate(rows, { dims: [cfg.dims?.[0]].filter(Boolean), measures: cfg.measures || [], agg: cfg.agg || 'sum' });
  const max = Math.max(1, ...g.series.flatMap((s) => s.data));
  const indicator = g.categories.map((c) => ({ name: c, max: max * 1.1 }));
  return { color: colors, tooltip: tooltipCfg('item'), legend: legendCfg(g.series.length > 1),
    radar: { indicator, radius: '64%', center: ['50%', '54%'], splitLine: { lineStyle: { color: gridLine() } },
      splitArea: { areaStyle: { color: ['transparent'] } }, axisLine: { lineStyle: { color: gridLine() } },
      axisName: { color: axisText(), fontSize: 11 } },
    series: [{ type: 'radar', data: g.series.map((s) => ({ name: s.name, value: s.data, areaStyle: { opacity: 0.12 }, lineStyle: { width: 2 } })) }] };
}
function scatterOption(cfg, rows, colors) {
  const m = cfg.measures || [];
  const groups = scatterPoints(rows, { x: m[0], y: m[1], size: m[2], group: cfg.dims?.[0] });
  return { color: colors, tooltip: { ...tooltipCfg('item'), formatter: (p) => `${p.seriesName}<br/>${m[0]}: <b>${fmtNumber(p.value[0], {})}</b><br/>${m[1]}: <b>${fmtNumber(p.value[1], {})}</b>` },
    legend: legendCfg(groups.length > 1), grid: baseGrid(groups.length > 1),
    xAxis: { ...valAxis(), name: m[0], nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: axisText() } },
    // The y-axis name runs ALONG the axis, like the x-axis name below it. Left at its default
    // ('end'), ECharts draws it above the plot — which is exactly where baseGrid has just reserved
    // space for the legend, so the two printed on top of each other whenever a scatter was grouped.
    yAxis: { ...valAxis(), name: m[1], nameLocation: 'middle', nameRotate: 90, nameGap: 46,
      nameTextStyle: { color: axisText() } },
    series: groups.map((gp) => ({ name: gp.name, type: 'scatter',
      symbolSize: m[2] ? (d) => Math.max(8, Math.sqrt(d[2]) / 3) : 12,
      itemStyle: { opacity: 0.8 }, data: gp.points, emphasis: { focus: 'series' } })) };
}
function gaugeOption(cfg, rows, colors) {
  const val = aggregate(rows.map((r) => r[cfg.measures?.[0]]), cfg.agg || 'sum');
  const max = cfg.gaugeMax || niceMax(val);
  return { series: [{ type: 'gauge', radius: '92%', center: ['50%', '58%'], min: 0, max, startAngle: 210, endAngle: -30,
    progress: { show: true, width: 16, roundCap: true, itemStyle: { color: colors[0] } },
    axisLine: { lineStyle: { width: 16, color: [[1, readVar('--ap-bg-soft') || '#eef0f7']] } },
    pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false },
    axisLabel: { show: false }, anchor: { show: false },
    title: { show: false }, detail: { valueAnimation: true, fontSize: 30, fontWeight: 800, offsetCenter: [0, 0],
      color: readVar('--ap-text') || '#1f2233', formatter: (v) => fmtNumber(v, { compact: true }) },
    // Pass the real value, not Math.round(val): the detail formatter above already decides how to
    // display it, so rounding here only threw away precision — and on a small-magnitude metric it
    // is the whole number. An average satisfaction of 4.26 on a 0-5 dial rendered as a flat "4",
    // with the arc drawn at the wrong place to match.
    data: [{ value: val }] }] };
}
function niceMax(v) { if (v <= 0) return 100; const mag = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / mag) * mag; }

// ---- Rendering / lifecycle ----
const registry = new WeakMap(); // container -> instance

export function renderChart(container, block, ctx) {
  if (!ec()) { container.innerHTML = '<div class="ap-empty">Chart engine unavailable</div>'; return null; }
  // Hidden (inactive tab) — mount later when its tab is shown.
  if (container.offsetParent === null && container.clientWidth === 0) return null;
  // Laid out but not sized yet — retry shortly (setTimeout works when backgrounded).
  if (container.clientWidth === 0 || container.clientHeight === 0) {
    const n = container._apTry || 0;
    if (n < 12) { container._apTry = n + 1; setTimeout(() => renderChart(container, block, ctx), 60); }
    return null;
  }
  container._apTry = 0;
  let inst = registry.get(container);
  if (!inst || inst.isDisposed?.()) { inst = ec().init(container, null, { renderer: 'canvas' }); registry.set(container, inst); }
  let option;
  try { option = buildOption(block, ctx); }
  catch (e) { container.innerHTML = '<div class="ap-empty">Could not build chart</div>'; return inst; }
  inst.setOption(option, true);
  return inst;
}

export function resizeChartsIn(scope) {
  (scope || document).querySelectorAll('.ap-chart, .ap-preview__chart').forEach((c) => {
    const inst = registry.get(c); if (inst && !inst.isDisposed?.()) inst.resize();
  });
}

let _wired = false;
export function wireGlobalResize() {
  if (_wired) return; _wired = true;
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => resizeChartsIn(document), 120); });
}

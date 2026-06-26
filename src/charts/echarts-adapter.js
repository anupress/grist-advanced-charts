// Builds ECharts options from a chart block config + dataset, and renders/updates.
// Uses the global `echarts` (vendored). Reads theme colors from CSS variables so charts
// restyle instantly when the palette changes.

import { groupAggregate, scatterPoints, aggregate } from '../stats/aggregate.js';
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
const catAxis = (data, rotate) => ({
  type: 'category', data, boundaryGap: true,
  axisLine: { lineStyle: { color: gridLine() } }, axisTick: { show: false },
  axisLabel: { color: axisText(), fontSize: 11, hideOverlap: true, rotate: rotate || 0 },
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

  const g = groupAggregate(rows, {
    dims: cfg.dims || [], measures: cfg.measures || [], agg: cfg.agg || 'sum',
    sortByValue: cfg.sortByValue ?? SINGLE_SERIES.has(type), limit: cfg.limit || 0,
  });

  if (SINGLE_SERIES.has(type)) {
    const data = g.categories.map((c, i) => ({ name: c, value: g.series[0]?.data[i] ?? 0 }));
    if (type === 'treemap') return treemapOption(data, colors);
    if (type === 'funnel') return funnelOption(data, colors);
    return pieOption(data, colors, type === 'doughnut');
  }

  // Cartesian: column / bar / line / area
  const isBar = type === 'bar';
  const isLineish = type === 'line' || type === 'area';
  const showLegend = g.series.length > 1;
  const longLabels = g.categories.some((c) => String(c).length > 8) && g.categories.length > 6;

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
    xAxis: isBar ? valAxis() : catAxis(g.categories, longLabels ? 32 : 0),
    yAxis: isBar ? catAxis(g.categories) : valAxis(),
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
function funnelOption(data, colors) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return { color: colors, tooltip: tooltipCfg('item'), legend: legendCfg(true),
    series: [{ type: 'funnel', left: '8%', right: '8%', top: 40, bottom: 8, minSize: '14%', gap: 2,
      label: { color: '#fff', fontSize: 12, fontWeight: 600 }, labelLine: { show: false },
      itemStyle: { borderColor: readVar('--ap-surface') || '#fff', borderWidth: 1 }, data: sorted }] };
}
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
    yAxis: { ...valAxis(), name: m[1] },
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
    data: [{ value: Math.round(val) }] }] };
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

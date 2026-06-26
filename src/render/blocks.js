// Renders an individual body block (stat card, chart card, or text) into a DOM node.
// Charts are mounted in a second pass (mountCharts) once the node is in the document and
// has a measurable size.

import { el, fromHTML, fmtNumber, interpolate } from '../util.js';
import { icon, chartIcon, EMPTY_ART } from '../assets/icons.js';
import { computeKpi, sparkSeries, AGGREGATIONS } from '../stats/aggregate.js';
import { renderChart } from '../charts/echarts-adapter.js';
import { getChartType } from '../charts/catalog.js';
import { readVar } from '../theme/apply.js';
import { renderBreakdown } from './breakdown.js';
import { buildMapCard } from './map.js';

function blockData(block, ctx) {
  const table = block.config?.table || ctx.config?.dataTable;
  return { table, columns: ctx.provider.columns(table), rows: ctx.provider.records(table) };
}
const aggLabel = (id) => AGGREGATIONS.find((a) => a.id === id)?.label || 'Sum';
const colLabel = (cols, id) => cols.find((c) => c.id === id)?.label || id;

// A breakdown shown as a chart = a count-by-category chart over its column.
function breakdownAsChart(block) {
  const c = block.config || {};
  return { id: block.id, span: block.span, type: 'chart', config: {
    table: c.table, title: c.title, subtitle: c.subtitle, chartType: c.chartType || 'doughnut',
    dims: [c.column], measures: [], agg: 'count', sortByValue: true, limit: c.limit, colors: c.colors } };
}

export function renderBlock(block, ctx) {
  let inner;
  if (block.type === 'stat') inner = renderStat(block, ctx);
  else if (block.type === 'text') inner = renderText(block, ctx);
  else if (block.type === 'breakdown') inner = (block.config?.display === 'chart')
    ? renderChartCard(breakdownAsChart(block), ctx) : renderBreakdown(block, ctx);
  else if (block.type === 'map') inner = buildMapCard(block, ctx);
  else inner = renderChartCard(block, ctx);

  const wrap = el('div', { class: 'ap-block', dataset: { span: String(block.span || 12), blockId: block.id } }, [inner]);

  if (ctx.edit?.active) {
    inner.classList.add('ap-editable');
    inner.append(el('span', { class: 'ap-edit-tag', text: block.type }));
    wrap.append(el('div', { class: 'ap-block__tools' }, [
      btn('grip', 'Drag to reorder', 'ap-drag-handle', null),
      btn('edit', 'Edit', '', (e) => { e.stopPropagation(); ctx.edit.onEditBlock?.(block.id); }),
      btn('trash', 'Delete', 'ap-btn--danger', (e) => { e.stopPropagation(); ctx.edit.onDeleteBlock?.(block.id); }),
    ]));
    inner.addEventListener('click', () => ctx.edit.onEditBlock?.(block.id));
  }
  return wrap;
}
function btn(ic, title, cls, on) {
  const b = el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ' + (cls || ''), title, 'aria-label': title }, [icon(ic)]);
  if (on) b.addEventListener('click', on); return b;
}

function renderStat(block, ctx) {
  const c = block.config || {};
  const { rows } = blockData(block, ctx);
  const { value, delta } = computeKpi(rows, { column: c.column, agg: c.agg || 'sum', deltaBy: c.deltaBy });
  const spark = sparkSeries(rows, { column: c.column, deltaBy: c.deltaBy, agg: c.agg || 'sum' });
  const card = el('div', { class: 'ap-card ap-stat', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-stat__head' }, [
      el('div', {}, [
        el('div', { class: 'ap-stat__label', text: c.label || c.column || 'Metric' }),
        el('div', { class: 'ap-stat__value', text: fmtNumber(value, c.format || { compact: true }) }),
      ]),
      el('div', { class: 'ap-stat__icon' }, [
        c.iconData ? el('img', { src: c.iconData, alt: '', style: { width: '21px', height: '21px', objectFit: 'contain' } }) : icon(c.icon || 'pulse'),
      ]),
    ]),
  ]);
  if (delta != null) {
    const up = delta >= 0;
    card.append(el('div', { class: 'ap-stat__delta ' + (up ? 'ap-stat__delta--up' : 'ap-stat__delta--down') }, [
      icon(up ? 'arrowUp' : 'arrowDown'), `${up ? '+' : ''}${delta}%`, el('span', { class: 'ap-muted', text: ' vs prev. period' }),
    ]));
  }
  if (spark.length > 1) card.append(sparkline(spark));
  return card;
}

function sparkline(data) {
  const w = 280, h = 36, min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const col = readVar('--ap-primary') || '#6d5efc';
  return fromHTML(`<svg class="ap-stat__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${area}" fill="${col}" opacity="0.10"/>
    <path d="${line}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/></svg>`);
}

function renderChartCard(block, ctx) {
  const c = block.config || {};
  const { columns, rows, table } = blockData(block, ctx);
  const dimNames = (c.dims || []).map((d) => colLabel(columns, d)).join(' · ');
  const meaNames = (c.measures || []).map((m) => colLabel(columns, m)).join(', ');
  const auto = c.chartType === 'scatter'
    ? `${meaNames}` : `${aggLabel(c.agg)} of ${meaNames || '—'}${dimNames ? ' by ' + dimNames : ''}`;
  const dim0 = (c.dims || [])[0];
  const groups = dim0 ? new Set(rows.map((r) => (r[dim0] == null ? '' : String(r[dim0])))).size : 0;
  const m0 = (c.measures || [])[0];
  const total = Math.round(m0 ? rows.reduce((s, r) => s + (parseFloat(r[m0]) || 0), 0) : rows.length);
  const sub = c.subtitle ? interpolate(c.subtitle, { count: rows.length, groups, total }) : auto;

  const head = el('div', { class: 'ap-chartcard__head' }, [
    el('div', {}, [ el('div', { class: 'ap-chartcard__title', text: c.title || 'Chart' }),
      el('div', { class: 'ap-chartcard__sub', text: sub }) ]),
    el('span', { class: 'ap-chip' }, [ chartIcon(c.chartType || 'column'),
      el('span', { text: getChartType(c.chartType).label }) ]),
  ]);
  const chartEl = el('div', { class: 'ap-chart' });

  const card = el('div', { class: 'ap-card ap-chartcard', dataset: { blockId: block.id } }, [head]);
  if (!rows.length) card.append(el('div', { class: 'ap-empty' }, [ fromHTML(EMPTY_ART), el('div', { text: 'No data to display yet.' }) ]));
  else { card.append(chartEl); chartEl._apChart = { block, ctx: { rows, columns, table } }; }
  return card;
}

function renderText(block, ctx) {
  const c = block.config || {};
  return el('div', { class: 'ap-card ap-textblock', dataset: { blockId: block.id } }, [
    c.heading ? el('h2', { text: c.heading }) : null,
    el('div', { class: 'ap-richtext', html: c.html || '' }),
  ]);
}

// Mount charts that were deferred during DOM build.
export function mountCharts(scope) {
  (scope || document).querySelectorAll('.ap-chart, .ap-preview__chart').forEach((c) => {
    if (c._apChart) { const { block, ctx } = c._apChart; renderChart(c, block, ctx); }
  });
}

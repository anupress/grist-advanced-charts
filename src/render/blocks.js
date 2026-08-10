// Renders an individual body block (stat card, chart card, or text) into a DOM node.
// Charts are mounted in a second pass (mountCharts) once the node is in the document and
// has a measurable size.

import { el, fromHTML, fmtNumber, interpolate, clamp } from '../util.js';
import { icon, chartIcon, EMPTY_ART } from '../assets/icons.js';
import { computeKpi, sparkSeries, aggregate, AGGREGATIONS } from '../stats/aggregate.js';
import { renderChart } from '../charts/echarts-adapter.js';
import { getChartType } from '../charts/catalog.js';
import { readVar } from '../theme/apply.js';
import { renderBreakdown } from './breakdown.js';
import { buildMapCard } from './map.js';
import { renderCounter } from './counter.js';
import { renderAccordion } from './accordion.js';
import { renderImage } from './image.js';
import { renderTestimonials } from './testimonials.js';
import { renderLiveTable } from './livetable.js';
import { renderEmbed } from './embed.js';
import { renderQRCode } from './qrcode.js';
import { renderCountdown } from './countdown.js';
import { renderTimeline } from './timeline.js';
import { renderPricing } from './pricing.js';

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
  else if (block.type === 'spacer') inner = renderSpacer(block);
  else if (block.type === 'button') inner = renderButton(block, ctx);
  else if (block.type === 'icon') inner = renderIconBlock(block, ctx);
  else if (block.type === 'progress') inner = renderProgressBlock(block, ctx);
  else if (block.type === 'counter') inner = renderCounter(block);
  else if (block.type === 'accordion') inner = renderAccordion(block, ctx);
  else if (block.type === 'image') inner = renderImage(block, ctx);
  else if (block.type === 'testimonials') inner = renderTestimonials(block, ctx);
  else if (block.type === 'livetable') inner = renderLiveTable(block, ctx);
  else if (block.type === 'embed') inner = renderEmbed(block);
  else if (block.type === 'qrcode') inner = renderQRCode(block);
  else if (block.type === 'countdown') inner = renderCountdown(block);
  else if (block.type === 'timeline') inner = renderTimeline(block);
  else if (block.type === 'divider') inner = renderDivider(block);
  else if (block.type === 'pricing') inner = renderPricing(block, ctx);
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

function renderSpacer(block) {
  const c = block.config || {};
  const h = clamp(Number(c.height) || 40, 4, 240);
  return el('div', { class: 'ap-spacer', dataset: { blockId: block.id }, style: { height: h + 'px' } });
}

function renderDivider(block) {
  const c = block.config || {};
  const style = ['solid', 'dashed', 'dotted'].includes(c.style) ? c.style : 'solid';
  const thickness = clamp(Number(c.thickness) || 1, 1, 10);
  return el('div', { class: 'ap-dividerblock', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-dividerblock__line', style: { borderTopStyle: style, borderTopColor: c.color || 'var(--ap-border)', borderTopWidth: thickness + 'px' } }),
  ]);
}

// Shared by Button and Icon: builds an <a> (external URL, target.newTab respected) or a
// <button> (jump to a page via ctx.onNav) wired up to `target`; null if no target is set, so
// the caller can fall back to a plain non-interactive element instead.
// ctx.edit is `null` only on a genuinely live (non-editing) page render (see site.js) — it's
// `undefined` in an editor-drawer preview and `{active:true,...}` while editing. In both of
// those non-live cases the real navigate/link-follow is suppressed and the click is left to
// bubble up to the block's own "open editor" listener instead — otherwise a click inside the
// editor's live preview, or on the real page while editing, could navigate this embedded
// widget's iframe away to an external URL.
function clickTarget(target, ctx, cls) {
  const isLivePage = ctx.edit === null;
  if (target?.kind === 'url' && target.url) {
    const node = el('a', { class: cls, href: target.url, target: target.newTab ? '_blank' : null, rel: target.newTab ? 'noopener noreferrer' : null });
    node.addEventListener('click', (e) => { if (!isLivePage) e.preventDefault(); });
    return node;
  }
  if (target?.kind === 'tab' && target.tab) {
    const node = el('button', { class: cls, type: 'button' });
    node.addEventListener('click', (e) => { if (!isLivePage) { e.preventDefault(); return; } ctx.onNav?.(target.tab); });
    return node;
  }
  return null;
}
const alignJustify = (a) => (a === 'center' ? 'center' : a === 'right' ? 'flex-end' : 'flex-start');

function renderButton(block, ctx) {
  const c = block.config || {};
  const cls = 'ap-btn' + (c.style === 'primary' ? ' ap-btn--primary' : c.style === 'soft' ? ' ap-btn--soft' : '');
  const node = clickTarget(c.target, ctx, cls) || el('span', { class: cls });
  node.textContent = c.label || 'Button';
  return el('div', { class: 'ap-card ap-buttonblock', dataset: { blockId: block.id }, style: { justifyContent: alignJustify(c.align) } }, [node]);
}

function renderIconBlock(block, ctx) {
  const c = block.config || {};
  const size = { s: 36, m: 52, l: 72 }[c.size] || 52;
  const glyphSize = Math.round(size * 0.46);
  const glyph = c.iconData
    ? el('img', { src: c.iconData, alt: '', style: { width: glyphSize + 'px', height: glyphSize + 'px', objectFit: 'contain' } })
    : icon(c.icon || 'sparkles');
  if (!c.iconData) Object.assign(glyph.style, { width: glyphSize + 'px', height: glyphSize + 'px' });
  const node = clickTarget(c.target, ctx, 'ap-iconblock__badge') || el('span', { class: 'ap-iconblock__badge' });
  Object.assign(node.style, { width: size + 'px', height: size + 'px', background: c.bg || 'var(--ap-grad)', color: c.color || '#fff' });
  node.append(glyph);
  return el('div', { class: 'ap-card ap-iconblock', dataset: { blockId: block.id }, style: { justifyContent: alignJustify(c.align) } }, [node]);
}

function renderProgressBlock(block, ctx) {
  const c = block.config || {};
  let value = Number(c.value) || 0;
  if (c.mode === 'data' && c.valueColumn) {
    const { rows } = blockData(block, ctx);
    value = aggregate(rows.map((r) => r[c.valueColumn]), c.agg || 'sum');
  }
  const target = Number(c.target) || 0;
  const pct = target > 0 ? clamp(Math.round((value / target) * 100), 0, 100) : 0;
  const suf = c.suffix ? ' ' + c.suffix : '';
  return el('div', { class: 'ap-card ap-progressblock', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-progressblock__head' }, [
      el('span', { class: 'ap-progressblock__title', text: c.title || 'Progress' }),
      el('span', { class: 'ap-progressblock__val', text: `${fmtNumber(value)}${suf} / ${fmtNumber(target)}${suf}` }),
    ]),
    el('div', { class: 'ap-progressblock__track' }, [
      el('div', { class: 'ap-progressblock__fill', style: { width: pct + '%', background: c.color || 'var(--ap-primary)' } }),
    ]),
    el('span', { class: 'ap-progressblock__pct', text: pct + '%' }),
  ]);
}

// Mount charts that were deferred during DOM build.
export function mountCharts(scope) {
  (scope || document).querySelectorAll('.ap-chart, .ap-preview__chart').forEach((c) => {
    if (c._apChart) { const { block, ctx } = c._apChart; renderChart(c, block, ctx); }
  });
}

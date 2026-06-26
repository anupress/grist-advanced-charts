// Drawer editors for the three block kinds. Charts get column pickers, type recommendations
// and a live preview that updates as you tweak. "Any column" can be used as a category or value.

import { el, clone, debounce } from '../util.js';
import { icon, chartIcon } from '../assets/icons.js';
import { openDrawer, closeDrawer, field, textInput, selectInput, checkboxRow, segmented, subhead, divider, primaryBtn, ghostBtn } from './ui.js';
import { CHART_TYPES, getChartType, CARTESIAN } from '../charts/catalog.js';
import { evaluateTypes, isMeasure, autoPick } from '../charts/recommend.js';
import { AGGREGATIONS } from '../stats/aggregate.js';
import { renderChart } from '../charts/echarts-adapter.js';
import { renderBlock, mountCharts } from '../render/blocks.js';
import { mountMaps, detectLatLon } from '../render/map.js';
import { currentSeriesColors } from '../theme/apply.js';
import { pickImage, readFileAsDataURL } from './imageutil.js';

const SPANS = [{ value: 3, label: 'XS' }, { value: 4, label: 'S' }, { value: 6, label: 'M' }, { value: 8, label: 'L' }, { value: 12, label: 'Full' }];
const STAT_ICONS = ['coins', 'cart', 'trending', 'users', 'pulse', 'target', 'star', 'database', 'globe', 'sparkles'];

const SUB_INFO = {
  chart: 'Type your own text, or use placeholders that fill in live:<br><code>%count</code> rows · <code>%groups</code> categories · <code>%total</code> sum of the value.',
  breakdown: 'Type your own text, or use placeholders:<br><code>%total</code> rows · <code>%groups</code> distinct values · <code>%top</code> top value · <code>%topcount</code> · <code>%empty</code>.',
  map: 'Type your own text, or use placeholders:<br><code>%count</code> mapped · <code>%missing</code> without coordinates · <code>%total</code> rows.',
};
function subtitleField(wb, kind, onChange, placeholder) {
  return field('Subtitle', textInput(wb.config.subtitle || '', (v) => { wb.config.subtitle = v; onChange(); }, { placeholder: placeholder || '' }), null, SUB_INFO[kind]);
}

export function openBlockEditor(block, ctx) {
  if (block.type === 'stat') return openStatEditor(block, ctx);
  if (block.type === 'text') return openTextEditor(block, ctx);
  if (block.type === 'breakdown') return openBreakdownEditor(block, ctx);
  if (block.type === 'map') return openMapEditor(block, ctx);
  return openChartEditor(block, ctx);
}

async function ensureRows(provider, table) {
  if (provider.isLive && !provider.records(table).length) { try { await provider.prime([table]); } catch {} }
  return provider.records(table);
}

// ---------------- Chart editor ----------------
function openChartEditor(block, ctx) {
  const wb = clone(block);
  wb.config = wb.config || {};
  const provider = ctx.provider;
  let table = wb.config.table || provider.defaultTable();
  wb.config.table = table;

  const dynHost = el('div'); // holds the parts that depend on table/columns
  const previewChart = el('div', { class: 'ap-preview__chart' });
  const preview = el('div', { class: 'ap-preview' }, [previewChart]);

  const refreshPreview = debounce(async () => {
    const rows = await ensureRows(provider, wb.config.table);
    const columns = provider.columns(wb.config.table);
    renderChart(previewChart, wb, { rows, columns, table: wb.config.table });
  }, 120);

  function rebuild() {
    const columns = provider.columns(wb.config.table);
    dynHost.replaceChildren(
      subhead('Categories  ·  the groups along the axis'),
      columnPicker(columns, wb.config.dims || [], (ids) => { wb.config.dims = ids; update(); }),
      subhead('Values  ·  the numbers to measure'),
      columnPicker(columns, wb.config.measures || [], (ids) => { wb.config.measures = ids; update(); }),
      field('Summarize values by', selectInput(AGGREGATIONS.map((a) => ({ value: a.id, label: a.label })), wb.config.agg || 'sum', (v) => { wb.config.agg = v; update(); })),
      subhead('Chart type'),
      typeGrid(columns),
      optionsBlock(),
      colorsBlock(),
    );
  }
  function update() { rebuild(); refreshPreview(); }

  function typeGrid(columns) {
    const evals = evaluateTypes(columns, { dims: wb.config.dims || [], measures: wb.config.measures || [] });
    const map = Object.fromEntries(evals.map((e) => [e.id, e]));
    const grid = el('div', { class: 'ap-typegrid' });
    for (const t of CHART_TYPES) {
      const ev = map[t.id] || {};
      const cell = el('button', { class: 'ap-typecell' + (wb.config.chartType === t.id ? ' is-active' : ''),
        disabled: !ev.enabled, title: t.label }, [chartIcon(t.icon), el('span', { text: t.label })]);
      if (ev.recommended) cell.append(el('span', { class: 'ap-rec-star', text: '★', title: 'Recommended' }));
      cell.addEventListener('click', () => { wb.config.chartType = t.id; update(); });
      grid.append(cell);
    }
    return grid;
  }

  function optionsBlock() {
    const type = wb.config.chartType;
    const box = el('div');
    if (CARTESIAN.has(type)) {
      box.append(checkboxRow('Stack series', wb.config.stacked, (v) => { wb.config.stacked = v; refreshPreview(); }));
      if (type === 'line' || type === 'area') box.append(checkboxRow('Smooth curve', wb.config.smooth !== false, (v) => { wb.config.smooth = v; refreshPreview(); }));
    }
    if (['bar', 'column', 'pie', 'doughnut', 'treemap', 'funnel'].includes(type))
      box.append(checkboxRow('Sort by value', wb.config.sortByValue, (v) => { wb.config.sortByValue = v; refreshPreview(); }));
    return box;
  }

  function colorsBlock() {
    const box = el('div', {}, [divider(), subhead('Colors')]);
    const custom = Array.isArray(wb.config.colors) && wb.config.colors.length > 0;
    box.append(checkboxRow('Use custom colors (override theme)', custom, (on) => {
      wb.config.colors = on ? currentSeriesColors().slice(0, 6) : null;
      rebuild(); refreshPreview();
    }));
    if (custom) {
      const row = el('div', { class: 'ap-row', style: { flexWrap: 'wrap' } });
      wb.config.colors.forEach((c, i) => {
        const inp = el('input', { type: 'color', class: 'ap-input-color', value: c });
        inp.addEventListener('input', () => { wb.config.colors[i] = inp.value; refreshPreview(); });
        row.append(inp);
      });
      box.append(row);
    }
    return box;
  }

  const body = [
    field('Title', textInput(wb.config.title || '', (v) => { wb.config.title = v; }, { placeholder: 'Chart title' })),
    subtitleField(wb, 'chart', () => {}, 'Auto, or e.g. %count rows across %groups groups'),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      (v) => { wb.config.table = v; const cols = provider.columns(v); Object.assign(wb.config, autoPick(cols)); ensureRows(provider, v).then(update); })),
    dynHost,
    field('Block width', segmented(SPANS, wb.span || 6, (v) => { wb.span = v; })),
    subhead('Live preview'),
    preview,
  ];
  const footer = [
    ghostBtn('Cancel', () => closeDrawer()),
    primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); }),
  ];
  openDrawer({ title: block.__isNew ? 'Add chart' : 'Edit chart', body, footer });
  rebuild();
  refreshPreview();
}

function columnPicker(columns, selected, onToggle) {
  const sel = new Set(selected);
  const list = el('div', { class: 'ap-collist' });
  for (const c of columns) {
    const pill = el('button', { class: 'ap-colpill' + (sel.has(c.id) ? ' is-on' : ''), dataset: { id: c.id } }, [
      icon(sel.has(c.id) ? 'check' : 'plus'),
      el('span', { text: c.label || c.id }),
      el('span', { class: 'ap-coltype', text: shortType(c.type) }),
    ]);
    pill.addEventListener('click', () => {
      if (sel.has(c.id)) sel.delete(c.id); else sel.add(c.id);
      onToggle([...columns.filter((x) => sel.has(x.id)).map((x) => x.id)]);
    });
    list.append(pill);
  }
  if (!columns.length) list.append(el('div', { class: 'ap-muted', text: 'No columns in this table.' }));
  return list;
}
const shortType = (t) => /int|numeric|number|currency/i.test(t) ? '#' : /date|time/i.test(t) ? '📅' : 'Abc';

// ---------------- Stat editor ----------------
function openStatEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });

  const refreshPreview = debounce(async () => {
    await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: { dataTable: wb.config.table } }));
  }, 100);

  function iconPicker() {
    const site = ctx.site || {};
    site.customIcons = site.customIcons || [];
    const wrap = el('div', { class: 'ap-row', style: { flexWrap: 'wrap', gap: '6px' } });
    const rebuild = () => {
      wrap.replaceChildren();
      STAT_ICONS.forEach((name) => {
        const active = !wb.config.iconData && wb.config.icon === name;
        const chip = el('button', { class: 'ap-chip' + (active ? ' is-active' : ''), title: name }, [icon(name)]);
        chip.addEventListener('click', () => { wb.config.icon = name; wb.config.iconData = null; rebuild(); refreshPreview(); });
        wrap.append(chip);
      });
      site.customIcons.forEach((data) => {
        const chip = el('button', { class: 'ap-chip' + (wb.config.iconData === data ? ' is-active' : ''), title: 'Custom icon' },
          [el('img', { src: data, alt: '', style: { width: '16px', height: '16px', objectFit: 'contain' } })]);
        chip.addEventListener('click', () => { wb.config.iconData = data; rebuild(); refreshPreview(); });
        wrap.append(chip);
      });
      const up = el('button', { class: 'ap-chip', title: 'Upload your own icon' }, [icon('plus'), 'Upload']);
      up.addEventListener('click', () => pickImage(async (f) => {
        const data = await readFileAsDataURL(f, 128);
        if (!site.customIcons.includes(data)) site.customIcons.push(data);
        wb.config.iconData = data; rebuild(); refreshPreview();
      }));
      wrap.append(up);
    };
    rebuild();
    return wrap;
  }

  // Table-dependent fields, rebuilt whenever the table changes.
  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    if (cols.length && !cols.find((c) => c.id === wb.config.column)) wb.config.column = cols[0].id;
    dynHost.replaceChildren(
      field('Value column',
        selectInput(cols.map((c) => ({ value: c.id, label: c.label + (isMeasure(c) ? '' : '  (text)') })), wb.config.column, (v) => {
          wb.config.column = v;
          const c = cols.find((x) => x.id === v);
          if (c && !isMeasure(c) && !['count', 'countd'].includes(wb.config.agg)) wb.config.agg = 'count';
          buildDyn(); refreshPreview();
        }),
        'Sum / Average need a number column. Count and Distinct count work on any column.'),
      field('Summarize by', selectInput(AGGREGATIONS.map((a) => ({ value: a.id, label: a.label })), wb.config.agg || 'sum', (v) => { wb.config.agg = v; refreshPreview(); })),
      field('Compare over (optional)', selectInput([{ value: '', label: '— none —' }].concat(cols.map((c) => ({ value: c.id, label: c.label }))), wb.config.deltaBy || '', (v) => { wb.config.deltaBy = v || null; refreshPreview(); })),
    );
  }

  const body = [
    field('Label', textInput(wb.config.label || '', (v) => { wb.config.label = v; refreshPreview(); }, { placeholder: 'e.g. Total samples' })),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    subhead('Icon'), iconPicker(),
    subhead('Number format'),
    checkboxRow('Compact (1.2K, 3.4M)', wb.config.format?.compact, (v) => { wb.config.format = { ...wb.config.format, compact: v }; refreshPreview(); }),
    field('Currency symbol', textInput(wb.config.format?.currency || '', (v) => { wb.config.format = { ...wb.config.format, currency: v }; refreshPreview(); }, { placeholder: 'e.g. $' })),
    field('Block width', segmented(SPANS, wb.span || 3, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  buildDyn();
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add stat' : 'Edit stat', body, footer });
  refreshPreview();
}

// ---------------- Text editor ----------------
function openTextEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const body = [
    field('Heading', textInput(wb.config.heading || '', (v) => { wb.config.heading = v; }, { placeholder: 'Section heading' })),
    field('Body (basic HTML allowed)', textInput(wb.config.html || '', (v) => { wb.config.html = v; }, { textarea: true, placeholder: 'Write something friendly…' })),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add text' : 'Edit text', body, footer });
}

// ---------------- Breakdown editor ----------------
function openBreakdownEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: { dataTable: wb.config.table } }));
    mountCharts(previewHost);
  }, 100);

  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    if (cols.length && !cols.find((c) => c.id === wb.config.column)) wb.config.column = cols[0].id;
    dynHost.replaceChildren(
      field('Group by column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.column, (v) => { wb.config.column = v; refreshPreview(); })),
      field('Max rows shown', textInput(String(wb.config.limit || 12), (v) => { wb.config.limit = Math.max(3, Math.min(40, Number(v) || 12)); refreshPreview(); }, { type: 'number' })),
    );
  }

  const showAs = () => (wb.config.display === 'chart' ? (wb.config.chartType || 'doughnut') : 'list');
  const body = [
    field('Title', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Individual Sex' })),
    subtitleField(wb, 'breakdown', refreshPreview, 'e.g. %groups groups · top: %top'),
    field('Show as', segmented([
      { value: 'list', label: 'List' }, { value: 'doughnut', label: 'Donut' }, { value: 'pie', label: 'Pie' },
      { value: 'bar', label: 'Bar' }, { value: 'column', label: 'Column' },
    ], showAs(), (v) => { if (v === 'list') wb.config.display = 'list'; else { wb.config.display = 'chart'; wb.config.chartType = v; } refreshPreview(); })),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    field('Block width', segmented(SPANS, wb.span || 4, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  buildDyn();
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add breakdown' : 'Edit breakdown', body, footer });
  refreshPreview();
}

// ---------------- Map editor ----------------
function openMapEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: { dataTable: wb.config.table } }));
    mountMaps(previewHost);
  }, 200);

  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    const det = detectLatLon(cols);
    if (!wb.config.latColumn) wb.config.latColumn = det.lat || (cols[0]?.id || '');
    if (!wb.config.lonColumn) wb.config.lonColumn = det.lon || (cols[1]?.id || '');
    const opts = cols.map((c) => ({ value: c.id, label: c.label }));
    const optional = (label) => [{ value: '', label }].concat(opts);
    const pc = wb.config.popupColumns || [];
    const tip = [pc[0] || '', pc[1] || '', pc[2] || '', pc[3] || ''];
    const setTip = (i, v) => { tip[i] = v; wb.config.popupColumns = tip.filter(Boolean); refreshPreview(); };
    dynHost.replaceChildren(
      field('Latitude column', selectInput(opts, wb.config.latColumn, (v) => { wb.config.latColumn = v; refreshPreview(); })),
      field('Longitude column', selectInput(opts, wb.config.lonColumn, (v) => { wb.config.lonColumn = v; refreshPreview(); })),
      field('Popup title (optional)', selectInput(optional('— none —'), wb.config.labelColumn || '', (v) => { wb.config.labelColumn = v || null; refreshPreview(); })),
      field('Color points by (optional)', selectInput(optional('— single color —'), wb.config.colorBy || '', (v) => { wb.config.colorBy = v || null; refreshPreview(); })),
      subhead('Tooltip fields (optional)'),
      field('Tooltip field 1', selectInput(optional('— none —'), tip[0], (v) => setTip(0, v))),
      field('Tooltip field 2', selectInput(optional('— none —'), tip[1], (v) => setTip(1, v))),
      field('Tooltip field 3', selectInput(optional('— none —'), tip[2], (v) => setTip(2, v))),
      field('Tooltip field 4', selectInput(optional('— none —'), tip[3], (v) => setTip(3, v))),
    );
  }

  const body = [
    field('Title', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'Map' })),
    subtitleField(wb, 'map', refreshPreview, 'e.g. %count mapped · %missing without coordinates'),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  buildDyn();
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add map' : 'Edit map', body, footer });
  refreshPreview();
}

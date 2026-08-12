// Drawer editors for the three block kinds. Charts get column pickers, type recommendations
// and a live preview that updates as you tweak. "Any column" can be used as a category or value.

import { el, clone, debounce } from '../util.js';
import { icon, chartIcon } from '../assets/icons.js';
import { openDrawer, closeDrawer, field, textInput, selectInput, checkboxRow, segmented, subhead, divider, primaryBtn, ghostBtn, iconPickerField, linkTargetField, colorInput } from './ui.js';
import { CHART_TYPES, getChartType, CARTESIAN } from '../charts/catalog.js';
import { evaluateTypes, isMeasure, autoPick } from '../charts/recommend.js';
import { AGGREGATIONS, autoDeltaColumn } from '../stats/aggregate.js';
import { renderChart } from '../charts/echarts-adapter.js';
import { renderBlock, mountCharts } from '../render/blocks.js';
import { mountMaps, detectLatLon } from '../render/map.js';
import { mountCounters } from '../render/counter.js';
import { mountAttachmentImages } from '../render/media-mount.js';
import { mountCountdowns } from '../render/countdown.js';
import { currentSeriesColors } from '../theme/apply.js';
import { pickImage, readFileAsDataURL } from './imageutil.js';

const SPANS = [{ value: 3, label: 'XS' }, { value: 4, label: 'S' }, { value: 6, label: 'M' }, { value: 8, label: 'L' }, { value: 12, label: 'Full' }];

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
  if (block.type === 'spacer') return openSpacerEditor(block, ctx);
  if (block.type === 'button') return openButtonEditor(block, ctx);
  if (block.type === 'icon') return openIconEditor(block, ctx);
  if (block.type === 'progress') return openProgressEditor(block, ctx);
  if (block.type === 'counter') return openCounterEditor(block, ctx);
  if (block.type === 'accordion') return openAccordionEditor(block, ctx);
  if (block.type === 'image') return openImageEditor(block, ctx);
  if (block.type === 'testimonials') return openTestimonialsEditor(block, ctx);
  if (block.type === 'livetable') return openLiveTableEditor(block, ctx);
  if (block.type === 'embed') return openEmbedEditor(block, ctx);
  if (block.type === 'qrcode') return openQRCodeEditor(block, ctx);
  if (block.type === 'countdown') return openCountdownEditor(block, ctx);
  if (block.type === 'timeline') return openTimelineEditor(block, ctx);
  if (block.type === 'divider') return openDividerEditor(block, ctx);
  if (block.type === 'pricing') return openPricingEditor(block, ctx);
  if (block.type === 'calendar') return openCalendarEditor(block, ctx);
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

  // Table-dependent fields, rebuilt whenever the table changes.
  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    if (cols.length && !cols.find((c) => c.id === wb.config.column)) wb.config.column = cols[0].id;
    // Repointing the stat at another table used to leave deltaBy on the OLD table's column, which
    // killed the sparkline with no hint why. Drop it back to automatic instead.
    if (wb.config.deltaBy && !cols.some((c) => c.id === wb.config.deltaBy)) delete wb.config.deltaBy;
    const autoCol = autoDeltaColumn(cols);
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
      // Tri-state (see resolveDeltaBy in stats/aggregate.js): '__auto' leaves the key unset so a
      // date column is picked for you, '' stores an explicit null meaning "no trend, on purpose",
      // and a column id pins it. The auto label names the column it landed on, so the choice is
      // never a mystery.
      field('Trend & sparkline',
        selectInput(
          [{ value: '__auto', label: autoCol ? `Automatic — ${cols.find((c) => c.id === autoCol)?.label || autoCol}` : 'Automatic — no date column found' },
            { value: '', label: '— none —' }].concat(cols.map((c) => ({ value: c.id, label: c.label }))),
          wb.config.deltaBy === undefined ? '__auto' : (wb.config.deltaBy || ''),
          (v) => {
            if (v === '__auto') delete wb.config.deltaBy;
            else wb.config.deltaBy = v || null;
            refreshPreview();
          }),
        'The little wave and the "vs prev. period" figure under the number. Automatic uses the table\'s date column.'),
    );
  }

  const body = [
    field('Label', textInput(wb.config.label || '', (v) => { wb.config.label = v; refreshPreview(); }, { placeholder: 'e.g. Total samples' })),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    subhead('Icon'), iconPickerField(ctx.site || {}, wb.config, refreshPreview),
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
    // Street and Terrain ship built in. A satellite layer does not, because no free global aerial
    // imagery permits redistribution without an account — so instead of hotlinking someone else's
    // servers against their terms, the block takes a tile URL from whoever holds the licence.
    subhead('Extra map layer (optional)'),
    el('p', { class: 'ap-muted', style: { margin: '0 0 10px', fontSize: '12px' } }, [
      'Street and Terrain are included. To add satellite or any other basemap, paste a tile URL '
      + 'from a provider you have an account with (ArcGIS, MapTiler, Mapbox, Stadia, or your own '
      + 'server) along with the credit line they require.',
    ]),
    field('Tile URL', textInput(wb.config.tileUrl || '', (v) => { wb.config.tileUrl = v.trim(); refreshPreview(); },
      { placeholder: 'https://…/{z}/{x}/{y}.png' })),
    twoUp(
      field('Layer name', textInput(wb.config.tileLabel || '', (v) => { wb.config.tileLabel = v; refreshPreview(); }, { placeholder: 'Satellite' })),
      field('Max zoom', textInput(wb.config.tileMaxZoom || '', (v) => { wb.config.tileMaxZoom = v; refreshPreview(); }, { placeholder: '19' })),
    ),
    field('Attribution', textInput(wb.config.tileAttribution || '', (v) => { wb.config.tileAttribution = v; refreshPreview(); },
      { placeholder: 'e.g. Tiles © Esri' })),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  buildDyn();
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add map' : 'Edit map', body, footer });
  refreshPreview();
}

// Two fields side by side (e.g. Start/End, Prefix/Suffix).
function twoUp(a, b) {
  return el('div', { class: 'ap-row', style: { alignItems: 'flex-start' } }, [
    el('div', { style: { flex: '1' } }, [a]),
    el('div', { style: { flex: '1' } }, [b]),
  ]);
}
function iconBtn(ic, title, on, extra = '') {
  return el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ' + extra, title, 'aria-label': title, onClick: on }, [icon(ic)]);
}
function colorField(labelText, value, fallback, onChange) {
  return el('div', {}, [el('label', { class: 'ap-label', text: labelText }), colorInput(value || fallback, onChange)]);
}

// ---------------- Spacer editor ----------------
function openSpacerEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = () => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); };
  const body = [
    field('Height (pixels)', textInput(String(wb.config.height ?? 40), (v) => { wb.config.height = Math.max(4, Math.min(240, Number(v) || 40)); refreshPreview(); }, { type: 'number' }),
      'Empty vertical space between other elements.'),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add spacer' : 'Edit spacer', body, footer });
  refreshPreview();
}

// ---------------- Button editor ----------------
function openButtonEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.target = wb.config.target || { kind: null, tab: null, url: null, newTab: true };
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 100);
  const body = [
    field('Label', textInput(wb.config.label || '', (v) => { wb.config.label = v; refreshPreview(); }, { placeholder: 'e.g. Get started' })),
    field('Style', segmented([{ value: 'primary', label: 'Primary' }, { value: 'soft', label: 'Soft' }, { value: 'outline', label: 'Outline' }], wb.config.style || 'primary', (v) => { wb.config.style = v; refreshPreview(); })),
    field('Alignment', segmented([{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], wb.config.align || 'left', (v) => { wb.config.align = v; refreshPreview(); })),
    field('Link', linkTargetField(wb.config.target, ctx.site?.tabs, refreshPreview)),
    field('Block width', segmented(SPANS, wb.span || 3, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add button' : 'Edit button', body, footer });
  refreshPreview();
}

// ---------------- Icon editor ----------------
function openIconEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.target = wb.config.target || { kind: null, tab: null, url: null, newTab: true };
  const site = ctx.site || {};
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 100);
  const body = [
    subhead('Icon'), iconPickerField(site, wb.config, refreshPreview),
    field('Size', segmented([{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }], wb.config.size || 'm', (v) => { wb.config.size = v; refreshPreview(); })),
    twoUp(
      colorField('Icon color', wb.config.color, '#ffffff', (v) => { wb.config.color = v; refreshPreview(); }),
      colorField('Background', wb.config.bg, '#6d5efc', (v) => { wb.config.bg = v; refreshPreview(); }),
    ),
    field('Alignment', segmented([{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], wb.config.align || 'left', (v) => { wb.config.align = v; refreshPreview(); })),
    field('Link (optional)', linkTargetField(wb.config.target, site.tabs, refreshPreview)),
    field('Block width', segmented(SPANS, wb.span || 3, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add icon' : 'Edit icon', body, footer });
  refreshPreview();
}

// ---------------- Progress bar editor ----------------
function openProgressEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    if (wb.config.mode === 'data') await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: { dataTable: wb.config.table } }));
  }, 100);

  const dynHost = el('div');
  function buildDyn() {
    if (wb.config.mode === 'data') {
      const cols = provider.columns(wb.config.table);
      if (cols.length && !cols.find((c) => c.id === wb.config.valueColumn)) wb.config.valueColumn = cols[0].id;
      dynHost.replaceChildren(
        field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
          async (v) => { wb.config.table = v; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
        field('Value column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.valueColumn, (v) => { wb.config.valueColumn = v; refreshPreview(); })),
        field('Summarize by', selectInput(AGGREGATIONS.map((a) => ({ value: a.id, label: a.label })), wb.config.agg || 'sum', (v) => { wb.config.agg = v; refreshPreview(); })),
      );
    } else {
      dynHost.replaceChildren(
        field('Current value', textInput(String(wb.config.value ?? 0), (v) => { wb.config.value = Number(v) || 0; refreshPreview(); }, { type: 'number' })),
      );
    }
  }

  const body = [
    field('Title', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Fundraising goal' })),
    field('Value comes from', segmented([{ value: 'manual', label: 'Type a number' }, { value: 'data', label: 'From my data' }], wb.config.mode || 'manual', (v) => { wb.config.mode = v; buildDyn(); refreshPreview(); })),
    dynHost,
    field('Target (goal)', textInput(String(wb.config.target ?? 100), (v) => { wb.config.target = Number(v) || 0; refreshPreview(); }, { type: 'number' })),
    // Two fields, not one: a currency symbol has to lead the number and a unit has to follow it.
    field('Prefix (optional)', textInput(wb.config.prefix || '', (v) => { wb.config.prefix = v; refreshPreview(); }, { placeholder: 'e.g. $, £ — goes before the number' })),
    field('Suffix (optional)', textInput(wb.config.suffix || '', (v) => { wb.config.suffix = v; refreshPreview(); }, { placeholder: 'e.g. signups, hrs — goes after' })),
    colorField('Bar color', wb.config.color, '#6d5efc', (v) => { wb.config.color = v; refreshPreview(); }),
    field('Block width', segmented(SPANS, wb.span || 4, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  buildDyn();
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add progress bar' : 'Edit progress bar', body, footer });
  refreshPreview();
}

// ---------------- Counter editor ----------------
function openCounterEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => {
    previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} }));
    mountCounters(previewHost);
  }, 150);
  const body = [
    field('Label', textInput(wb.config.label || '', (v) => { wb.config.label = v; refreshPreview(); }, { placeholder: 'e.g. Happy customers' })),
    twoUp(
      field('Start number', textInput(String(wb.config.start ?? 0), (v) => { wb.config.start = Number(v) || 0; refreshPreview(); }, { type: 'number' })),
      field('End number', textInput(String(wb.config.end ?? 100), (v) => { wb.config.end = Number(v) || 0; refreshPreview(); }, { type: 'number' })),
    ),
    twoUp(
      field('Prefix', textInput(wb.config.prefix || '', (v) => { wb.config.prefix = v; refreshPreview(); }, { placeholder: 'e.g. $' })),
      field('Suffix', textInput(wb.config.suffix || '', (v) => { wb.config.suffix = v; refreshPreview(); }, { placeholder: 'e.g. +, %' })),
    ),
    field('Decimal places', textInput(String(wb.config.decimals ?? 0), (v) => { wb.config.decimals = Math.max(0, Math.min(4, Number(v) || 0)); refreshPreview(); }, { type: 'number' })),
    field('Animation length (ms)', textInput(String(wb.config.duration ?? 1400), (v) => { wb.config.duration = Math.max(200, Number(v) || 1400); refreshPreview(); }, { type: 'number' }),
      'How long the count-up takes once it scrolls into view.'),
    subhead('Icon (optional)'), iconPickerField(ctx.site || {}, wb.config, refreshPreview),
    field('Block width', segmented(SPANS, wb.span || 3, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add counter' : 'Edit counter', body, footer });
  refreshPreview();
}

// ---------------- Accordion editor ----------------
function openAccordionEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.items = wb.config.items?.length ? wb.config.items : [{ q: 'Question one', a: 'Answer goes here.' }];
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 100);

  const itemsHost = el('div');
  function renderItems() {
    itemsHost.replaceChildren(subhead('Questions & answers'));
    wb.config.items.forEach((it, i) => {
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          textInput(it.q || '', (v) => { it.q = v; refreshPreview(); }, { placeholder: 'Question' }),
          textInput(it.a || '', (v) => { it.a = v; refreshPreview(); }, { textarea: true, placeholder: 'Answer' }),
        ]),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          i > 0 ? iconBtn('arrowUp', 'Move up', () => swap(i, i - 1)) : null,
          i < wb.config.items.length - 1 ? iconBtn('arrowDown', 'Move down', () => swap(i, i + 1)) : null,
          wb.config.items.length > 1 ? iconBtn('trash', 'Remove', () => { wb.config.items.splice(i, 1); renderItems(); refreshPreview(); }, 'ap-btn--danger') : null,
        ]),
      ]);
      itemsHost.append(row);
    });
    itemsHost.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: addItem }, [icon('plus'), 'Add question']));
  }
  function swap(a, b) { const it = wb.config.items; [it[a], it[b]] = [it[b], it[a]]; renderItems(); refreshPreview(); }
  function addItem() { wb.config.items.push({ q: '', a: '' }); renderItems(); refreshPreview(); }
  renderItems();

  const body = [
    field('Title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Frequently asked questions' })),
    checkboxRow('First question open by default', wb.config.openFirst !== false, (v) => { wb.config.openFirst = v; refreshPreview(); }),
    divider(), itemsHost,
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add accordion' : 'Edit accordion', body, footer });
  refreshPreview();
}

// ---------------- Image editor ----------------
function openImageEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.mode = wb.config.mode || 'upload';
  wb.config.ref = wb.config.ref || { table: null, column: null, row: null };
  wb.config.link = wb.config.link || { kind: null, tab: null, url: null, newTab: true };
  const provider = ctx.provider;
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    if (wb.config.mode === 'attachment' && wb.config.ref.table) await ensureRows(provider, wb.config.ref.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: {} }));
    mountAttachmentImages(previewHost);
  }, 150);

  const dynHost = el('div');
  function buildDyn() {
    if (wb.config.mode === 'upload') {
      dynHost.replaceChildren(
        el('div', { class: 'ap-row' }, [
          el('button', { class: 'ap-btn ap-btn--soft', onClick: () => pickImage(async (f) => {
            wb.config.imageData = await readFileAsDataURL(f, 1600); buildDyn(); refreshPreview();
          }) }, [icon('image'), wb.config.imageData ? 'Replace image' : 'Upload image']),
          wb.config.imageData ? el('button', { class: 'ap-btn ap-btn--ghost ap-btn--danger', onClick: () => { wb.config.imageData = null; buildDyn(); refreshPreview(); } }, [icon('trash'), 'Remove']) : null,
        ]),
      );
      return;
    }
    // Attachment mode — table/column/row all need to be picked; only tables with a real Grist
    // Attachments column are usable (see bridge.js's resolveAttachmentCell for the cell shape).
    const tables = provider.tables();
    if (!wb.config.ref.table) wb.config.ref.table = tables[0]?.id || null;
    const cols = provider.columns(wb.config.ref.table).filter((c) => /attach/i.test(c.type));
    if (cols.length && !cols.find((c) => c.id === wb.config.ref.column)) wb.config.ref.column = cols[0].id;
    const rows = provider.records(wb.config.ref.table);
    if (cols.length && rows.length && wb.config.ref.row == null) wb.config.ref.row = rows[0].id;
    dynHost.replaceChildren(
      field('Data table', selectInput(tables.map((t) => ({ value: t.id, label: t.label })), wb.config.ref.table,
        async (v) => { wb.config.ref.table = v; wb.config.ref.column = null; wb.config.ref.row = null; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
      !cols.length
        ? el('div', { class: 'ap-muted', style: { fontSize: '12px' }, text: 'This table has no Attachments column. Add one in Grist, or switch to "Upload my own image".' })
        : el('div', {}, [
            field('Attachment column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.ref.column, (v) => { wb.config.ref.column = v; refreshPreview(); })),
            field('Row', selectInput(rows.map((r) => ({ value: String(r.id), label: rowLabel(r, provider.columns(wb.config.ref.table)) })), String(wb.config.ref.row ?? ''), (v) => { wb.config.ref.row = Number(v); refreshPreview(); })),
          ]),
    );
  }

  const body = [
    field('Image source', segmented([{ value: 'upload', label: 'Upload my own' }, { value: 'attachment', label: 'From my Grist data' }], wb.config.mode, (v) => { wb.config.mode = v; buildDyn(); refreshPreview(); })),
    dynHost,
    field('Alt text (accessibility)', textInput(wb.config.alt || '', (v) => { wb.config.alt = v; }, { placeholder: 'Describe the image' })),
    field('Fit', segmented([{ value: 'cover', label: 'Fill & crop' }, { value: 'contain', label: 'Show whole image' }], wb.config.fit || 'cover', (v) => { wb.config.fit = v; refreshPreview(); })),
    field('Caption (optional)', textInput(wb.config.caption || '', (v) => { wb.config.caption = v; refreshPreview(); }, { placeholder: 'A short caption under the image' })),
    field('Link (optional)', linkTargetField(wb.config.link, ctx.site?.tabs, refreshPreview)),
    field('Block width', segmented(SPANS, wb.span || 6, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add image' : 'Edit image', body, footer });
  // Row records aren't guaranteed pre-loaded (unlike columns, which GristProvider.init() always
  // pre-fetches) — prime them before the first build so an existing attachment-mode image's row
  // picker isn't briefly empty.
  (async () => {
    if (wb.config.mode === 'attachment' && wb.config.ref.table) await ensureRows(provider, wb.config.ref.table);
    buildDyn();
    refreshPreview();
  })();
}

function rowLabel(row, cols) {
  const nameCol = cols.find((c) => /name|title|label/i.test(c.id) && !/attach/i.test(c.type));
  const val = nameCol ? row[nameCol.id] : null;
  return val != null && val !== '' ? String(val) : `Row ${row.id}`;
}

// ---------------- Testimonials editor ----------------
function openTestimonialsEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.mode = wb.config.mode || 'manual';
  wb.config.entries = wb.config.entries?.length ? wb.config.entries : [{ name: '', quote: '', rating: 5, photoData: null }];
  const provider = ctx.provider;
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    if (wb.config.mode === 'data' && wb.config.table) await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: {} }));
    mountAttachmentImages(previewHost);
  }, 150);

  const dynHost = el('div');
  function buildDyn() {
    if (wb.config.mode === 'manual') { dynHost.replaceChildren(manualEntriesEditor()); return; }
    const tables = provider.tables();
    if (!wb.config.table) wb.config.table = tables[0]?.id || null;
    const cols = provider.columns(wb.config.table);
    const attCols = cols.filter((c) => /attach/i.test(c.type));
    if (cols.length && !cols.find((c) => c.id === wb.config.nameColumn)) wb.config.nameColumn = cols[0].id;
    const optional = (label) => [{ value: '', label }].concat(cols.map((c) => ({ value: c.id, label: c.label })));
    dynHost.replaceChildren(
      field('Data table', selectInput(tables.map((t) => ({ value: t.id, label: t.label })), wb.config.table,
        async (v) => { wb.config.table = v; wb.config.nameColumn = null; wb.config.quoteColumn = null; wb.config.ratingColumn = null; wb.config.photoColumn = null; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
      field('Name column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.nameColumn, (v) => { wb.config.nameColumn = v; refreshPreview(); })),
      field('Quote column', selectInput(optional('— none —'), wb.config.quoteColumn || '', (v) => { wb.config.quoteColumn = v || null; refreshPreview(); })),
      field('Rating column (optional, 1–5)', selectInput(optional('— none —'), wb.config.ratingColumn || '', (v) => { wb.config.ratingColumn = v || null; refreshPreview(); })),
      attCols.length
        ? field('Photo column (optional)', selectInput([{ value: '', label: '— none —' }].concat(attCols.map((c) => ({ value: c.id, label: c.label }))), wb.config.photoColumn || '', (v) => { wb.config.photoColumn = v || null; refreshPreview(); }))
        : el('div', { class: 'ap-muted', style: { fontSize: '12px' }, text: 'No Attachments column in this table — photos will show as an initial instead.' }),
      field('Max testimonials shown', textInput(String(wb.config.limit || 6), (v) => { wb.config.limit = Math.max(1, Math.min(24, Number(v) || 6)); refreshPreview(); }, { type: 'number' })),
    );
  }

  function manualEntriesEditor() {
    const host = el('div', {}, [subhead('Testimonials')]);
    wb.config.entries.forEach((e, i) => {
      const avatarPreview = el('div', { style: { marginBottom: '6px' } }, [avatarThumb(e)]);
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          textInput(e.name || '', (v) => { e.name = v; refreshPreview(); }, { placeholder: 'Name' }),
          textInput(e.quote || '', (v) => { e.quote = v; refreshPreview(); }, { textarea: true, placeholder: 'What they said…' }),
          ratingPicker(e),
          avatarPreview,
          el('div', { class: 'ap-row' }, [
            el('button', { class: 'ap-btn ap-btn--soft ap-btn--sm', onClick: () => pickImage(async (f) => {
              e.photoData = await readFileAsDataURL(f, 200); avatarPreview.replaceChildren(avatarThumb(e)); refreshPreview();
            }) }, [icon('image'), e.photoData ? 'Replace photo' : 'Add photo']),
            e.photoData ? el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm ap-btn--danger', onClick: () => { e.photoData = null; avatarPreview.replaceChildren(avatarThumb(e)); refreshPreview(); } }, [icon('trash'), 'Remove']) : null,
          ]),
        ]),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          i > 0 ? iconBtn('arrowUp', 'Move up', () => swapEntry(i, i - 1)) : null,
          i < wb.config.entries.length - 1 ? iconBtn('arrowDown', 'Move down', () => swapEntry(i, i + 1)) : null,
          wb.config.entries.length > 1 ? iconBtn('trash', 'Remove', () => { wb.config.entries.splice(i, 1); buildDyn(); refreshPreview(); }, 'ap-btn--danger') : null,
        ]),
      ]);
      host.append(row);
    });
    host.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: () => { wb.config.entries.push({ name: '', quote: '', rating: 5, photoData: null }); buildDyn(); refreshPreview(); } }, [icon('plus'), 'Add testimonial']));
    return host;
  }
  function avatarThumb(e) {
    return e.photoData
      ? el('img', { src: e.photoData, alt: '', style: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' } })
      : el('div', { class: 'ap-muted', style: { fontSize: '12px' }, text: 'No photo (shows initial)' });
  }
  function ratingPicker(e) {
    const wrap = el('div', { class: 'ap-row', style: { gap: '3px' } });
    const rebuild = () => {
      wrap.replaceChildren();
      for (let i = 1; i <= 5; i++) {
        const b = el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm', title: `${i} star${i > 1 ? 's' : ''}`, style: { color: i <= (e.rating || 0) ? '#f5a524' : 'var(--ap-text-mute)' } }, [icon('star')]);
        b.addEventListener('click', () => { e.rating = i; rebuild(); refreshPreview(); });
        wrap.append(b);
      }
      const clear = el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', text: 'No rating' });
      clear.addEventListener('click', () => { e.rating = null; rebuild(); refreshPreview(); });
      wrap.append(clear);
    };
    rebuild();
    return wrap;
  }
  function swapEntry(a, b) { const arr = wb.config.entries; [arr[a], arr[b]] = [arr[b], arr[a]]; buildDyn(); refreshPreview(); }

  const body = [
    field('Section title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. What people are saying' })),
    field('Content comes from', segmented([{ value: 'manual', label: 'Type them in' }, { value: 'data', label: 'From my data' }], wb.config.mode, (v) => { wb.config.mode = v; buildDyn(); refreshPreview(); })),
    dynHost,
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add testimonials' : 'Edit testimonials', body, footer });
  (async () => {
    if (wb.config.mode === 'data' && wb.config.table) await ensureRows(provider, wb.config.table);
    buildDyn();
    refreshPreview();
  })();
}

// ---------------- Live data table editor ----------------
// Highlight ranges use spreadsheet A1 notation: column letter = position among the columns
// currently shown (A = leftmost shown column, regardless of the underlying table's real column
// order), row number = the row's position in the table as loaded (1 = first row) — stable even
// if a viewer later sorts or searches, since that only changes what's *visible*, not row identity.
function highlightsEditor(wb, refreshPreview) {
  wb.config.highlights = wb.config.highlights?.length ? wb.config.highlights : [];
  const host = el('div');
  function render() {
    host.replaceChildren(subhead('Highlighted cells (optional)'));
    wb.config.highlights.forEach((h, i) => {
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          textInput(h.ranges || '', (v) => { h.ranges = v; refreshPreview(); }, { placeholder: 'e.g. A1:A9, B3, B4:B7, C1' }),
          colorField('Highlight color', h.color, '#fff3b0', (v) => { h.color = v; refreshPreview(); }),
        ]),
        iconBtn('trash', 'Remove', () => { wb.config.highlights.splice(i, 1); render(); refreshPreview(); }, 'ap-btn--danger'),
      ]);
      host.append(row);
    });
    host.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: () => { wb.config.highlights.push({ ranges: '', color: '#fff3b0' }); render(); refreshPreview(); } }, [icon('plus'), 'Add highlight']));
  }
  render();
  return field(null, host, 'A = the first column shown, B = the second, and so on. Rows count from 1 in the order the table loads them, not the current sort.');
}

function openLiveTableEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(async () => {
    await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: {} }));
  }, 150);

  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    if (!wb.config.columns?.length) wb.config.columns = cols.slice(0, 5).map((c) => c.id);
    dynHost.replaceChildren(
      subhead('Columns to show'),
      columnPicker(cols, wb.config.columns, (ids) => { wb.config.columns = ids; refreshPreview(); }),
    );
  }

  const body = [
    field('Title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. All submissions' })),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; wb.config.columns = null; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    divider(),
    highlightsEditor(wb, refreshPreview),
    divider(),
    field('Rows per page', textInput(String(wb.config.pageSize || 10), (v) => { wb.config.pageSize = Math.max(3, Math.min(100, Number(v) || 10)); refreshPreview(); }, { type: 'number' })),
    checkboxRow('Let viewers search', wb.config.searchable !== false, (v) => { wb.config.searchable = v; refreshPreview(); }),
    checkboxRow('Let viewers sort by clicking column headers', wb.config.sortable !== false, (v) => { wb.config.sortable = v; refreshPreview(); }),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add data table' : 'Edit data table', body, footer });
  (async () => { await ensureRows(provider, wb.config.table); buildDyn(); refreshPreview(); })();
}

// ---------------- Embed editor ----------------
function openEmbedEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const previewHost = el('div', { class: 'ap-preview' });
  // Re-composing srcdoc reloads the whole iframe from scratch — a longer debounce than other
  // editors keeps that from firing on every keystroke.
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 500);

  const body = [
    el('div', { class: 'ap-trust' }, [
      icon('code'),
      el('div', {}, [
        el('strong', { text: 'Runs in a sandboxed frame.' }),
        el('div', { class: 'ap-muted', html: 'Your HTML, CSS and JavaScript run isolated from this widget and your Grist data — they can\'t read your tables, this widget\'s settings, or the page around them. You\'re responsible for whatever you put here.' }),
      ]),
    ]),
    field('HTML', textInput(wb.config.html || '', (v) => { wb.config.html = v; refreshPreview(); }, { textarea: true, placeholder: '<div>Hello world</div>' })),
    field('CSS', textInput(wb.config.css || '', (v) => { wb.config.css = v; refreshPreview(); }, { textarea: true, placeholder: 'div { color: teal; }' })),
    field('JavaScript', textInput(wb.config.js || '', (v) => { wb.config.js = v; refreshPreview(); }, { textarea: true, placeholder: 'console.log("hello")' })),
    field('Height (pixels)', textInput(String(wb.config.height ?? 300), (v) => { wb.config.height = Math.max(80, Math.min(1200, Number(v) || 300)); refreshPreview(); }, { type: 'number' })),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add embed' : 'Edit embed', body, footer });
  refreshPreview();
}

// ---------------- QR code editor ----------------
function openQRCodeEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 150);
  const body = [
    field('Link or text', textInput(wb.config.text || '', (v) => { wb.config.text = v; refreshPreview(); }, { textarea: true, placeholder: 'https://example.com' }),
      'Anything works — a URL, a phone number, plain text. Generated entirely in the browser; nothing is sent anywhere.'),
    field('Error correction', segmented([
      { value: 'L', label: 'Low' }, { value: 'M', label: 'Medium' }, { value: 'Q', label: 'Quartile' }, { value: 'H', label: 'High' },
    ], wb.config.level || 'M', (v) => { wb.config.level = v; refreshPreview(); }),
      'Higher levels stay scannable even if the code gets partly damaged or covered, but hold less text at a given size.'),
    twoUp(
      colorField('Code color', wb.config.fg, '#000000', (v) => { wb.config.fg = v; refreshPreview(); }),
      colorField('Background', wb.config.bg, '#ffffff', (v) => { wb.config.bg = v; refreshPreview(); }),
    ),
    field('Size (pixels)', textInput(String(wb.config.size ?? 200), (v) => { wb.config.size = Math.max(80, Math.min(600, Number(v) || 200)); refreshPreview(); }, { type: 'number' })),
    field('Caption (optional)', textInput(wb.config.caption || '', (v) => { wb.config.caption = v; refreshPreview(); }, { placeholder: 'e.g. Scan to donate' })),
    field('Block width', segmented(SPANS, wb.span || 3, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add QR code' : 'Edit QR code', body, footer });
  refreshPreview();
}

// ---------------- Countdown editor ----------------
function openCountdownEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.targetDate = wb.config.targetDate || new Date(Date.now() + 7 * 86400000).toISOString();
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => {
    previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} }));
    mountCountdowns(previewHost);
  }, 200);

  // datetime-local wants a timezone-free "local" string; shifting by the local offset before
  // calling toISOString() is the standard trick to populate one from a UTC-based Date.
  const dt = new Date(wb.config.targetDate);
  const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const body = [
    field('Title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Early-bird pricing ends' })),
    field('Counts down to', textInput(localStr, (v) => { if (v) { wb.config.targetDate = new Date(v).toISOString(); refreshPreview(); } }, { type: 'datetime-local' })),
    field('Message once it ends', textInput(wb.config.expiredText || '', (v) => { wb.config.expiredText = v; refreshPreview(); }, { placeholder: 'e.g. This offer has ended.' })),
    colorField('Number color', wb.config.color, '#6d5efc', (v) => { wb.config.color = v; refreshPreview(); }),
    field('Block width', segmented(SPANS, wb.span || 4, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add countdown' : 'Edit countdown', body, footer });
  refreshPreview();
}

// ---------------- Timeline editor ----------------
function openTimelineEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.items = wb.config.items?.length ? wb.config.items : [{ date: '', title: '', description: '' }];
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 100);

  const itemsHost = el('div');
  function renderItems() {
    itemsHost.replaceChildren(subhead('Milestones'));
    wb.config.items.forEach((it, i) => {
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          textInput(it.date || '', (v) => { it.date = v; refreshPreview(); }, { placeholder: 'e.g. 2020, or March 2024' }),
          textInput(it.title || '', (v) => { it.title = v; refreshPreview(); }, { placeholder: 'Milestone title' }),
          textInput(it.description || '', (v) => { it.description = v; refreshPreview(); }, { textarea: true, placeholder: 'A short description (optional)' }),
        ]),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          i > 0 ? iconBtn('arrowUp', 'Move up', () => swap(i, i - 1)) : null,
          i < wb.config.items.length - 1 ? iconBtn('arrowDown', 'Move down', () => swap(i, i + 1)) : null,
          wb.config.items.length > 1 ? iconBtn('trash', 'Remove', () => { wb.config.items.splice(i, 1); renderItems(); refreshPreview(); }, 'ap-btn--danger') : null,
        ]),
      ]);
      itemsHost.append(row);
    });
    itemsHost.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: () => { wb.config.items.push({ date: '', title: '', description: '' }); renderItems(); refreshPreview(); } }, [icon('plus'), 'Add milestone']));
  }
  function swap(a, b) { const arr = wb.config.items; [arr[a], arr[b]] = [arr[b], arr[a]]; renderItems(); refreshPreview(); }
  renderItems();

  const body = [
    field('Title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Our history' })),
    divider(), itemsHost,
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add timeline' : 'Edit timeline', body, footer });
  refreshPreview();
}

// ---------------- Divider editor ----------------
function openDividerEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = () => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); };
  const body = [
    field('Style', segmented([{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }], wb.config.style || 'solid', (v) => { wb.config.style = v; refreshPreview(); })),
    field('Thickness (pixels)', textInput(String(wb.config.thickness ?? 1), (v) => { wb.config.thickness = Math.max(1, Math.min(10, Number(v) || 1)); refreshPreview(); }, { type: 'number' })),
    colorField('Color', wb.config.color, '#d0d5dd', (v) => { wb.config.color = v; refreshPreview(); }),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add divider' : 'Edit divider', body, footer });
  refreshPreview();
}

// ---------------- Pricing table editor ----------------
function defaultPlan() {
  return { name: 'Plan', price: '$0', period: '/mo', features: ['Feature one'], highlighted: false, buttonLabel: 'Choose', buttonTarget: { kind: null, tab: null, url: null, newTab: true } };
}
function openPricingEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  wb.config.plans = wb.config.plans?.length ? wb.config.plans : [defaultPlan()];
  const previewHost = el('div', { class: 'ap-preview' });
  const refreshPreview = debounce(() => { previewHost.replaceChildren(renderBlock(clone(wb), { provider: ctx.provider, config: {} })); }, 150);

  const plansHost = el('div');
  function renderPlans() {
    plansHost.replaceChildren(subhead('Plans'));
    wb.config.plans.forEach((p, i) => {
      p.buttonTarget = p.buttonTarget || { kind: null, tab: null, url: null, newTab: true };
      const featuresHost = el('div');
      function renderFeatures() {
        featuresHost.replaceChildren();
        (p.features ||= []).forEach((f, fi) => {
          featuresHost.append(el('div', { class: 'ap-row' }, [
            textInput(f, (v) => { p.features[fi] = v; refreshPreview(); }, { placeholder: 'e.g. Unlimited projects' }),
            iconBtn('trash', 'Remove feature', () => { p.features.splice(fi, 1); renderFeatures(); refreshPreview(); }, 'ap-btn--danger'),
          ]));
        });
        featuresHost.append(el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', onClick: () => { p.features.push(''); renderFeatures(); refreshPreview(); } }, [icon('plus'), 'Add feature']));
      }
      renderFeatures();

      const planBody = el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' } }, [
        textInput(p.name || '', (v) => { p.name = v; refreshPreview(); }, { placeholder: 'Plan name' }),
        twoUp(
          textInput(p.price || '', (v) => { p.price = v; refreshPreview(); }, { placeholder: 'e.g. $29' }),
          textInput(p.period || '', (v) => { p.period = v; refreshPreview(); }, { placeholder: 'e.g. /month' }),
        ),
        checkboxRow('Highlight this plan', !!p.highlighted, (v) => { p.highlighted = v; refreshPreview(); }),
        subhead('Features'), featuresHost,
        subhead('Button'),
        textInput(p.buttonLabel || '', (v) => { p.buttonLabel = v; refreshPreview(); }, { placeholder: 'Button label' }),
        linkTargetField(p.buttonTarget, ctx.site?.tabs, refreshPreview),
      ]);
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        planBody,
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          i > 0 ? iconBtn('arrowUp', 'Move up', () => swapPlan(i, i - 1)) : null,
          i < wb.config.plans.length - 1 ? iconBtn('arrowDown', 'Move down', () => swapPlan(i, i + 1)) : null,
          wb.config.plans.length > 1 ? iconBtn('trash', 'Remove plan', () => { wb.config.plans.splice(i, 1); renderPlans(); refreshPreview(); }, 'ap-btn--danger') : null,
        ]),
      ]);
      plansHost.append(row, divider());
    });
    plansHost.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: () => { wb.config.plans.push(defaultPlan()); renderPlans(); refreshPreview(); } }, [icon('plus'), 'Add plan']));
  }
  function swapPlan(a, b) { const arr = wb.config.plans; [arr[a], arr[b]] = [arr[b], arr[a]]; renderPlans(); refreshPreview(); }
  renderPlans();

  const body = [
    field('Section title (optional)', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Choose your plan' })),
    plansHost,
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'), previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add pricing table' : 'Edit pricing table', body, footer });
  refreshPreview();
}

// ---------------- Calendar editor ----------------
function openCalendarEditor(block, ctx) {
  const wb = clone(block); wb.config = wb.config || {};
  const provider = ctx.provider;
  wb.config.table = wb.config.table || provider.defaultTable();
  const previewHost = el('div', { class: 'ap-preview' });
  // No mountCalendars() call here on purpose: drag-to-reschedule and polling only ever activate
  // on a genuinely live page (ctx.edit === null, see render/calendar.js) — this preview always
  // passes edit:undefined, so there's nothing for it to mount.
  const refreshPreview = debounce(async () => {
    await ensureRows(provider, wb.config.table);
    previewHost.replaceChildren(renderBlock(clone(wb), { provider, config: {} }));
  }, 150);

  // Migrate any pre-existing single detailColumn onto the new detailColumns array so old configs
  // keep their detail field when reopened here.
  if (!wb.config.detailColumns) wb.config.detailColumns = wb.config.detailColumn ? [wb.config.detailColumn] : [];
  delete wb.config.detailColumn;

  const dynHost = el('div');
  function buildDyn() {
    const cols = provider.columns(wb.config.table);
    if (cols.length && !cols.find((c) => c.id === wb.config.dateColumn)) wb.config.dateColumn = (cols.find((c) => /date/i.test(c.type)) || cols[0])?.id;
    if (cols.length && !cols.find((c) => c.id === wb.config.titleColumn)) wb.config.titleColumn = cols[0]?.id;
    const optional = (label) => [{ value: '', label }].concat(cols.map((c) => ({ value: c.id, label: c.label })));
    // Up to four detail fields shown in the click popover, same pattern as the map's tooltip fields.
    const dc = wb.config.detailColumns || [];
    const detail = [dc[0] || '', dc[1] || '', dc[2] || '', dc[3] || ''];
    const setDetail = (i, v) => { detail[i] = v; wb.config.detailColumns = detail.filter(Boolean); refreshPreview(); };
    dynHost.replaceChildren(
      field('Date column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.dateColumn, (v) => { wb.config.dateColumn = v; refreshPreview(); }),
        'Dragging an event to a new day on the live page writes the new date back to this column.'),
      field('Event title column', selectInput(cols.map((c) => ({ value: c.id, label: c.label })), wb.config.titleColumn, (v) => { wb.config.titleColumn = v; refreshPreview(); })),
      field('Color events by (optional)', selectInput(optional('— single color —'), wb.config.colorBy || '', (v) => { wb.config.colorBy = v || null; refreshPreview(); })),
      subhead('Details shown on click (optional)'),
      field('Detail field 1', selectInput(optional('— none —'), detail[0], (v) => setDetail(0, v))),
      field('Detail field 2', selectInput(optional('— none —'), detail[1], (v) => setDetail(1, v))),
      field('Detail field 3', selectInput(optional('— none —'), detail[2], (v) => setDetail(2, v))),
      field('Detail field 4', selectInput(optional('— none —'), detail[3], (v) => setDetail(3, v))),
    );
  }

  const body = [
    field('Title', textInput(wb.config.title || '', (v) => { wb.config.title = v; refreshPreview(); }, { placeholder: 'e.g. Task calendar' })),
    field('Data table', selectInput(provider.tables().map((t) => ({ value: t.id, label: t.label })), wb.config.table,
      async (v) => { wb.config.table = v; wb.config.dateColumn = null; wb.config.titleColumn = null; await ensureRows(provider, v); buildDyn(); refreshPreview(); })),
    dynHost,
    checkboxRow('Let viewers drag events to reschedule', wb.config.draggable !== false, (v) => { wb.config.draggable = v; refreshPreview(); }),
    field('Block width', segmented(SPANS, wb.span || 12, (v) => { wb.span = v; })),
    subhead('Live preview'),
    el('div', { class: 'ap-muted', style: { fontSize: '12px', marginBottom: '6px' }, text: 'Dragging only works on the real published page, not in this preview — and picks up direct Grist edits on its own every ~15s while open.' }),
    previewHost,
  ];
  const footer = [ghostBtn('Cancel', () => closeDrawer()), primaryBtn('Apply', 'check', () => { ctx.onApply(wb); closeDrawer(); })];
  openDrawer({ title: block.__isNew ? 'Add calendar' : 'Edit calendar', body, footer });
  (async () => { await ensureRows(provider, wb.config.table); buildDyn(); refreshPreview(); })();
}

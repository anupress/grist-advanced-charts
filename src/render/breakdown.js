// "Group-wise breakdown" block: counts each distinct value of a column and shows them as a
// list of colored-dot rows with a count and percentage (like the reference widget's quality cards).

import { el, interpolate, formatCellValue, isStructuredType, docLocale, pctText } from '../util.js';
import { currentSeriesColors, readVar } from '../theme/apply.js';
import { shapeGroups } from '../stats/aggregate.js';

export function computeBreakdown(rows, column, opts = {}) {
  const limit = opts.limit || 12;
  const counts = new Map();
  let empty = 0;
  // Grouping a Reference column by its raw cell counts row ids, so the list reads 1, 2, 3 with no
  // hint of what any of them are. Given the column, each id resolves to the name the document
  // shows. Grist's empty reference is 0 rather than null, so it has to be recognised here too or
  // every unset reference becomes a group called "0".
  const col = opts.col || null;
  const isRef = col && isStructuredType(col.type);
  for (const r of rows) {
    const v = r[column];
    if (v == null || v === '' || (typeof v === 'string' && !v.trim()) || (isRef && v === 0)) { empty++; continue; }
    const key = isRef ? (formatCellValue(v, col) || '—') : String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // Same renaming and ordering as a chart, so a breakdown and a chart of one column agree. The
  // list's own default stays largest-first; the Choice order is a choice, not the default here.
  const ordered = shapeGroups([...counts.keys()], [{ data: [...counts.values()] }], {
    mode: opts.order || 'value', custom: opts.customOrder, labels: opts.labels,
    choices: Array.isArray(col?.widgetOptions?.choices) && col.widgetOptions.choices.length ? col.widgetOptions.choices.map(String) : null,
  });
  const entries = ordered.categories.map((name, i) => [name, ordered.series[0].data[i]]);
  const shown = entries.slice(0, limit);
  const otherCount = entries.slice(limit).reduce((s, [, n]) => s + n, 0);
  const [top] = [...entries].sort((a, b) => b[1] - a[1]);
  return { total: rows.length, shown, otherCount, empty, groups: entries.length, top: top?.[0] || '—', topcount: top?.[1] || 0 };
}

export function renderBreakdown(block, ctx) {
  const c = block.config || {};
  const table = c.table || ctx.config?.dataTable;
  const rows = ctx.provider.records(table);
  const col = (ctx.provider.columns(table) || []).find((x) => x.id === c.column) || null;
  const { total, shown, otherCount, empty, groups, top, topcount } = computeBreakdown(rows, c.column, {
    limit: c.limit || 12, col, order: c.order, customOrder: c.customOrder, labels: c.labels,
  });

  const palette = (c.colors && c.colors.length) ? c.colors : currentSeriesColors();
  const muted = readVar('--ap-text-mute') || '#8a90a6';
  const warn = readVar('--ap-warn') || '#ff8a5b';

  const rowList = [];
  shown.forEach(([name, count], i) => rowList.push({ name, count, color: palette[i % palette.length] }));
  if (otherCount) rowList.push({ name: 'Other', count: otherCount, color: muted });
  if (empty) rowList.push({ name: 'Empty', count: empty, color: warn });

  const head = el('div', { class: 'ap-bd-head' }, [
    el('div', { style: { minWidth: '0' } }, [
      el('div', { class: 'ap-chartcard__title', text: c.title || c.column || 'Breakdown' }),
      c.subtitle ? el('div', { class: 'ap-chartcard__sub', text: interpolate(c.subtitle, { total, groups, top, topcount, empty }) }) : null,
    ]),
    el('span', { class: 'ap-bd-total', text: `${Number(total).toLocaleString(docLocale())} total` }),
  ]);

  const list = el('div', { class: 'ap-bd-rows' },
    rowList.length ? rowList.map((r) => el('div', { class: 'ap-bd-row' }, [
      el('span', { class: 'ap-bd-dot', style: { background: r.color } }),
      el('span', { class: 'ap-bd-name', text: r.name }),
      el('span', { class: 'ap-bd-count', text: Number(r.count).toLocaleString(docLocale()) }),
      el('span', { class: 'ap-bd-pct', text: pctText(total ? Math.round((r.count / total) * 100) : 0) }),
    ])) : [el('div', { class: 'ap-muted', style: { padding: '8px 2px' }, text: 'No data for this column.' })]);

  return el('div', { class: 'ap-card ap-breakdown', dataset: { blockId: block.id } }, [head, list]);
}

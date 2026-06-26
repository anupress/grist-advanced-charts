// "Group-wise breakdown" block: counts each distinct value of a column and shows them as a
// list of colored-dot rows with a count and percentage (like the reference widget's quality cards).

import { el, interpolate } from '../util.js';
import { currentSeriesColors, readVar } from '../theme/apply.js';

export function computeBreakdown(rows, column, opts = {}) {
  const limit = opts.limit || 12;
  const counts = new Map();
  let empty = 0;
  for (const r of rows) {
    const v = r[column];
    if (v == null || v === '' || (typeof v === 'string' && !v.trim())) { empty++; continue; }
    const key = String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = entries.slice(0, limit);
  const otherCount = entries.slice(limit).reduce((s, [, n]) => s + n, 0);
  return { total: rows.length, shown, otherCount, empty, groups: counts.size, top: entries[0]?.[0] || '—', topcount: entries[0]?.[1] || 0 };
}

export function renderBreakdown(block, ctx) {
  const c = block.config || {};
  const table = c.table || ctx.config?.dataTable;
  const rows = ctx.provider.records(table);
  const { total, shown, otherCount, empty, groups, top, topcount } = computeBreakdown(rows, c.column, { limit: c.limit || 12 });

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
    el('span', { class: 'ap-bd-total', text: `${Number(total).toLocaleString()} total` }),
  ]);

  const list = el('div', { class: 'ap-bd-rows' },
    rowList.length ? rowList.map((r) => el('div', { class: 'ap-bd-row' }, [
      el('span', { class: 'ap-bd-dot', style: { background: r.color } }),
      el('span', { class: 'ap-bd-name', text: r.name }),
      el('span', { class: 'ap-bd-count', text: Number(r.count).toLocaleString() }),
      el('span', { class: 'ap-bd-pct', text: (total ? Math.round((r.count / total) * 100) : 0) + '%' }),
    ])) : [el('div', { class: 'ap-muted', style: { padding: '8px 2px' }, text: 'No data for this column.' })]);

  return el('div', { class: 'ap-card ap-breakdown', dataset: { blockId: block.id } }, [head, list]);
}

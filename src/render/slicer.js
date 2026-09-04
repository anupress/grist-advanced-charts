// Slicer block: the control a reader uses to narrow the rest of the page.
//
// Everything that decides WHAT gets narrowed lives in data/slicer.js and is tested there. This file
// is only the chips: draw the choices, mark the picked ones, and ask the page to redraw when the
// selection changes. The page does the rest by handing every other block a filtered provider.
//
// Two presentations, chosen by how many choices there are unless the author says otherwise. A
// handful of regions is a row of chips you can see all of at once; two hundred clients is a menu.
// Chips are real <button>s with aria-pressed, so keyboard and screen-reader users get the same
// control as everyone else rather than a row of clickable spans.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { getSelection, toggleValue, clearSelection, slicerOptions, resolveFilter } from '../data/slicer.js';

const CHIP_LIMIT = 12;   // above this a row of chips stops being scannable and becomes a wall

export function renderSlicer(block, ctx) {
  const c = block.config || {};
  // Choices always come from the UNFILTERED table, or the menu would shrink to what is already
  // picked and there would be no way to widen a selection again.
  const base = ctx.provider?.baseProvider || ctx.provider;
  const table = c.table || ctx.config?.dataTable;
  const column = c.column;
  const live = !!ctx.slicers;          // absent in the editor, where the block is a preview
  const multi = c.multi !== false;

  const card = el('div', { class: 'ap-card ap-slicer', dataset: { blockId: block.id } });

  const col = column ? (base.columns(table) || []).find((x) => x.id === column) : null;
  const title = c.label || col?.label || column || 'Filter';
  const selected = getSelection(block.id);

  if (!table || !column) {
    card.append(
      el('div', { class: 'ap-slicer__head' }, [el('div', { class: 'ap-slicer__title', text: title })]),
      el('div', { class: 'ap-qr__empty', text: 'Choose a table and a column to filter by.' }),
    );
    return card;
  }

  const options = slicerOptions(base, table, column);
  const style = c.style === 'chips' || c.style === 'dropdown' ? c.style : (options.length > CHIP_LIMIT ? 'dropdown' : 'chips');

  const apply = () => ctx.slicers?.refresh?.();

  // The column name as a label; the choices follow on the same row.
  card.append(el('div', { class: 'ap-slicer__head' }, [
    el('div', { class: 'ap-slicer__title' }, [icon('filter', 'ap-slicer__icon'), el('span', { text: title })]),
  ]));

  // The row count is the feedback that a filter applied. Without it the only sign was other blocks
  // changing somewhere further down the page, which a reader could easily miss — or misread as
  // the page being wrong. Counted on the slicer's own table with its own selection, so it is exact.
  const allRows = base.records(table) || [];
  let shown = allRows.length;
  if (selected.size) {
    const pred = resolveFilter({ table, column, values: selected }, table, base.columns(table) || [], base);
    if (pred) shown = allRows.filter(pred).length;
  }
  const tail = el('div', { class: 'ap-slicer__tail' }, [
    el('div', { class: 'ap-slicer__status', role: 'status', 'aria-live': 'polite' },
      selected.size
        ? [el('strong', { text: String(shown) }), el('span', { text: ` of ${allRows.length} rows` })]
        : [el('span', { text: `All ${allRows.length} rows` })]),
    selected.size
      ? el('button', {
          class: 'ap-slicer__clear', type: 'button',
          'aria-label': `Clear the ${title} filter`,
          onClick: () => { clearSelection(block.id); apply(); },
        }, [icon('close', 'ap-slicer__icon'), el('span', { text: `Clear${selected.size > 1 ? ` (${selected.size})` : ''}` })])
      : null,
  ]);

  if (!options.length) {
    card.append(el('div', { class: 'ap-qr__empty', text: 'No values in this column yet.' }));
    return card;
  }

  if (style === 'chips') {
    const row = el('div', { class: 'ap-slicer__chips', role: 'group', 'aria-label': title });
    for (const o of options) {
      const on = selected.has(o.key);
      row.append(el('button', {
        class: 'ap-chip ap-slicer__chip' + (on ? ' is-active' : ''), type: 'button',
        'aria-pressed': on ? 'true' : 'false', disabled: !live,
        dataset: { value: o.key },
        onClick: () => { toggleValue(block.id, o.key, { multi }); apply(); },
      }, [
        el('span', { text: o.label }),
        c.showCounts !== false ? el('span', { class: 'ap-slicer__count', text: String(o.count) }) : null,
      ]));
    }
    card.append(row);
  } else {
    // A native <select>: the one control every browser, keyboard and assistive tech already knows,
    // which matters more than a prettier custom menu for a list that can run to hundreds.
    const sel = el('select', {
      class: 'ap-slicer__select', multiple: multi, size: multi ? String(Math.min(8, options.length)) : null,
      'aria-label': title, disabled: !live,
    }, [
      !multi ? el('option', { value: '', text: `All (${options.length})`, selected: !selected.size }) : null,
      ...options.map((o) => el('option', {
        value: o.key, selected: selected.has(o.key),
        text: c.showCounts !== false ? `${o.label} (${o.count})` : o.label,
      })),
    ]);
    sel.addEventListener('change', () => {
      const picked = [...sel.selectedOptions].map((op) => op.value).filter((v) => v !== '');
      // setSelection semantics through the same door as chips, so single/multi behave alike.
      clearSelection(block.id);
      for (const v of picked) toggleValue(block.id, v, { multi: true });
      apply();
    });
    card.append(sel);
  }

  card.append(tail);
  if (c.hint) card.append(el('div', { class: 'ap-slicer__hint', text: c.hint }));
  return card;
}

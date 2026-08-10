// Accordion block: a title plus a list of native <details>/<summary> question/answer pairs —
// no JS needed for the open/close interaction itself, it's a browser built-in.

import { el } from '../util.js';

export function renderAccordion(block, ctx) {
  const c = block.config || {};
  // renderBlock() only wires a "click card to open editor" listener when ctx.edit.active is
  // true (real edit-mode page render) — that's the only context where letting <summary>'s
  // native toggle fire too would conflict (both handlers firing on one click). In true view
  // mode and in the editor's own live preview there's no such listener, so the toggle is left
  // to work normally — including in the preview, where it's a harmless, useful way to check
  // what each answer looks like without setting openFirst on every item.
  const suppressToggle = !!ctx.edit?.active;
  const items = c.items?.length ? c.items : [{ q: 'Question', a: 'Answer' }];
  const openFirst = c.openFirst !== false;

  const rows = items.map((it, i) => {
    const summary = el('summary', { class: 'ap-accordion__q', text: it.q || 'Question' });
    if (suppressToggle) summary.addEventListener('click', (e) => e.preventDefault());
    return el('details', { class: 'ap-accordion__item', open: openFirst && i === 0 }, [
      summary,
      el('div', { class: 'ap-accordion__a', text: it.a || '' }),
    ]);
  });

  return el('div', { class: 'ap-card ap-accordion', dataset: { blockId: block.id } }, [
    c.title ? el('h3', { class: 'ap-accordion__title', text: c.title }) : null,
    ...rows,
  ]);
}

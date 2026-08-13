// Printable layout: collect blocks from anywhere on the site, arrange them, print them.
//
// The problem it solves is narrow and common: someone wants to send three charts and a table, not
// the whole dashboard. Until now the only answers were "print this one block" or "print this whole
// page", and neither is what a person actually needs when they are assembling something for
// somebody else.
//
// The interaction borrows its MECHANICS from a shopping cart — browse freely, collect as you go, a
// running count follows you, then a single screen to review and commit — because collecting is
// spread across pages while arranging is one focused task, and that split is exactly what a cart
// handles well. It deliberately does not borrow the VOCABULARY: nothing here says cart or checkout,
// because a business tool that asks you to check out sounds like it wants your card details. The
// words are "add to printout", "3 selected", "Printable layout", "Print".
//
// What comes out is the site as a document: the real header, the blocks you chose in the order you
// put them, the real footer, on a page the size you asked for. Not a screenshot of a dashboard.
//
// Who can do what was a deliberate split. Anyone can select, arrange and print — a client browsing
// a published page is exactly who wants this. Saving the arrangement back into the design writes to
// the document, so that stays behind Edit.

import { el, clone, uid, toast } from '../util.js';
import { icon, brandLogo } from '../assets/icons.js';
import { renderBlock, mountCharts } from '../render/blocks.js';
import { mountMaps, settleMapsForPrint } from '../render/map.js';
import { mountCounters } from '../render/counter.js';
import { mountCountdowns } from '../render/countdown.js';
// Sortable is used directly rather than through builder/dnd.js: the sheet's items are
// .ap-sheet__item, not .ap-block, and reordering here rewrites the selection rather than a tab.

// Real paper, in the units the paper is actually specified in. Browsers resolve mm exactly
// (210mm is 793.69px at 96dpi), so a preview sized this way is not an approximation of A4 — it
// is A4, and the page boundaries drawn below fall where the printer will really break.
export const PAPERS = {
  a4: { id: 'a4', label: 'A4', w: 210, h: 297, css: 'A4' },
  letter: { id: 'letter', label: 'US Letter', w: 216, h: 279, css: 'letter' },
};
const MARGIN_MM = 12;

// The selection. Session-scoped on purpose: it is a working set, not a document. Losing it on
// reload is the same as losing a cart, and the alternative — persisting it — would mean a stale
// selection surprising someone days later.
// The same widths the page builder offers, so a printout is arranged the way the dashboard is
// rather than in a second vocabulary nobody asked to learn.
export const SPANS = [
  { value: 3, label: 'XS' }, { value: 4, label: 'S' }, { value: 6, label: 'M' },
  { value: 8, label: 'L' }, { value: 12, label: 'Full' },
];

const state = {
  ids: [],              // block ids, in the order they were added
  paper: 'a4',
  // blockId -> { span, columns, maxRows }. Overrides live here rather than on the block itself:
  // narrowing a table for one printout must not narrow it on the page it came from.
  opts: {},
  listeners: new Set(),
};

const notify = () => { for (const fn of state.listeners) { try { fn(); } catch { /* a bad listener must not stop the rest */ } } };
export const onChange = (fn) => { state.listeners.add(fn); return () => state.listeners.delete(fn); };

export const selection = () => [...state.ids];
export const isSelected = (id) => state.ids.includes(id);
export const count = () => state.ids.length;

export function toggle(id) {
  const i = state.ids.indexOf(id);
  if (i >= 0) state.ids.splice(i, 1); else state.ids.push(id);
  notify();
  return isSelected(id);
}
export function remove(id) { const i = state.ids.indexOf(id); if (i >= 0) { state.ids.splice(i, 1); notify(); } }
export function clear() { state.ids = []; notify(); }
export function reorder(ids) { state.ids = ids.filter((x) => state.ids.includes(x)); notify(); }

export const optsFor = (id) => state.opts[id] || {};
export function setOpt(id, patch) { state.opts[id] = { ...optsFor(id), ...patch }; notify(); }

/**
 * The block as it should appear on the sheet: a clone with this printout's overrides applied.
 *
 * A clone, always. Narrowing a table or capping its rows for one printed page must never change
 * the block on the page it was collected from — the selection is a view of the design, not an
 * edit to it.
 */
export function blockForSheet(config, id) {
  const found = findBlock(config, id);
  if (!found) return null;
  const b = clone(found.block);
  const o = optsFor(id);
  if (o.span) b.span = o.span;
  if (b.type === 'livetable') {
    if (Array.isArray(o.columns) && o.columns.length) b.config.columns = [...o.columns];
    if (o.maxRows) b.config.maxRows = o.maxRows;
    // A pager is a control, and a printed page has none. Showing every kept row on the sheet is
    // also the only honest preview, since printing expands the table anyway.
    b.config.pageSize = Math.max(1, o.maxRows || 9999);
    b.config.searchable = false;
  }
  return { block: b, tab: found.tab };
}

// Find a block by id anywhere in the config, so a printout can gather from several pages — which
// is the whole point of collecting as you browse rather than printing one page at a time.
export function findBlock(config, id) {
  for (const tab of config?.tabs || []) {
    for (const b of tab.blocks || []) if (b.id === id) return { block: b, tab };
  }
  return null;
}

/**
 * The small control that appears on every block.
 *
 * Lives in view mode, where the edit tools are absent — in edit mode the block already has its own
 * row of controls and adding a fifth would crowd them, and someone arranging a design is not the
 * person assembling a printout.
 */
export function selectButton(block, onToggled) {
  const btn = el('button', {
    class: 'ap-btn ap-btn--icon ap-btn--sm ap-pickbtn', type: 'button',
    'aria-pressed': isSelected(block.id) ? 'true' : 'false',
  }, [icon(isSelected(block.id) ? 'check' : 'plus')]);
  const sync = () => {
    const on = isSelected(block.id);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Remove from printout' : 'Add to printout');
    btn.title = on ? 'In your printout — click to remove' : 'Add this to a printout';
    btn.replaceChildren(icon(on ? 'check' : 'plus'));
  };
  sync();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(block.id);
    sync();
    onToggled?.();
  });
  onChange(sync);
  return btn;
}

/**
 * The running count, parked bottom-right. Only exists once something is in it, so a site nobody is
 * collecting from carries no extra furniture.
 */
export function mountTray(root, config, provider, onSaveLayout) {
  let tray = root.querySelector('.ap-tray');
  if (!tray) {
    tray = el('div', { class: 'ap-tray', hidden: true });
    root.appendChild(tray);
  }
  const render = () => {
    const n = count();
    tray.hidden = n === 0;
    if (!n) return;
    tray.replaceChildren(
      el('button', { class: 'ap-tray__open', type: 'button',
        onClick: () => openLayout({ root, config, provider, onSaveLayout }) }, [
        icon('layout'),
        el('span', { class: 'ap-tray__count', text: String(n) }),
        el('span', { class: 'ap-tray__label', text: n === 1 ? '1 selected' : `${n} selected` }),
        el('span', { class: 'ap-tray__cta', text: 'Arrange & print' }),
      ]),
      el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-tray__clear', type: 'button',
        title: 'Clear the selection', 'aria-label': 'Clear the selection',
        onClick: () => clear() }, [icon('close')]),
    );
  };
  render();
  onChange(render);
  return tray;
}

// ---- The layout screen -----------------------------------------------------------------------

function paperOf() { return PAPERS[state.paper] || PAPERS.a4; }

/**
 * Where the printer will actually break, drawn on screen.
 *
 * Blocks already carry break-inside:avoid, so a block never splits — the browser moves a block that
 * would overflow onto the next page whole. That makes the break points computable rather than
 * guessable: walk the blocks in order, accumulate heights, and start a new page whenever the next
 * one would not fit. The lines drawn here are therefore the real ones, which is the difference
 * between a preview and a picture of a preview.
 */
function paginate(sheet, paper) {
  const pageH = (paper.h - MARGIN_MM * 2) * (96 / 25.4); // mm of printable height, in CSS px
  sheet.querySelectorAll('.ap-sheet__break').forEach((n) => n.remove());
  const items = [...sheet.children].filter((n) => !n.classList.contains('ap-sheet__break'));
  let used = 0;
  let pages = 1;
  for (const item of items) {
    const h = item.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(sheet).rowGap || '0') || 0;
    if (used > 0 && used + h > pageH) {
      const mark = el('div', { class: 'ap-sheet__break' },
        [el('span', { text: `page ${pages + 1}` })]);
      sheet.insertBefore(mark, item);
      pages++;
      used = h + gap;
    } else {
      used += h + gap;
    }
  }
  return pages;
}

export function openLayout(opts) {
  const { root, config, provider, onSaveLayout } = opts;
  const canSave = typeof onSaveLayout === 'function';
  let overlay = document.querySelector('.ap-layout');
  if (overlay) overlay.remove();

  const sheet = el('div', { class: 'ap-sheet__body' });
  const pageInfo = el('span', { class: 'ap-muted' });

  // The outer sheet is the paper; `sheet` below is the printable area inside its margins. Both
  // have to follow the paper choice — setting only the inner one left the page still A4-shaped
  // while its contents and page count had already switched to Letter.
  const paperEl = el('div', { class: 'ap-sheet' }, [sheet]);

  function draw() {
    const paper = paperOf();
    const contentMm = paper.w - MARGIN_MM * 2;
    paperEl.style.width = paper.w + 'mm';
    sheet.style.width = contentMm + 'mm';
    sheet.replaceChildren();

    if (!count()) {
      sheet.append(el('div', { class: 'ap-empty', text: 'Nothing selected yet. Close this, then use the + on any block to add it.' }));
      pageInfo.textContent = '';
      return;
    }
    // The site's own header and footer, so the printout reads as the site rather than as a
    // detached grid of cards. Rendered as static marks — the nav and its buttons would be dead
    // controls on paper.
    const h = config.header || {};
    sheet.append(el('div', { class: 'ap-sheet__header' }, [
      el('span', { class: 'ap-sheet__logo' }, [h.logoData ? el('img', { src: h.logoData, alt: '' }) : brandLogo(34)]),
      el('div', {}, [
        el('div', { class: 'ap-sheet__name', text: h.title || '' }),
        h.slogan ? el('div', { class: 'ap-sheet__slogan', text: h.slogan }) : null,
      ]),
    ]));

    const ctx = { provider, config, edit: null };
    for (const id of selection()) {
      const found = blockForSheet(config, id);
      if (!found) continue;
      const span = found.block.span || 12;
      const wrap = el('div', { class: 'ap-sheet__item', dataset: { blockId: id, span: String(span) } });
      wrap.append(
        el('div', { class: 'ap-sheet__tools' }, [
          el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-drag-handle', type: 'button',
            title: 'Drag to reorder', 'aria-label': 'Drag to reorder' }, [icon('grip')]),
          el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm', type: 'button',
            title: 'Size and contents on the page', 'aria-label': 'Options for this block',
            onClick: (e) => { e.stopPropagation(); toggleOptions(wrap, id, found.block); } }, [icon('sliders')]),
          el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-btn--danger', type: 'button',
            title: 'Take out of the printout', 'aria-label': 'Take out of the printout',
            onClick: () => { remove(id); draw(); } }, [icon('trash')]),
        ]),
        renderBlock(found.block, ctx),
      );
      sheet.append(wrap);
    }

    const f = config.footer || {};
    if (f.text) sheet.append(el('div', { class: 'ap-sheet__footer', text: f.text }));

    // Charts and maps need a second pass once they are in the document and measurable, and the
    // page boundaries can only be computed after that — a chart with no height yet would report
    // the wrong break points.
    //
    // setTimeout, not requestAnimationFrame: rAF does not fire while the page is not compositing
    // (an inactive Grist tab, a backgrounded preview), which would leave the sheet un-paginated
    // and the page count blank for exactly the users least able to tell why.
    setTimeout(() => {
      try { mountCharts(sheet); mountMaps(sheet); mountCounters(sheet); mountCountdowns(sheet); } catch { /* a block that will not mount still prints its card */ }
      setTimeout(() => {
        const pages = paginate(sheet, paperOf());
        pageInfo.textContent = `${count()} block${count() === 1 ? '' : 's'} · ${pages} page${pages === 1 ? '' : 's'} of ${paperOf().label}`;
      }, 140);
    }, 0);

    makeBlocksSortableOnSheet();
  }

  /**
   * Per-block options, opened from the item itself rather than a side panel, because the thing
   * being changed is right there and the effect is immediate.
   *
   * Width is offered for every block, using the same XS/S/M/L/Full the page builder uses — the
   * printout should be arranged the way the dashboard is, not in a second vocabulary. A table also
   * gets its columns and a row cap, since "the top twenty, without the four columns nobody needs"
   * is the difference between a document and a phone book.
   */
  function toggleOptions(wrap, id, blockOnSheet) {
    const open = wrap.querySelector('.ap-sheet__opts');
    if (open) { open.remove(); return; }
    sheet.querySelectorAll('.ap-sheet__opts').forEach((n) => n.remove());

    const o = optsFor(id);
    const body = [
      el('div', { class: 'ap-sheet__optlabel', text: 'Width on the page' }),
      el('div', { class: 'ap-row' }, SPANS.map((s) => el('button', {
        class: 'ap-chip' + ((o.span || blockOnSheet.span || 12) === s.value ? ' is-active' : ''),
        type: 'button', text: s.label,
        onClick: () => { setOpt(id, { span: s.value }); draw(); },
      }))),
    ];

    if (blockOnSheet.type === 'livetable') {
      const table = blockOnSheet.config.table;
      const all = provider.columns(table) || [];
      const chosen = new Set(o.columns && o.columns.length ? o.columns : (blockOnSheet.config.columns || all.map((x) => x.id)));
      body.push(
        el('div', { class: 'ap-sheet__optlabel', text: 'Columns' }),
        el('div', { class: 'ap-sheet__optcols' }, all.map((col) => {
          const on = chosen.has(col.id);
          return el('button', {
            class: 'ap-chip' + (on ? ' is-active' : ''), type: 'button', text: col.label,
            onClick: () => {
              const next = new Set(chosen);
              if (next.has(col.id)) next.delete(col.id); else next.add(col.id);
              // Never let the last column go: a table with no columns is not a smaller table,
              // it is a blank rectangle.
              if (!next.size) return;
              setOpt(id, { columns: all.map((x) => x.id).filter((cid) => next.has(cid)) });
              draw();
            },
          });
        })),
        el('div', { class: 'ap-sheet__optlabel', text: 'Rows' }),
        el('div', { class: 'ap-row' }, [10, 20, 50, 0].map((n) => el('button', {
          class: 'ap-chip' + ((o.maxRows || 0) === n ? ' is-active' : ''), type: 'button',
          text: n ? `First ${n}` : 'All rows',
          onClick: () => { setOpt(id, { maxRows: n }); draw(); },
        }))),
      );
    }

    const panel = el('div', { class: 'ap-sheet__opts' }, body);
    panel.addEventListener('click', (e) => e.stopPropagation());
    wrap.append(panel);
  }

  function makeBlocksSortableOnSheet() {
    if (!window.Sortable) return;
    window.Sortable.create(sheet, {
      handle: '.ap-drag-handle',
      draggable: '.ap-sheet__item',
      animation: 160,
      ghostClass: 'ap-sortable-ghost',
      chosenClass: 'ap-sortable-chosen',
      onEnd: () => {
        reorder([...sheet.querySelectorAll('.ap-sheet__item')].map((n) => n.dataset.blockId));
        draw();
      },
    });
  }

  // @page cannot be set from an inline style, so the chosen paper is written into a real stylesheet
  // that is swapped whenever the size changes.
  //
  // The margin belongs to @page and to nothing else. Setting it in both places gave every printout
  // a 12mm page margin AND a 10mm sheet padding: 22mm of white before any content, and a printable
  // area 20mm narrower on paper than the identical sheet on screen.
  //
  // That second part is why maps came out blank. The sheet is drawn at true paper width on screen,
  // so a block inside it already has its final printed geometry; changing the width at print time
  // reflowed everything, and Leaflet -- which positions tiles absolutely from the size it last
  // measured -- had no idea. Its tiles ended up outside the clip: eight of them sat in the PDF
  // with not one painted. Keep the content box the same width and nothing needs re-projecting.
  //
  // It has to be @page rather than padding on the sheet, because padding is applied once at the
  // start and end of an element while @page applies to every sheet of paper. Carrying the inset as
  // padding gave page one a margin and left pages two and three hard against the top edge.
  //
  // The widths still agree: on screen the sheet is one paper width wide with MARGIN_MM of padding,
  // and on paper the page box is that width less two margins. Both leave the same content box.
  const pageStyle = el('style');
  const applyPaper = () => {
    pageStyle.textContent =
      `@media print {\n` +
      `  @page { size: ${paperOf().css}; margin: ${MARGIN_MM}mm; }\n` +
      // Specificity beats site.css's fallback rule, so cascade order does not have to be trusted.
      `  body.ap-printing-layout .ap-layout .ap-sheet { padding: 0 !important; }\n` +
      `}`;
  };
  applyPaper();

  const paperPicker = el('div', { class: 'ap-row' }, Object.values(PAPERS).map((p) =>
    el('button', {
      class: 'ap-chip' + (state.paper === p.id ? ' is-active' : ''), type: 'button', text: p.label,
      onClick: (e) => {
        state.paper = p.id;
        applyPaper();
        e.currentTarget.parentElement.querySelectorAll('.ap-chip').forEach((c) => c.classList.toggle('is-active', c.textContent === p.label));
        draw();
      },
    })));

  const close = () => { overlay.remove(); pageStyle.remove(); };

  const footerBtns = [
    el('button', { class: 'ap-btn ap-btn--ghost', type: 'button', text: 'Keep browsing', onClick: close }),
    canSave ? el('button', { class: 'ap-btn ap-btn--soft', type: 'button' }, [icon('save'), el('span', { text: 'Save as a page' })]) : null,
    el('button', { class: 'ap-btn ap-btn--primary', type: 'button' }, [icon('download'), el('span', { text: 'Print' })]),
  ].filter(Boolean);

  // Print: the overlay is already the only thing that should appear, so it marks itself and the
  // print stylesheet drops the site behind it.
  const printBtn = footerBtns[footerBtns.length - 1];
  printBtn.addEventListener('click', async () => {
    // Maps get a moment to settle before the dialog opens. window.print() captures the document as
    // it stands, so a tile still in flight is a tile that never reaches the paper. The button says
    // so while it waits, because a button that looks ignored gets clicked again.
    const label = printBtn.querySelector('span');
    const wasLabel = label?.textContent;
    printBtn.disabled = true;
    if (label) label.textContent = 'Preparing…';
    try { await settleMapsForPrint(sheet); } catch { /* print anyway; a grey tile beats no print */ }
    printBtn.disabled = false;
    if (label && wasLabel) label.textContent = wasLabel;

    document.body.classList.add('ap-printing-layout');
    const clean = () => { document.body.classList.remove('ap-printing-layout'); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    setTimeout(clean, 60000);
    window.print();
  });

  if (canSave) {
    footerBtns[1].addEventListener('click', () => {
      const blocks = selection().map((id) => findBlock(config, id)).filter(Boolean)
        .map((f) => ({ ...clone(f.block), id: uid('blk') })); // new ids: the originals still live on their own pages
      if (!blocks.length) { toast('Nothing selected to save.', 'err'); return; }
      onSaveLayout({
        id: uid('tab'),
        title: 'Printout',
        hero: { enabled: false },
        blocks,
      });
      close();
      toast('Saved as a new page. It behaves like any other — rename it, or hide it from the menu.', 'ok');
    });
  }

  overlay = el('div', { class: 'ap-layout', role: 'dialog', 'aria-label': 'Printable layout' }, [
    el('div', { class: 'ap-layout__bar' }, [
      el('div', { class: 'ap-layout__title' }, [icon('layout'), el('span', { text: 'Printable layout' })]),
      paperPicker,
      pageInfo,
      el('button', { class: 'ap-btn ap-btn--icon ap-layout__x', type: 'button', 'aria-label': 'Close', onClick: close }, [icon('close')]),
    ]),
    el('div', { class: 'ap-layout__scroll' }, [paperEl]),
    el('div', { class: 'ap-layout__foot' }, footerBtns),
  ]);

  document.head.appendChild(pageStyle);
  document.body.appendChild(overlay);
  draw();

  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return overlay;
}

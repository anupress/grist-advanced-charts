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

import { el, clone, uid, toast, interpolate } from '../util.js';
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
//
// Each named size keeps its CSS keyword instead of being written out in millimetres, because the
// keyword is what the browser matches against the printer's own paper list. "A4" can select the
// tray; "210mm 297mm" is only a rectangle that happens to be A4-shaped.
export const PAPERS = {
  a4: { id: 'a4', label: 'A4', w: 210, h: 297, css: 'A4' },
  letter: { id: 'letter', label: 'US Letter', w: 216, h: 279, css: 'letter' },
  a5: { id: 'a5', label: 'A5', w: 148, h: 210, css: 'A5' },
  legal: { id: 'legal', label: 'US Legal', w: 216, h: 356, css: 'legal' },
};

// Anything that is not a sheet of office paper. A label, a card, a till roll: the page IS the
// artefact, so the size is whatever the stock is and the margin is usually nothing at all. Keeping
// these separate from PAPERS is deliberate — asking someone to find a 54mm business card under a
// heading called "paper size" is how a feature gets missed.
export const STOCKS = {
  card: { id: 'card', label: 'Business card', w: 85, h: 55, margin: 0 },
  label_l: { id: 'label_l', label: 'Shipping 100×150', w: 100, h: 150, margin: 0 },
  label_m: { id: 'label_m', label: 'Address 89×36', w: 89, h: 36, margin: 0 },
  label_s: { id: 'label_s', label: 'Small 57×32', w: 57, h: 32, margin: 0 },
};

const DEFAULT_MARGIN_MM = 12;
const MIN_PAGE_MM = 10;
const MAX_PAGE_MM = 1200;   // a continuous roll is still finite; this stops a typo asking for a mile
const MAX_MARGIN_MM = 40;

const clampPage = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(MAX_PAGE_MM, Math.max(MIN_PAGE_MM, n)) : fallback;
};

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
  paper: 'a4',          // a PAPERS id, a STOCKS id, or 'custom'
  custom: { w: 100, h: 150 },
  margin: DEFAULT_MARGIN_MM,
  // Repeat the selected blocks once per row of a table. Off by default, because the ordinary
  // printout is one document rather than a run of them.
  repeat: { table: null, limit: 50, across: 1, pageEach: false },
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
 * Put a block's overrides back exactly as they were, including back to having none at all.
 *
 * setOpt merges, which is right for changing one thing and wrong for undoing several. Abandoning a
 * panel has to restore the absence of a key as faithfully as its value, or "cancel" would leave
 * behind whichever settings happened to be touched first.
 */
export function restoreOpts(id, snapshot) {
  if (snapshot === undefined) delete state.opts[id];
  else state.opts[id] = { ...snapshot };
  notify();
}

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

// Across the sheet's 12-column grid, so a record can only sit at a width the grid actually has.
// 5 across would leave a two-column orphan on every row, which on a sheet of die-cut labels means
// every fifth label misses its die.
export const ACROSS = [1, 2, 3, 4, 6];
export const REPEAT_MAX = 500;   // one careless run should not send a thousand labels to a printer

/**
 * One block, bound to one row.
 *
 * Only blocks that mean something for a single record are rebound. A chart of a whole table means
 * the same thing beside every label, so it is left alone rather than being made to look per-row.
 *
 * The Invoice block already selects its row by id, so batch invoicing needs nothing from that
 * renderer — it just gets told which row it is this time.
 *
 * Text and captions interpolate %Column tokens against the row, which is the same syntax the
 * dynamic subtitles already use. The interpolation happens before renderText sanitizes, so a cell
 * containing markup is disarmed exactly as any other config value would be.
 */
export function bindBlockToRow(block, row) {
  const b = clone(block);
  const c = b.config || (b.config = {});
  if (b.type === 'invoice') c.rowId = row.id;
  else if (b.type === 'qrcode') {
    c.text = interpolate(c.text, row);
    if (c.caption) c.caption = interpolate(c.caption, row);
  } else if (b.type === 'barcode') {
    c.value = interpolate(c.value, row);
    if (c.caption) c.caption = interpolate(c.caption, row);
  } else if (b.type === 'text') {
    if (c.heading) c.heading = interpolate(c.heading, row);
    if (c.html) c.html = interpolate(c.html, row);
  }
  return b;
}

/** The rows this printout would repeat over, already capped. */
export function repeatRows(provider) {
  const r = state.repeat;
  if (!r.table) return [];
  const all = provider?.records?.(r.table) || [];
  const limit = Math.min(REPEAT_MAX, Math.max(1, Number(r.limit) || 1));
  return all.slice(0, limit);
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

/**
 * The page being printed onto, whichever of the three kinds it is.
 *
 * `css` is what goes into `@page { size: … }`. Named stock keeps its keyword; everything measured
 * is written in millimetres, which is the one unit browsers resolve exactly.
 */
function paperOf() {
  if (state.paper === 'custom') {
    const w = clampPage(state.custom.w, 100);
    const h = clampPage(state.custom.h, 150);
    return { id: 'custom', label: `${w}×${h}mm`, w, h, css: `${w}mm ${h}mm` };
  }
  const stock = STOCKS[state.paper];
  if (stock) return { ...stock, css: `${stock.w}mm ${stock.h}mm` };
  return PAPERS[state.paper] || PAPERS.a4;
}

/**
 * The margin, in mm.
 *
 * Label stock defaults to none, because a die-cut label has no waste edge to give away — but the
 * value stays editable afterwards, since some thermal printers do want a sliver.
 */
function marginMm() {
  const n = Number(state.margin);
  const m = Number.isFinite(n) ? n : DEFAULT_MARGIN_MM;
  const paper = paperOf();
  // Never let the margins eat the page: two of them must still leave something to print on.
  const roomiest = Math.max(0, Math.min(paper.w, paper.h) / 2 - 5);
  return Math.min(MAX_MARGIN_MM, Math.max(0, Math.min(m, roomiest)));
}

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
  const pageH = (paper.h - marginMm() * 2) * (96 / 25.4); // mm of printable height, in CSS px
  sheet.querySelectorAll('.ap-sheet__break').forEach((n) => n.remove());
  const items = [...sheet.children].filter((n) => !n.classList.contains('ap-sheet__break'));
  const gap = parseFloat(getComputedStyle(sheet).rowGap || '0') || 0;

  // Group by visual row before measuring anything. The sheet is a 12-column grid, so two half-width
  // blocks — or six labels across — occupy ONE row of paper between them. Adding their heights up
  // one after another was counting the same vertical space twice and reporting pages that would
  // never be printed. Items sharing an offsetTop share a row.
  //
  // All the grouping happens before a single break is inserted, because a break is itself a
  // full-width grid item: inserting one mid-walk moves everything below it and invalidates the
  // offsets the rest of the walk is reading.
  const rows = [];
  for (const item of items) {
    const top = item.offsetTop;
    const h = item.getBoundingClientRect().height;
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.top - top) < 2) { last.h = Math.max(last.h, h); last.items.push(item); }
    else rows.push({ top, h, items: [item] });
  }

  const marks = [];
  let used = 0;
  let pages = 1;
  for (const row of rows) {
    if (used > 0 && used + row.h > pageH) {
      marks.push({ before: row.items[0], page: ++pages });
      used = row.h + gap;
    } else {
      used += row.h + gap;
    }
  }
  for (const m of marks) {
    sheet.insertBefore(el('div', { class: 'ap-sheet__break' }, [el('span', { text: `page ${m.page}` })]), m.before);
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
  // Which block has its options open, and what its overrides were when it opened. Survives the
  // redraw that every option change triggers; see toggleOptions.
  let openOpts = null;

  // The outer sheet is the paper; `sheet` below is the printable area inside its margins. Both
  // have to follow the paper choice — setting only the inner one left the page still A4-shaped
  // while its contents and page count had already switched to Letter.
  const paperEl = el('div', { class: 'ap-sheet' }, [sheet]);

  function draw() {
    const paper = paperOf();
    const margin = marginMm();
    const contentMm = paper.w - margin * 2;
    paperEl.style.width = paper.w + 'mm';
    // The on-screen inset has to be written here rather than left to the stylesheet. It used to be
    // a hardcoded 12mm in CSS, which was correct for exactly as long as the margin was also always
    // 12mm. Once the margin became a choice, an 85mm business card was still being padded by 12mm a
    // side while the body inside it was sized to the full 85mm — box-sizing meant the card had only
    // 61mm of room, so every block hung 24mm off the right edge of the paper.
    paperEl.style.padding = margin + 'mm';
    sheet.style.width = contentMm + 'mm';
    sheet.replaceChildren();

    if (!count()) {
      sheet.append(el('div', { class: 'ap-empty', text: 'Nothing selected yet. Close this, then use the + on any block to add it.' }));
      pageInfo.textContent = '';
      return;
    }
    const ctx = { provider, config, edit: null };
    const rows = repeatRows(provider);

    // A run of labels is not a document, so it gets no letterhead. The header belongs on the one
    // printout that reads as a page from the site; stamping it above forty address labels would
    // waste the first label and puzzle everyone.
    if (!rows.length) {
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
    }

    if (rows.length) {
      // Repeat mode. The per-item tools are gone on purpose: this is a preview of a print run, and
      // forty copies of a drag handle is not a thing anyone wants to look at or tab through. The
      // selection is still changed the way it was made, with the + on the blocks themselves.
      const across = state.repeat.pageEach ? 1
        : (ACROSS.includes(state.repeat.across) ? state.repeat.across : 1);
      for (const row of rows) {
        const rec = el('div', {
          class: 'ap-sheet__record' + (state.repeat.pageEach ? ' is-page' : ''),
          dataset: { across: String(across) },
        });
        for (const id of selection()) {
          const found = blockForSheet(config, id);
          if (!found) continue;
          rec.append(renderBlock(bindBlockToRow(found.block, row), ctx));
        }
        sheet.append(rec);
      }
      openOpts = null;   // repeat mode draws no per-block tools, so nothing can hold a panel open
      finishDraw(rows.length, across);
      return;
    }

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

    // Put the open options panel back. Rebuilding the sheet is what destroys it, so restoring it
    // here is what makes "try a width, look, try another" possible without reopening anything.
    if (openOpts) {
      const wrap = [...sheet.querySelectorAll('.ap-sheet__item')].find((n) => n.dataset.blockId === openOpts.id);
      const found = wrap ? blockForSheet(config, openOpts.id) : null;
      if (wrap && found) buildOptionsPanel(wrap, openOpts.id, found.block);
      else openOpts = null;   // the block left the printout while its panel was open
    }

    finishDraw(0, 1);
    makeBlocksSortableOnSheet();
  }

  /**
   * The pass that can only happen once the sheet is in the document.
   *
   * Charts and maps need a second mount before they have a height, and the page boundaries can only
   * be computed after that — a chart still at zero height would report break points that move the
   * moment it draws.
   *
   * setTimeout, not requestAnimationFrame: rAF does not fire while the page is not compositing (an
   * inactive Grist tab, a backgrounded preview), which would leave the sheet un-paginated and the
   * page count blank for exactly the users least able to work out why.
   */
  function finishDraw(records, across) {
    setTimeout(() => {
      try { mountCharts(sheet); mountMaps(sheet); mountCounters(sheet); mountCountdowns(sheet); } catch { /* a block that will not mount still prints its card */ }
      setTimeout(() => {
        // One record per page is a decision, not a measurement, so it is counted rather than
        // paginated — the break is forced in CSS and the ruler would only agree with itself.
        const pages = (records && state.repeat.pageEach)
          ? records
          : paginate(sheet, paperOf());
        const blocks = `${count()} block${count() === 1 ? '' : 's'}`;
        const per = records
          ? ` × ${records} record${records === 1 ? '' : 's'}${across > 1 ? `, ${across} across` : ''}`
          : '';
        pageInfo.textContent = `${blocks}${per} · ${pages} page${pages === 1 ? '' : 's'} of ${paperOf().label}`;
      }, 140);
    }, 0);
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
  /**
   * Open or close a block's options.
   *
   * The panel is held open across redraws, which is the whole point of it. Every chip in here
   * changes the sheet, and changing the sheet rebuilds it — so the panel used to be destroyed by
   * the very click that used it, and trying three widths meant reopening the panel three times.
   * Keeping the open block in `openOpts` lets draw() put it back, so a width can be tried, looked
   * at, and tried again without the control going anywhere.
   */
  function toggleOptions(wrap, id, blockOnSheet) {
    if (openOpts && openOpts.id === id) { closeOptions({ keep: true }); return; }
    // Snapshot before anything is touched, so abandoning the panel restores exactly what was there.
    openOpts = { id, before: state.opts[id] ? { ...state.opts[id] } : undefined };
    draw();
  }

  function closeOptions({ keep }) {
    if (!openOpts) return;
    const { id, before } = openOpts;
    openOpts = null;
    if (keep) {
      // Keep closes the panel without redrawing, so everything the panel put on the item has to be
      // taken off by hand. Removing only the panel left is-optioning behind, and with it a block
      // whose drag, options and delete buttons never came back until something else forced a redraw.
      sheet.querySelectorAll('.ap-sheet__opts').forEach((n) => n.remove());
      sheet.querySelectorAll('.ap-sheet__item.is-optioning').forEach((n) => n.classList.remove('is-optioning'));
      return;
    }
    restoreOpts(id, before);
    draw();
  }

  /**
   * The options themselves, built into an already-rendered item.
   *
   * Width comes first and sits above the block rather than below it. It is the setting people
   * actually reach for, and it used to be underneath a chart that could be most of the page tall:
   * every adjustment meant scrolling down to the control, clicking, then scrolling back up to see
   * what it did. Above the block, the chip and its effect are visible at the same time.
   */
  function buildOptionsPanel(wrap, id, blockOnSheet) {
    const o = optsFor(id);
    const head = el('div', { class: 'ap-sheet__optbar' }, [
      el('span', { class: 'ap-sheet__optlabel', text: 'Width on the page' }),
      el('div', { class: 'ap-row' }, SPANS.map((s) => el('button', {
        class: 'ap-chip' + ((o.span || blockOnSheet.span || 12) === s.value ? ' is-active' : ''),
        type: 'button', text: s.label, 'aria-pressed': (o.span || blockOnSheet.span || 12) === s.value ? 'true' : 'false',
        onClick: () => { setOpt(id, { span: s.value }); draw(); },
      }))),
      el('div', { class: 'ap-sheet__optdone' }, [
        el('button', {
          class: 'ap-btn ap-btn--ghost ap-btn--sm', type: 'button', text: 'Cancel',
          title: 'Put this block back the way it was', onClick: () => closeOptions({ keep: false }),
        }),
        el('button', {
          class: 'ap-btn ap-btn--primary ap-btn--sm', type: 'button',
          title: 'Keep this and close', 'aria-label': 'Keep this width',
          onClick: () => closeOptions({ keep: true }),
        }, [icon('check'), el('span', { text: 'Keep' })]),
      ]),
    ]);
    const body = [head];

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
            'aria-pressed': on ? 'true' : 'false',
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
          text: n ? `First ${n}` : 'All rows', 'aria-pressed': (o.maxRows || 0) === n ? 'true' : 'false',
          onClick: () => { setOpt(id, { maxRows: n }); draw(); },
        }))),
      );
    }

    const panel = el('div', { class: 'ap-sheet__opts', role: 'group', 'aria-label': 'Options for this block' }, body);
    panel.addEventListener('click', (e) => e.stopPropagation());
    // Above the block, not after it. The tools are absolutely positioned, so flow order is free.
    wrap.prepend(panel);
    // The item's hover tools sit at its top-right corner, which is exactly where Keep and Cancel
    // land once the panel is the first child — at Full width they were drawn straight over them,
    // so the button you needed was underneath the button you did not. While the panel is open it
    // owns this block's controls and the tools stand down: the sliders button only reopens what is
    // already open, and Keep and Cancel are the two things anyone wants to press next.
    wrap.classList.add('is-optioning');
    return panel;
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
  // The widths still agree: on screen the sheet is one paper width wide with the margin as padding,
  // and on paper the page box is that width less two margins. Both leave the same content box.
  const pageStyle = el('style');
  const applyPaper = () => {
    pageStyle.textContent =
      `@media print {\n` +
      `  @page { size: ${paperOf().css}; margin: ${marginMm()}mm; }\n` +
      // Specificity beats site.css's fallback rule, so cascade order does not have to be trusted.
      `  body.ap-printing-layout .ap-layout .ap-sheet { padding: 0 !important; }\n` +
      `}`;
  };
  applyPaper();

  // A millimetre field. Committing on change rather than on every keystroke, because redrawing the
  // sheet on the way from "1" to "150" would repaginate twice for nothing and fight the caret.
  const mmField = (label, get, set, { min = 0, max = MAX_PAGE_MM } = {}) => {
    const input = el('input', {
      class: 'ap-mm__input', type: 'number', value: String(get()),
      min: String(min), max: String(max), step: '1', 'aria-label': label,
    });
    const commit = () => { set(input.value); input.value = String(get()); applyPaper(); draw(); };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
    // Enter in a number field would otherwise submit nothing and look broken.
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    return el('label', { class: 'ap-mm' }, [el('span', { text: label }), input, el('span', { class: 'ap-mm__unit', text: 'mm' })]);
  };

  const customFields = el('div', { class: 'ap-row ap-paper__custom' }, [
    mmField('W', () => clampPage(state.custom.w, 100), (v) => { state.custom.w = clampPage(v, state.custom.w); }, { min: MIN_PAGE_MM }),
    mmField('H', () => clampPage(state.custom.h, 150), (v) => { state.custom.h = clampPage(v, state.custom.h); }, { min: MIN_PAGE_MM }),
  ]);
  const marginField = mmField('Margin', () => marginMm(), (v) => {
    const n = Number(v);
    state.margin = Number.isFinite(n) ? Math.min(MAX_MARGIN_MM, Math.max(0, n)) : DEFAULT_MARGIN_MM;
  }, { max: MAX_MARGIN_MM });

  const chips = [];
  const syncChips = () => {
    for (const c of chips) c.classList.toggle('is-active', c.dataset.paper === state.paper);
    customFields.hidden = state.paper !== 'custom';
  };
  const chip = (id, label) => {
    const b = el('button', {
      class: 'ap-chip', type: 'button', text: label, dataset: { paper: id },
      onClick: () => {
        state.paper = id;
        // Label stock arrives with its own margin, since a die-cut label has no waste edge to give
        // away. Choosing office paper after that restores a normal one rather than printing a
        // letter hard against the trim.
        const stock = STOCKS[id];
        if (stock && typeof stock.margin === 'number') state.margin = stock.margin;
        else if (PAPERS[id] && marginMm() === 0) state.margin = DEFAULT_MARGIN_MM;
        syncChips();
        marginField.querySelector('input').value = String(marginMm());
        applyPaper();
        draw();
      },
    });
    chips.push(b);
    return b;
  };

  const paperPicker = el('div', { class: 'ap-row ap-paper' }, [
    ...Object.values(PAPERS).map((p) => chip(p.id, p.label)),
    el('span', { class: 'ap-paper__sep', 'aria-hidden': 'true' }),
    ...Object.values(STOCKS).map((s) => chip(s.id, s.label)),
    chip('custom', 'Custom'),
    customFields,
    marginField,
  ]);
  syncChips();

  // ---- Repeat once per record --------------------------------------------------------------
  //
  // The control that turns one document into a run of them. An Invoice block bound to a table
  // becomes every invoice in it; a QR block whose text reads %AssetTag becomes the asset tags.
  const tableSelect = el('select', { class: 'ap-mm__input ap-repeat__table', 'aria-label': 'Repeat for every row of' }, [
    el('option', { value: '', text: 'No repeat' }),
    ...(provider?.tables?.() || []).map((t) =>
      el('option', { value: t.id, text: t.label || t.id, selected: state.repeat.table === t.id })),
  ]);
  const repeatOpts = el('div', { class: 'ap-row ap-repeat__opts', hidden: !state.repeat.table });

  const limitField = mmField('First', () => Math.min(REPEAT_MAX, Math.max(1, Number(state.repeat.limit) || 1)),
    (v) => { const n = Number(v); state.repeat.limit = Math.min(REPEAT_MAX, Math.max(1, Number.isFinite(n) ? n : 1)); },
    { min: 1, max: REPEAT_MAX });
  limitField.querySelector('.ap-mm__unit').textContent = 'rows';

  const acrossSelect = el('select', { class: 'ap-mm__input', 'aria-label': 'Records across the page' },
    ACROSS.map((n) => el('option', { value: String(n), text: n === 1 ? '1 across' : `${n} across`, selected: state.repeat.across === n })));
  acrossSelect.addEventListener('change', () => { state.repeat.across = Number(acrossSelect.value) || 1; draw(); });

  const pageEach = el('input', { type: 'checkbox', checked: !!state.repeat.pageEach, 'aria-label': 'Start each record on its own page' });
  // Giving every record its own page settles how many fit across it: one. Leaving the choice live
  // would let the toolbar claim "3 across" over a preview showing nothing of the kind.
  const syncAcross = () => { acrossSelect.disabled = pageEach.checked; };
  pageEach.addEventListener('change', () => { state.repeat.pageEach = pageEach.checked; syncAcross(); draw(); });
  syncAcross();

  repeatOpts.append(limitField, acrossSelect,
    el('label', { class: 'ap-mm' }, [pageEach, el('span', { text: 'Own page' })]));

  tableSelect.addEventListener('change', () => {
    state.repeat.table = tableSelect.value || null;
    repeatOpts.hidden = !state.repeat.table;
    draw();
  });

  const repeatPicker = el('div', { class: 'ap-row ap-repeat' }, [
    el('span', { class: 'ap-paper__sep', 'aria-hidden': 'true' }),
    el('span', { class: 'ap-mm', text: 'Repeat' }),
    tableSelect,
    repeatOpts,
  ]);

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
      repeatPicker,
      pageInfo,
      el('button', { class: 'ap-btn ap-btn--icon ap-layout__x', type: 'button', 'aria-label': 'Close', onClick: close }, [icon('close')]),
    ]),
    el('div', { class: 'ap-layout__scroll' }, [paperEl]),
    el('div', { class: 'ap-layout__foot' }, footerBtns),
  ]);

  document.head.appendChild(pageStyle);
  document.body.appendChild(overlay);
  draw();

  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // An open panel is the innermost thing, so Escape dismisses that first — losing the whole
    // layout screen because someone wanted out of a width picker would be its own small disaster.
    if (openOpts) { closeOptions({ keep: false }); return; }
    close();
  });
  return overlay;
}

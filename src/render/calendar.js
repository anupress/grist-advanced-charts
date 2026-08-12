// Calendar block: a month grid of a table's rows plotted by a date column, with optional
// drag-to-reschedule (writes the new date back to the source table) and a polling pass so edits
// made directly in Grist while this widget is open eventually appear here too. This app has no
// live push/subscribe channel to Grist (every other block is a one-shot read) — "syncs to the
// widget" here means "picked up on the next poll" (mountCalendars, ~15s), not instant.
//
// Real interactivity (drag writes, popovers, polling) is gated behind ctx.edit === null — a
// genuinely live page, matching Button/Icon/Pricing's clickTarget pattern — so a stray drag in
// the editor's own preview or while our widget is in design-edit mode can't silently rewrite data.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { currentSeriesColors } from '../theme/apply.js';
import { zoneOfType, dayToEpochSeconds } from '../grist/dates.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Grist Date/DateTime cells arrive here already turned into "YYYY-MM-DD[ HH:MM...]" strings by
// bridge.js's getRecords() (demo data uses the same string shape natively) — parsed via explicit
// local Y/M/D components, not new Date(string), which JS treats a bare date string as UTC
// midnight and can shift the event onto the wrong day in timezones behind UTC.
function parseDateLocal(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return new Date(v * 1000); // raw Grist epoch-seconds, unconverted
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function buildColorMap(rows, column) {
  if (!column) return null;
  const palette = currentSeriesColors();
  const map = new Map();
  for (const r of rows) {
    const v = r[column];
    const key = v == null || v === '' ? '' : String(v);
    if (!map.has(key)) map.set(key, palette[map.size % palette.length]);
  }
  return map;
}

export function renderCalendar(block, ctx) {
  const c = block.config || {};
  const table = c.table || ctx.config?.dataTable;
  const isLivePage = ctx.edit === null;
  const canDrag = isLivePage && c.draggable !== false;

  const state = { view: new Date(), rows: ctx.provider.records(table) || [] };
  state.view.setDate(1);

  // Detail fields shown in the click popover — plural now, mirroring the map's tooltip. Reads the
  // new `detailColumns` array, falling back to the old single `detailColumn` so configs/templates
  // saved before this still work. Each field renders as "Label: value" using the real column label.
  const columns = ctx.provider.columns(table) || [];
  const colLabel = (id) => columns.find((x) => x.id === id)?.label || id;
  const detailCols = (c.detailColumns && c.detailColumns.length
    ? c.detailColumns
    : (c.detailColumn ? [c.detailColumn] : [])).filter(Boolean);

  const monthLabel = el('span', { class: 'ap-calendar__monthlabel' });
  const grid = el('div', { class: 'ap-calendar__grid' });
  const popover = el('div', { class: 'ap-calendar__popover' });
  popover.hidden = true;

  function closePopover() { popover.hidden = true; }

  function detailRows(row) {
    return detailCols
      .filter((col) => row[col] != null && row[col] !== '')
      .map((col) => el('div', { class: 'ap-calendar__pop-detail' }, [
        el('span', { class: 'ap-calendar__pop-label', text: colLabel(col) + ': ' }),
        el('span', { text: String(row[col]) }),
      ]));
  }

  function placePopover(anchorEl) {
    const body = grid.parentElement;
    const hostRect = body.getBoundingClientRect(), r = anchorEl.getBoundingClientRect();
    popover.hidden = false;
    popover.style.left = Math.max(4, Math.min(r.left - hostRect.left, hostRect.width - 200)) + 'px';
    popover.style.top = (r.bottom - hostRect.top + 6) + 'px';
  }

  function showPopover(anchorEl, row) {
    popover.classList.remove('is-daylist');
    popover.replaceChildren(
      el('div', { class: 'ap-calendar__pop-title', text: String(row[c.titleColumn] ?? 'Untitled') }),
      ...detailRows(row),
    );
    placePopover(anchorEl);
  }

  // A cell only has room for three pills. Without this, every event past the third is unreachable —
  // on a busy calendar (a sports complex books its courts ten times a day) that is most of them.
  function showDayPopover(anchorEl, d, dayEvents) {
    popover.classList.add('is-daylist');
    popover.replaceChildren(
      el('div', { class: 'ap-calendar__pop-title',
        text: `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${dayEvents.length}` }),
      ...dayEvents.map(({ r }) => el('div', { class: 'ap-calendar__pop-item' }, [
        el('div', { class: 'ap-calendar__pop-itemtitle', text: String(r[c.titleColumn] ?? 'Untitled') }),
        ...detailRows(r),
      ])),
    );
    placePopover(anchorEl);
  }

  // Rows bucketed by day, built once per redraw.
  //
  // This used to be a function called once per grid cell, each call walking every row and parsing
  // every date — 42 x n parses for one month. Measured at 5,000 rows (the ceiling on Grist's free
  // tier; paid plans go to 100,000) that was ~485ms of frozen UI per click of the month arrows.
  // Grouping first makes it n.
  function buildDayIndex() {
    const index = new Map();
    for (const r of state.rows) {
      const d = parseDateLocal(r[c.dateColumn]);
      if (!d) continue;
      const key = dayKey(d);
      let bucket = index.get(key);
      if (!bucket) { bucket = []; index.set(key, bucket); }
      bucket.push({ r, d });
    }
    return index;
  }

  function eventPill(row, cmap) {
    const color = cmap ? cmap.get(row[c.colorBy] == null ? '' : String(row[c.colorBy])) : null;
    const pill = el('div', {
      class: 'ap-calendar__event', style: { '--ap-cal-dot': color || 'var(--ap-primary)' },
      draggable: canDrag, text: String(row[c.titleColumn] ?? 'Untitled'),
    });
    pill.addEventListener('click', (e) => { e.stopPropagation(); showPopover(pill, row); });
    if (canDrag) {
      pill.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(row.id)); pill.classList.add('is-dragging'); });
      pill.addEventListener('dragend', () => pill.classList.remove('is-dragging'));
    }
    return pill;
  }

  async function dropOn(key, rowId) {
    const row = state.rows.find((r) => r.id === rowId);
    if (!row) return;
    const [yy, mm, dd] = key.split('-').map(Number);
    const prevValue = row[c.dateColumn];
    row[c.dateColumn] = dateStr(yy, mm - 1, dd); // optimistic move, redrawn immediately below
    redraw();
    // Demo rows are plain strings end to end; real Grist stores Date/DateTime as epoch seconds.
    //
    // This used to build `new Date(yy, mm-1, dd)` — LOCAL midnight — and store that. Read back in
    // UTC, local midnight is still the previous day for anyone at a positive offset, so dropping
    // an event on the 15th filed it under the 14th across Europe, Asia, Africa east of Greenwich,
    // Australia and New Zealand. dayToEpochSeconds() takes the column's own zone into account:
    // UTC midnight for a Date column, midnight in the column's zone for a DateTime one.
    const zone = zoneOfType(columns.find((col) => col.id === c.dateColumn)?.type);
    const writeValue = ctx.provider.isLive
      ? dayToEpochSeconds(yy, mm - 1, dd, zone || null)
      : dateStr(yy, mm - 1, dd);
    const ok = await ctx.provider.updateRecord(table, rowId, { [c.dateColumn]: writeValue });
    if (!ok) { row[c.dateColumn] = prevValue; redraw(); }
  }

  function wireDropTarget(cell, key) {
    cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('is-droptarget'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('is-droptarget'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('is-droptarget');
      dropOn(key, Number(e.dataTransfer.getData('text/plain')));
    });
  }

  function redraw() {
    const cmap = buildColorMap(state.rows, c.colorBy);
    const dayIndex = buildDayIndex();
    const y = state.view.getFullYear(), m = state.view.getMonth();
    monthLabel.textContent = `${MONTHS[m]} ${y}`;
    const startWeekday = new Date(y, m, 1).getDay();
    const gridStart = new Date(y, m, 1 - startWeekday);
    const todayKey = dayKey(new Date());

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const key = dayKey(d);
      const dayEvents = dayIndex.get(key) || [];
      const shown = dayEvents.slice(0, 3).map(({ r }) => eventPill(r, cmap));
      if (dayEvents.length > 3) {
        const moreEl = el('div', { class: 'ap-calendar__more', text: `+${dayEvents.length - 3} more` });
        moreEl.addEventListener('click', (e) => { e.stopPropagation(); showDayPopover(moreEl, d, dayEvents); });
        shown.push(moreEl);
      }
      const cell = el('div', {
        class: 'ap-calendar__cell' + (d.getMonth() !== m ? ' is-outside' : '') + (key === todayKey ? ' is-today' : ''),
      }, [el('div', { class: 'ap-calendar__daynum', text: String(d.getDate()) }), el('div', { class: 'ap-calendar__events' }, shown)]);
      if (canDrag) wireDropTarget(cell, key);
      cells.push(cell);
    }
    grid.replaceChildren(...cells);
  }
  redraw();

  const nav = el('div', { class: 'ap-calendar__nav' }, [
    el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-calendar__prev', 'aria-label': 'Previous month',
      onClick: () => { state.view.setMonth(state.view.getMonth() - 1); closePopover(); redraw(); } }, [icon('chevron')]),
    monthLabel,
    el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ap-calendar__next', 'aria-label': 'Next month',
      onClick: () => { state.view.setMonth(state.view.getMonth() + 1); closePopover(); redraw(); } }, [icon('chevron')]),
    el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', text: 'Today',
      onClick: () => { state.view = new Date(); state.view.setDate(1); closePopover(); redraw(); } }),
  ]);

  const body = el('div', { class: 'ap-calendar__body' }, [grid, popover]);
  // Clicking inside the popover itself must not dismiss it — the day list is scrollable and
  // clickable, so only a click on the grid background counts as "dismiss".
  body.addEventListener('click', (e) => {
    if (!e.target.closest('.ap-calendar__event, .ap-calendar__more, .ap-calendar__popover')) closePopover();
  });

  const card = el('div', { class: 'ap-card ap-calendar', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-calendar__head' }, [el('div', { class: 'ap-calendar__title', text: c.title || 'Calendar' }), nav]),
    el('div', { class: 'ap-calendar__weekdays' }, WEEKDAYS.map((w) => el('span', { text: w }))),
    body,
  ]);

  // Polling state, read by mountCalendars() — only on a genuinely live page (see file header).
  if (isLivePage) card._apCalendar = { table, ctx, setRows: (rows) => { state.rows = rows; redraw(); } };
  return card;
}

const _seen = new WeakSet();
const POLL_MS = 15000;

// The poll used to run unconditionally: every 15 seconds, forever, it re-fetched the calendar's
// whole table whether or not anyone could see it. In a Grist document that shows up as an endless
// run of identical fetchTable calls for one table — the calendar's tab might not even be the one
// on screen, and the browser tab might be in the background.
//
// It now only fetches when the calendar is actually visible, and catches up immediately when it
// becomes visible again rather than leaving stale data on screen for up to another 15 seconds.
export function mountCalendars(scope) {
  (scope || document).querySelectorAll('.ap-calendar').forEach((card) => {
    if (_seen.has(card)) return;
    _seen.add(card);
    const s = card._apCalendar;
    if (!s) return;

    let inFlight = false;   // a slow fetch must not stack up behind the next tick
    let missed = false;     // something changed while we weren't looking — refresh on return

    // offsetParent is null when the element or an ancestor is display:none, which is exactly how
    // a hidden tab panel renders. document.hidden covers the backgrounded browser tab.
    const visible = () => !document.hidden && card.offsetParent !== null;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try { s.setRows(await s.ctx.provider.refresh(s.table)); } finally { inFlight = false; }
    }

    const intervalId = setInterval(() => {
      if (!document.contains(card)) { clearInterval(intervalId); document.removeEventListener('visibilitychange', onVis); return; }
      if (!visible()) { missed = true; return; }
      poll();
    }, POLL_MS);

    function onVis() { if (!document.hidden && missed && card.offsetParent !== null) { missed = false; poll(); } }
    document.addEventListener('visibilitychange', onVis);
    // Switching back to the calendar's own page fires no visibilitychange, so catch that too.
    card.addEventListener('ap:shown', onVis);
  });
}

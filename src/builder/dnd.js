// Drag-and-drop reordering via the vendored SortableJS. Only real blocks (with a
// data-block-id) drag; the "add block" tile stays put.

const SJS = () => window.Sortable;

// SortableJS's own pointer dragging rather than the browser's drag and drop: the block follows the
// pointer as itself, the same with a mouse, a pen or a finger, and a drag needs nothing but pointer
// events to start (3.10.13). A few pixels of travel before it starts, so a click on a handle is
// still a click.
const POINTER = { forceFallback: true, fallbackTolerance: 4 };

// Only the page's own blocks drag. A block inside a Grid block is also an .ap-block, but it lives
// in a cell, not in the page list; it carries no drag handle, and it must not count when the new
// order is read back, or the page order would be computed from ids it does not contain.
export function makeBlocksSortable(gridEl, onReorder) {
  if (!SJS() || !gridEl) return null;
  return SJS().create(gridEl, {
    ...POINTER,
    handle: '.ap-drag-handle',
    draggable: '.ap-grid > .ap-block[data-block-id]',
    animation: 160,
    ghostClass: 'ap-sortable-ghost',
    chosenClass: 'ap-sortable-chosen',
    onEnd: () => onReorder([...gridEl.querySelectorAll(':scope > .ap-block[data-block-id]')].map((b) => b.dataset.blockId)),
  });
}

export function makeTabsSortable(navEl, onReorder) {
  if (!SJS() || !navEl) return null;
  return SJS().create(navEl, {
    ...POINTER,
    draggable: '.ap-nav__link[data-tab]',
    animation: 160,
    ghostClass: 'ap-sortable-ghost',
    onEnd: () => onReorder([...navEl.querySelectorAll('.ap-nav__link[data-tab]')].map((a) => a.dataset.tab)),
  });
}

// Reorder the rows in the Pages panel (drag by the grip handle).
export function makePagesSortable(host, onReorder) {
  if (!SJS() || !host) return null;
  return SJS().create(host, {
    ...POINTER,
    handle: '.ap-tab-grip',
    draggable: '.ap-tabedit',
    animation: 160,
    ghostClass: 'ap-sortable-ghost',
    chosenClass: 'ap-sortable-chosen',
    onEnd: () => onReorder([...host.querySelectorAll('.ap-tabedit')].map((e) => e.dataset.tabId)),
  });
}

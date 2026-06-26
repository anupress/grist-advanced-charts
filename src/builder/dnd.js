// Drag-and-drop reordering via the vendored SortableJS. Only real blocks (with a
// data-block-id) drag; the "add block" tile stays put.

const SJS = () => window.Sortable;

export function makeBlocksSortable(gridEl, onReorder) {
  if (!SJS() || !gridEl) return null;
  return SJS().create(gridEl, {
    handle: '.ap-drag-handle',
    draggable: '.ap-block[data-block-id]',
    animation: 160,
    ghostClass: 'ap-sortable-ghost',
    chosenClass: 'ap-sortable-chosen',
    onEnd: () => onReorder([...gridEl.querySelectorAll('.ap-block[data-block-id]')].map((b) => b.dataset.blockId)),
  });
}

export function makeTabsSortable(navEl, onReorder) {
  if (!SJS() || !navEl) return null;
  return SJS().create(navEl, {
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
    handle: '.ap-tab-grip',
    draggable: '.ap-tabedit',
    animation: 160,
    ghostClass: 'ap-sortable-ghost',
    chosenClass: 'ap-sortable-chosen',
    onEnd: () => onReorder([...host.querySelectorAll('.ap-tabedit')].map((e) => e.dataset.tabId)),
  });
}

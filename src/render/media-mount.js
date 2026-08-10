// Shared lazy-mount pass for images backed by a Grist Attachment column — mirrors the existing
// mountCharts()/mountMaps() pattern in charts/echarts-adapter.js and render/map.js. A block
// renderer builds a plain <img> up front (no src yet) and calls markAttachmentImg() to stash a
// {table,column,row} reference; mountAttachmentImages() resolves it once the node is mounted.
// Used by both the Image block and Testimonials' data-mode photos.

import * as bridge from '../grist/bridge.js';

export function markAttachmentImg(imgEl, { provider, table, column, row }) {
  imgEl.dataset.attPending = '1';
  imgEl._apAttRef = { provider, table, column, row };
}

export async function mountAttachmentImages(scope) {
  const nodes = (scope || document).querySelectorAll('img[data-att-pending]');
  await Promise.all([...nodes].map(async (imgEl) => {
    imgEl.removeAttribute('data-att-pending');
    const ref = imgEl._apAttRef;
    if (!ref?.provider) return;
    try {
      await ref.provider.prime?.([ref.table]);
      const rec = ref.provider.records(ref.table).find((r) => r.id === ref.row);
      const att = rec ? await bridge.resolveAttachmentCell(rec[ref.column]) : null;
      if (att?.url) { imgEl.src = att.url; imgEl.alt = imgEl.alt || att.fileName || ''; }
      else imgEl.dispatchEvent(new CustomEvent('ap-att-empty', { bubbles: true }));
    } catch (e) {
      console.warn('[ANUPRESS] attachment image resolve failed', e);
      imgEl.dispatchEvent(new CustomEvent('ap-att-empty', { bubbles: true }));
    }
  }));
}

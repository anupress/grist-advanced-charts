// Image block: either a plain uploaded image (base64, works anywhere, no Grist needed) or a
// live reference to a Grist Attachments-column cell (resolved lazily — see media-mount.js,
// mirroring the mountCharts/mountMaps pattern). Optionally wrapped in a link, same idea as
// Button/Icon's clickTarget in blocks.js but wrapping an existing child instead of building one.

import { el, fromHTML } from '../util.js';
import { EMPTY_ART } from '../assets/icons.js';
import { markAttachmentImg } from './media-mount.js';

function emptyState() {
  return el('div', { class: 'ap-empty ap-image__empty' }, [fromHTML(EMPTY_ART), el('div', { text: 'No image set yet.' })]);
}

// See blocks.js's clickTarget for why ctx.edit === null is the "genuinely live page" signal:
// real link-following/tab-nav must not fire while editing or inside the editor's own preview.
function wrapLink(node, link, ctx) {
  if (!link?.kind) return node;
  const isLivePage = ctx.edit === null;
  if (link.kind === 'url' && link.url) {
    const a = el('a', { class: 'ap-image__link', href: link.url, target: link.newTab ? '_blank' : null, rel: link.newTab ? 'noopener noreferrer' : null }, [node]);
    a.addEventListener('click', (e) => { if (!isLivePage) e.preventDefault(); });
    return a;
  }
  if (link.kind === 'tab' && link.tab) {
    const b = el('button', { class: 'ap-image__link', type: 'button' }, [node]);
    b.addEventListener('click', (e) => { if (!isLivePage) { e.preventDefault(); return; } ctx.onNav?.(link.tab); });
    return b;
  }
  return node;
}

export function renderImage(block, ctx) {
  const c = block.config || {};
  const fit = c.fit === 'contain' ? 'contain' : 'cover';
  const mediaHost = el('div', { class: 'ap-image__media' });

  if (c.mode === 'attachment' && c.ref?.table && c.ref?.column && c.ref?.row != null) {
    const img = el('img', { alt: c.alt || '', style: { objectFit: fit } });
    markAttachmentImg(img, { provider: ctx.provider, table: c.ref.table, column: c.ref.column, row: c.ref.row });
    img.addEventListener('ap-att-empty', () => mediaHost.replaceChildren(emptyState()));
    mediaHost.append(img);
  } else if (c.mode !== 'attachment' && c.imageData) {
    mediaHost.append(el('img', { src: c.imageData, alt: c.alt || '', style: { objectFit: fit } }));
  } else {
    mediaHost.append(emptyState());
  }

  return el('div', { class: 'ap-card ap-image', dataset: { blockId: block.id } }, [
    wrapLink(mediaHost, c.link, ctx),
    c.caption ? el('div', { class: 'ap-image__caption', text: c.caption }) : null,
  ]);
}

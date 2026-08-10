// Testimonials block: a responsive grid of quote cards, either typed in by hand (manual mode,
// the default — works immediately in demo mode) or bound to a table's rows (data mode). Photos
// reuse the same attachment-resolution mechanism as the Image block; a row/entry with no photo
// falls back to an initial-letter avatar instead of a broken image.

import { el, fromHTML } from '../util.js';
import { icon, EMPTY_ART } from '../assets/icons.js';
import { markAttachmentImg } from './media-mount.js';

function avatarPlaceholder(name) {
  return el('div', { class: 'ap-testimonial__avatar ap-testimonial__avatar--ph' }, [(name || '?').trim().slice(0, 1).toUpperCase() || '?']);
}

function stars(n) {
  const full = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return el('div', { class: 'ap-testimonial__stars', 'aria-label': `${full} out of 5 stars` },
    Array.from({ length: 5 }, (_, i) => {
      const s = icon('star', 'ap-testimonial__star' + (i < full ? ' is-on' : ''));
      return s;
    }));
}

function card(name, quote, rating, photoNode) {
  return el('div', { class: 'ap-testimonial' }, [
    el('div', { class: 'ap-testimonial__head' }, [
      photoNode || avatarPlaceholder(name),
      el('div', { style: { minWidth: 0 } }, [
        el('div', { class: 'ap-testimonial__name', text: name || 'Anonymous' }),
        rating != null ? stars(rating) : null,
      ]),
    ]),
    quote ? el('div', { class: 'ap-testimonial__quote', text: quote }) : null,
  ]);
}

function emptyState() {
  return el('div', { class: 'ap-empty' }, [fromHTML(EMPTY_ART), el('div', { text: 'No testimonials yet.' })]);
}

export function renderTestimonials(block, ctx) {
  const c = block.config || {};
  let items;

  if (c.mode === 'data' && c.table && c.nameColumn) {
    const rows = (ctx.provider.records(c.table) || []).slice(0, Math.max(1, c.limit || 6));
    items = rows.map((r) => {
      let photoNode = null;
      if (c.photoColumn) {
        photoNode = el('img', { class: 'ap-testimonial__avatar', alt: '' });
        markAttachmentImg(photoNode, { provider: ctx.provider, table: c.table, column: c.photoColumn, row: r.id });
        photoNode.addEventListener('ap-att-empty', () => photoNode.replaceWith(avatarPlaceholder(r[c.nameColumn])));
      }
      return card(r[c.nameColumn], c.quoteColumn ? r[c.quoteColumn] : '', c.ratingColumn ? r[c.ratingColumn] : null, photoNode);
    });
  } else {
    items = (c.entries || []).map((e) =>
      card(e.name, e.quote, e.rating, e.photoData ? el('img', { class: 'ap-testimonial__avatar', src: e.photoData, alt: '' }) : null));
  }

  return el('div', { class: 'ap-card ap-testimonials', dataset: { blockId: block.id } }, [
    c.title ? el('h3', { class: 'ap-testimonials__title', text: c.title }) : null,
    el('div', { class: 'ap-testimonials__grid' }, items.length ? items : [emptyState()]),
  ]);
}

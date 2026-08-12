// QR Code block: renders the encoder's module matrix as a single compact SVG path (one "MhVh-1z"
// per dark module — far lighter than one <rect> per module for larger codes). Everything happens
// client-side; see qr/encoder.js for why versions are capped at 6 and the correctness testing
// that went into it.

import { el, fromHTML } from '../util.js';
import { encodeQR } from '../qr/encoder.js';

function buildSvg(modCount, modules, pixelSize, fg, bg, label) {
  const quiet = 4; // standard 4-module quiet zone, required for reliable scanning
  const total = modCount + quiet * 2;
  let path = '';
  for (let r = 0; r < modCount; r++) for (let c = 0; c < modCount; c++) {
    if (modules[r][c]) path += `M${c + quiet},${r + quiet}h1v1h-1z`;
  }
  const esc = (s) => String(s).replace(/"/g, '&quot;');
  // Unlike the icons and sparklines, this one is NOT decorative — the whole point of the block is
  // the content encoded in it, which a sighted user can reach with a phone and a screen reader
  // user otherwise cannot reach at all. role="img" plus the encoded text as the name gives them
  // the destination directly.
  return fromHTML(
    `<svg viewBox="0 0 ${total} ${total}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges" ` +
    `role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${total}" height="${total}" fill="${esc(bg)}"/><path d="${path}" fill="${esc(fg)}"/></svg>`,
  );
}

export function renderQRCode(block) {
  const c = block.config || {};
  const text = c.text || '';
  const size = Math.max(80, Math.min(600, Number(c.size) || 200));
  const level = ['L', 'M', 'Q', 'H'].includes(c.level) ? c.level : 'M';

  let content;
  if (!text.trim()) {
    content = el('div', { class: 'ap-qr__empty', text: 'Add a link or text to generate a code.' });
  } else {
    try {
      const { size: modCount, modules } = encodeQR(text, level);
      const label = c.caption ? `QR code: ${c.caption} (${text})` : `QR code for ${text}`;
      content = buildSvg(modCount, modules, size, c.fg || '#000000', c.bg || '#ffffff', label);
    } catch (e) {
      content = el('div', { class: 'ap-qr__empty', text: e.message });
    }
  }
  return el('div', { class: 'ap-card ap-qr', dataset: { blockId: block.id } }, [
    content,
    c.caption ? el('div', { class: 'ap-qr__caption', text: c.caption }) : null,
  ]);
}

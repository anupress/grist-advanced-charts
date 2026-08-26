// Barcode block: Code 128, EAN-13, EAN-8 and UPC-A, drawn at a real physical size.
//
// This block is measured in millimetres rather than pixels, and that is the whole design. A QR code
// that prints slightly small still scans, because its error correction and two-dimensional finder
// patterns give a reader plenty to work with. A linear barcode has neither. It is read by timing
// the widths of bars against the narrowest one, so if the browser scales the symbol by 0.9 to make
// it fit a card, every width is wrong together and the scan fails — silently, on a printed sheet
// nobody checks until a till rejects it.
//
// So: the SVG carries width and height in mm, the stylesheet is forbidden from shrinking it, and
// the quiet zone is drawn as part of the symbol rather than left to padding a theme could remove.

import { el, fromHTML } from '../util.js';
import { encodeLinear, SYMBOLOGIES } from '../barcode/linear.js';

// The narrowest bar, in mm. 0.33 is the nominal module for EAN at 100% magnification, and a sane
// default for Code 128 on an office printer — below about 0.25 a laser printer's toner spread
// starts closing the gaps and hand scanners begin to struggle.
export const DEFAULT_MODULE_MM = 0.33;
export const MIN_MODULE_MM = 0.19;
export const MAX_MODULE_MM = 1.5;
export const DEFAULT_HEIGHT_MM = 18;

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * The symbol as SVG, sized in millimetres.
 *
 * The viewBox counts modules, so every bar lands on an integer boundary and no bar is ever drawn
 * half a module wide. The width attribute then maps those modules onto real paper. Bars are emitted
 * as one path of runs rather than a rect each, which keeps a 200-module symbol to a single element.
 */
function buildSvg({ modules, quietZone, moduleMm, heightMm, fg, bg, label }) {
  const total = modules.length + quietZone * 2;
  let path = '';
  let run = 0;
  for (let i = 0; i <= modules.length; i++) {
    if (modules[i] === 1) { run++; continue; }
    if (run) { path += `M${quietZone + i - run},0h${run}v1h-${run}z`; run = 0; }
  }
  const esc = (s) => String(s).replace(/"/g, '&quot;');
  const wMm = +(total * moduleMm).toFixed(3);
  // preserveAspectRatio="none" would let a bar stretch independently of its neighbours; the default
  // keeps the ratio, and the explicit mm width means nothing needs to stretch in the first place.
  return fromHTML(
    `<svg viewBox="0 0 ${total} 1" width="${wMm}mm" height="${heightMm}mm" preserveAspectRatio="none" ` +
    `shape-rendering="crispEdges" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${total}" height="1" fill="${esc(bg)}"/><path d="${path}" fill="${esc(fg)}"/></svg>`,
  );
}

/**
 * EAN and UPC print their digits in a particular arrangement — one outside the symbol on the left,
 * then two groups under each half — because that layout is how a person reads the number back when
 * the scan fails. Code 128 has no such convention, so its text simply sits underneath.
 */
function humanText(result, symbology) {
  const t = result.displayText;
  if (symbology === 'ean13') return [t.slice(0, 1), t.slice(1, 7), t.slice(7)];
  if (symbology === 'upca') return [t.slice(0, 1), t.slice(1, 6), t.slice(6, 11), t.slice(11)];
  if (symbology === 'ean8') return ['', t.slice(0, 4), t.slice(4)];
  return [t];
}

export function renderBarcode(block) {
  const c = block.config || {};
  const symbology = c.symbology in SYMBOLOGIES ? c.symbology : 'code128';
  const value = String(c.value ?? '').trim();
  const moduleMm = clamp(c.moduleMm, MIN_MODULE_MM, MAX_MODULE_MM, DEFAULT_MODULE_MM);
  const heightMm = clamp(c.heightMm, 5, 120, DEFAULT_HEIGHT_MM);
  const showText = c.showText !== false;

  let content = null;
  let textParts = null;
  if (!value) {
    content = el('div', { class: 'ap-qr__empty', text: 'Add a number or code to generate a barcode.' });
  } else {
    try {
      const result = encodeLinear(value, symbology);
      const label = `${SYMBOLOGIES[symbology].label} barcode for ${result.displayText}`;
      content = buildSvg({
        modules: result.modules, quietZone: result.quietZone, moduleMm, heightMm,
        fg: c.fg || '#000000', bg: c.bg || '#ffffff', label,
      });
      if (showText) textParts = humanText(result, symbology);
    } catch (e) {
      // The message names what is wrong with the input — a wrong digit count, a character the
      // symbology cannot carry — because on a label the alternative is a blank space nobody
      // notices until the sheet is printed.
      content = el('div', { class: 'ap-qr__empty', text: e.message });
    }
  }

  return el('div', { class: 'ap-card ap-barcode', dataset: { blockId: block.id, symbology } }, [
    content,
    textParts ? el('div', { class: 'ap-barcode__text', dataset: { parts: String(textParts.length) } },
      textParts.map((p) => el('span', { text: p }))) : null,
    c.caption ? el('div', { class: 'ap-qr__caption', text: c.caption }) : null,
  ]);
}

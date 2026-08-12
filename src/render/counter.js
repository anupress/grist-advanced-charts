// Counter block: a static start->end number that counts up once it scrolls into view
// (Elementor-style). renderCounter() builds the at-rest DOM (showing the start value);
// mountCounters() — called from site.js's mountTab(), mirroring mountCharts/mountMaps — wires
// up the actual animation once the node is in the document.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';

function fmtCounterValue(n, c) {
  const decimals = Math.max(0, Math.min(4, Number(c.decimals) || 0));
  return (c.prefix || '') + Number(n).toFixed(decimals) + (c.suffix || '');
}

export function renderCounter(block) {
  const c = block.config || {};
  const start = Number(c.start) || 0;
  const card = el('div', { class: 'ap-card ap-counter', dataset: { blockId: block.id } }, [
    (c.icon || c.iconData) ? el('div', { class: 'ap-counter__icon' }, [
      c.iconData ? el('img', { src: c.iconData, alt: '', style: { width: '22px', height: '22px', objectFit: 'contain' } }) : icon(c.icon || 'sparkles'),
    ]) : null,
    el('div', { class: 'ap-counter__value', text: fmtCounterValue(start, c) }),
    c.label ? el('div', { class: 'ap-counter__label', text: c.label }) : null,
  ]);
  card._apCounter = c;
  return card;
}

// Per-node dedupe (module-level, survives across mount passes) — mountTab() calls its mount
// functions twice in quick succession (immediate + a settle timeout), and a tab can be
// revisited; without this a counter would get a second IntersectionObserver each time.
const _seen = new WeakSet();
let _reduceMotion = null;
function prefersReducedMotion() {
  if (_reduceMotion == null) {
    try { _reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { _reduceMotion = false; }
  }
  return _reduceMotion;
}

export function mountCounters(scope) {
  (scope || document).querySelectorAll('.ap-counter').forEach((card) => {
    if (_seen.has(card)) return;
    _seen.add(card);
    const c = card._apCounter;
    const valueEl = card.querySelector('.ap-counter__value');
    if (!c || !valueEl) return;
    const start = Number(c.start) || 0;
    const end = Number(c.end ?? 100);
    if (prefersReducedMotion()) { valueEl.textContent = fmtCounterValue(end, c); return; }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.disconnect();
        animate(valueEl, start, end, c);
      }
    }, { threshold: 0.4 });
    io.observe(card);
  });
}

function animate(valueEl, start, end, c) {
  const duration = Math.max(200, Number(c.duration) || 1400);
  const t0 = performance.now();
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    valueEl.textContent = fmtCounterValue(end, c);
  }
  function tick(now) {
    if (done) return;
    const p = Math.min(1, (now - t0) / duration);
    if (p >= 1) { finish(); return; }
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    valueEl.textContent = fmtCounterValue(start + (end - start) * eased, c);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // Safety net: rAF never fires while the page is not compositing (an inactive Grist tab, a
  // background preview). Without this the counter would sit on its START value — a card reading
  // a permanent "0 Block types" — because the animation that was going to fill it never ran.
  // setTimeout does fire when backgrounded, so it snaps to the real number.
  setTimeout(finish, duration + 120);
}

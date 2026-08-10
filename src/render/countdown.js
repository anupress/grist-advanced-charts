// Countdown Timer block: ticks every second while its card is on screen. Mirrors counter.js's
// lazy-mount pattern (WeakSet dedupe against the twice-per-visit mount pass) but — unlike
// Counter, which animates once and stops — keeps a live setInterval running for as long as the
// card stays in the document, and clears it once the card is removed (tab switch, block
// deleted) so it doesn't keep ticking a detached node forever.

import { el } from '../util.js';

function remaining(targetMs) {
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
function unit(value, label, color) {
  return el('div', { class: 'ap-countdown__unit' }, [
    el('div', { class: 'ap-countdown__num', style: { color: color || 'var(--ap-primary)' }, text: String(value).padStart(2, '0') }),
    el('div', { class: 'ap-countdown__label', text: label }),
  ]);
}
// Returns false once expired (caller stops ticking).
function renderUnits(host, targetMs, expiredText, color) {
  const r = remaining(targetMs);
  if (!r) { host.replaceChildren(el('div', { class: 'ap-countdown__expired', text: expiredText || 'This has ended.' })); return false; }
  host.replaceChildren(unit(r.days, 'Days', color), unit(r.hours, 'Hours', color), unit(r.minutes, 'Min', color), unit(r.seconds, 'Sec', color));
  return true;
}

export function renderCountdown(block) {
  const c = block.config || {};
  const targetMs = Date.parse(c.targetDate || '') || (Date.now() + 86400000);
  const unitsHost = el('div', { class: 'ap-countdown__units' });
  renderUnits(unitsHost, targetMs, c.expiredText, c.color);
  const card = el('div', { class: 'ap-card ap-countdown', dataset: { blockId: block.id } }, [
    c.title ? el('div', { class: 'ap-countdown__title', text: c.title }) : null,
    unitsHost,
  ]);
  card._apCountdown = { targetMs, expiredText: c.expiredText, color: c.color, unitsHost };
  return card;
}

const _seen = new WeakSet();
export function mountCountdowns(scope) {
  (scope || document).querySelectorAll('.ap-countdown').forEach((card) => {
    if (_seen.has(card)) return;
    _seen.add(card);
    const state = card._apCountdown;
    if (!state) return;
    const intervalId = setInterval(() => {
      if (!document.contains(card)) { clearInterval(intervalId); return; }
      if (!renderUnits(state.unitsHost, state.targetMs, state.expiredText, state.color)) clearInterval(intervalId);
    }, 1000);
  });
}

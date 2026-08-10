// Timeline block: a static vertical list of milestones. No lazy-mount pass needed — unlike
// Counter/Countdown there's no animation or ticking, so a plain synchronous render is enough.

import { el } from '../util.js';

export function renderTimeline(block) {
  const c = block.config || {};
  const items = c.items?.length ? c.items : [{ date: '', title: 'Milestone', description: '' }];
  return el('div', { class: 'ap-card ap-timeline', dataset: { blockId: block.id } }, [
    c.title ? el('h3', { class: 'ap-timeline__title', text: c.title }) : null,
    el('div', { class: 'ap-timeline__list' }, items.map((it) => el('div', { class: 'ap-timeline__item' }, [
      el('div', { class: 'ap-timeline__dot' }),
      el('div', { class: 'ap-timeline__body' }, [
        it.date ? el('div', { class: 'ap-timeline__date', text: it.date }) : null,
        el('div', { class: 'ap-timeline__itemtitle', text: it.title || 'Milestone' }),
        it.description ? el('div', { class: 'ap-timeline__desc', text: it.description }) : null,
      ]),
    ]))),
  ]);
}

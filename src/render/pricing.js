// Pricing Table block: a grid of plan cards, each with its own feature list and CTA button.
// The CTA reuses blocks.js's clickTarget signal/behavior (ctx.edit===null gates real
// navigation) but isn't imported from there — kept local, matching image.js's wrapLink
// precedent of a small parallel helper rather than exporting a private helper across files.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';

function planButton(label, target, ctx, cls) {
  const isLivePage = ctx.edit === null;
  if (target?.kind === 'url' && target.url) {
    const node = el('a', { class: cls, href: target.url, target: target.newTab ? '_blank' : null, rel: target.newTab ? 'noopener noreferrer' : null, text: label || 'Choose plan' });
    node.addEventListener('click', (e) => { if (!isLivePage) e.preventDefault(); });
    return node;
  }
  if (target?.kind === 'tab' && target.tab) {
    const node = el('button', { class: cls, type: 'button', text: label || 'Choose plan' });
    node.addEventListener('click', (e) => { if (!isLivePage) { e.preventDefault(); return; } ctx.onNav?.(target.tab); });
    return node;
  }
  return el('span', { class: cls, text: label || 'Choose plan' });
}

function renderPlan(p, ctx) {
  const features = p.features?.length ? p.features : [];
  return el('div', { class: 'ap-pricing__plan' + (p.highlighted ? ' is-highlighted' : '') }, [
    p.highlighted ? el('span', { class: 'ap-pricing__badge', text: 'Popular' }) : null,
    el('div', { class: 'ap-pricing__name', text: p.name || 'Plan' }),
    el('div', { class: 'ap-pricing__price' }, [
      el('span', { class: 'ap-pricing__amount', text: p.price || '$0' }),
      p.period ? el('span', { class: 'ap-pricing__period', text: p.period }) : null,
    ]),
    el('ul', { class: 'ap-pricing__features' }, features.map((f) => el('li', {}, [icon('check'), el('span', { text: f })]))),
    planButton(p.buttonLabel, p.buttonTarget, ctx, 'ap-btn ' + (p.highlighted ? 'ap-btn--primary' : 'ap-btn--soft') + ' ap-pricing__btn'),
  ]);
}

export function renderPricing(block, ctx) {
  const c = block.config || {};
  const plans = c.plans?.length ? c.plans : [{ name: 'Plan', price: '$0', period: '/mo', features: ['Feature one'], highlighted: false, buttonLabel: 'Choose', buttonTarget: null }];
  return el('div', { class: 'ap-card ap-pricing', dataset: { blockId: block.id } }, [
    c.title ? el('h3', { class: 'ap-pricing__title', text: c.title }) : null,
    el('div', { class: 'ap-pricing__grid' }, plans.map((p) => renderPlan(p, ctx))),
  ]);
}

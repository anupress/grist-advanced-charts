// Renders a tab's hero: a gradient banner (headline + subtitle) or, when the tab has slides,
// a full-width image slider (≤340px). Text design (align, size, font, color, vertical position)
// is configurable, and the whole hero can be turned off. Clickable in edit mode.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';

const SIZE = { s: 'clamp(20px,3vw,26px)', m: 'clamp(26px,4vw,34px)', l: 'clamp(32px,5vw,44px)', xl: 'clamp(38px,6vw,56px)' };
const FONT = {
  default: '', serif: 'Georgia, "Times New Roman", serif', sans: '"Segoe UI", system-ui, sans-serif',
  display: '"Century Gothic", "Trebuchet MS", sans-serif', mono: '"Cascadia Code", Consolas, ui-monospace, monospace',
};

function headStyle(hero, defSize) {
  const st = { fontSize: SIZE[hero.size || defSize] || SIZE[defSize] };
  if (FONT[hero.font]) st.fontFamily = FONT[hero.font];
  if (hero.textColor) st.color = hero.textColor;
  return st;
}
const textStyle = (hero) => (hero.textColor ? { color: hero.textColor } : {});

export function buildHero(tab, opts = {}) {
  const hero = tab.hero || {};
  const editing = !!opts.editing;

  if (hero.enabled === false) {
    if (!editing) return null;
    const ph = el('section', { class: 'ap-hero-off ap-editable' }, [
      icon('eye'), el('span', { text: 'Hero hidden — click to enable / edit' }), el('span', { class: 'ap-edit-tag', text: 'hero' }),
    ]);
    ph.addEventListener('click', () => opts.onEditHero?.(tab.id));
    return { el: ph, fullWidth: false };
  }

  const slides = (hero.slides || []).filter((s) => s && s.image);
  let node, fullWidth;
  if (slides.length) { node = buildSlider(slides, hero); fullWidth = true; }
  else { node = buildBanner(hero, tab); fullWidth = false; }

  if (editing) {
    node.classList.add('ap-editable');
    node.append(el('span', { class: 'ap-edit-tag', text: 'hero' }));
    node.addEventListener('click', (e) => { if (!e.target.closest('.ap-slider__btn, .ap-slider__dot')) opts.onEditHero?.(tab.id); });
  }
  return { el: node, fullWidth };
}

function buildBanner(hero, tab) {
  const va = hero.vAlign || 'bottom';
  return el('section', { class: `ap-hero ap-va-${va}`, style: { textAlign: hero.align || 'left' } }, [
    el('h1', { text: hero.title || tab.title, style: headStyle(hero, 'xl') }),
    hero.subtitle ? el('p', { text: hero.subtitle, style: textStyle(hero) }) : null,
  ]);
}

function buildSlider(slides, hero) {
  const align = hero.align || 'left';
  const va = hero.vAlign || 'bottom';
  let idx = 0;
  const slideEls = slides.map((s) => el('div', { class: 'ap-slide', style: { backgroundImage: `url("${s.image}")` } }, [
    (s.title || s.subtitle) ? el('div', { class: `ap-slide__cap ap-cap-${va}`, style: { textAlign: align } }, [
      s.title ? el('h2', { text: s.title, style: headStyle(hero, 'm') }) : null,
      s.subtitle ? el('p', { text: s.subtitle, style: textStyle(hero) }) : null,
    ]) : null,
  ]));
  const track = el('div', { class: 'ap-slider__track' }, slideEls);
  const dots = slides.map((_, i) => el('button', { class: 'ap-slider__dot' + (i === 0 ? ' is-active' : ''),
    'aria-label': 'Slide ' + (i + 1), onClick: (e) => { e.stopPropagation(); show(i); } }));
  const dotsBar = el('div', { class: 'ap-slider__dots' }, dots);

  function show(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    dots.forEach((d, j) => d.classList.toggle('is-active', j === idx));
  }
  const prev = el('button', { class: 'ap-slider__btn ap-slider__btn--prev', 'aria-label': 'Previous',
    onClick: (e) => { e.stopPropagation(); show(idx - 1); } }, [icon('chevron')]);
  const next = el('button', { class: 'ap-slider__btn ap-slider__btn--next', 'aria-label': 'Next',
    onClick: (e) => { e.stopPropagation(); show(idx + 1); } }, [icon('chevron')]);

  const root = el('section', { class: 'ap-hero-slider' }, [track,
    slides.length > 1 ? prev : null, slides.length > 1 ? next : null, slides.length > 1 ? dotsBar : null]);

  if (slides.length > 1 && hero.autoplay !== false) {
    const ms = Math.max(2, hero.interval || 5) * 1000;
    let paused = false;
    root.addEventListener('mouseenter', () => { paused = true; });
    root.addEventListener('mouseleave', () => { paused = false; });
    const timer = setInterval(() => {
      if (!document.body.contains(root)) return clearInterval(timer);
      if (!paused) show(idx + 1);
    }, ms);
  }
  return root;
}

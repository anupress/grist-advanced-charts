// Editor body for a tab's hero: headline/subtitle for the gradient banner, plus an optional
// image slideshow (full-width, capped at 340px tall). Add images to switch to slider mode.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { field, textInput, checkboxRow, segmented, selectInput, colorInput, subhead, divider } from './ui.js';
import { pickImage, readFileAsDataURL } from './imageutil.js';

export function heroEditorBody(tab, { onChange }) {
  const hero = (tab.hero ||= {});
  hero.slides ||= [];

  const slidesHost = el('div');

  function renderSlides() {
    slidesHost.replaceChildren(
      subhead('Slideshow (optional)'),
      el('div', { class: 'ap-muted', style: { fontSize: '12px', marginBottom: '10px' },
        text: 'Add images to turn the hero into a full-width slider (max 340px tall). With no images, the gradient banner with your headline is shown.' }),
    );
    hero.slides.forEach((slide, i) => {
      const thumb = el('img', { src: slide.image, alt: '', style: { width: '54px', height: '40px', objectFit: 'cover', borderRadius: '8px', flex: 'none' } });
      const row = el('div', { class: 'ap-tabedit', style: { alignItems: 'flex-start', gap: '10px' } }, [
        thumb,
        el('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', gap: '6px' } }, [
          textInput(slide.title || '', (v) => { slide.title = v; onChange(); }, { placeholder: 'Slide headline (optional)' }),
          textInput(slide.subtitle || '', (v) => { slide.subtitle = v; onChange(); }, { placeholder: 'Slide caption (optional)' }),
        ]),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, [
          i > 0 ? iconBtn('arrowUp', 'Move up', () => { swap(i, i - 1); }) : null,
          i < hero.slides.length - 1 ? iconBtn('arrowDown', 'Move down', () => { swap(i, i + 1); }) : null,
          iconBtn('trash', 'Remove', () => { hero.slides.splice(i, 1); renderSlides(); onChange(); }, 'ap-btn--danger'),
        ]),
      ]);
      slidesHost.append(row);
    });
    slidesHost.append(el('button', { class: 'ap-btn ap-btn--soft', onClick: addSlide }, [icon('image'), 'Add image']));
    if (hero.slides.length > 1) {
      slidesHost.append(divider());
      slidesHost.append(checkboxRow('Auto-play slides', hero.autoplay !== false, (v) => { hero.autoplay = v; onChange(); }));
      slidesHost.append(field('Seconds per slide', secondsInput()));
    }
  }

  function secondsInput() {
    const inp = el('input', { class: 'ap-input', type: 'number', min: '2', max: '20', value: String(hero.interval || 5) });
    inp.addEventListener('input', () => { hero.interval = Math.max(2, Math.min(20, Number(inp.value) || 5)); onChange(); });
    return inp;
  }
  function swap(a, b) { const s = hero.slides; [s[a], s[b]] = [s[b], s[a]]; renderSlides(); onChange(); }
  function addSlide() {
    pickImage(async (f) => { const image = await readFileAsDataURL(f, 1600); hero.slides.push({ image, title: '', subtitle: '' }); renderSlides(); onChange(); });
  }

  renderSlides();

  return [
    checkboxRow('Show hero on this page', hero.enabled !== false, (v) => { hero.enabled = v; onChange(); }),
    field('Headline', textInput(hero.title || '', (v) => { hero.title = v; onChange(); }, { placeholder: 'Big welcome headline' })),
    field('Subtitle', textInput(hero.subtitle || '', (v) => { hero.subtitle = v; onChange(); }, { textarea: true, placeholder: 'A friendly one-liner' })),
    divider(),
    subhead('Text design'),
    field('Alignment', segmented([{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], hero.align || 'left', (v) => { hero.align = v; onChange(); })),
    field('Vertical position', segmented([{ value: 'top', label: 'Top' }, { value: 'center', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }], hero.vAlign || 'bottom', (v) => { hero.vAlign = v; onChange(); })),
    field('Headline size', segmented([{ value: 's', label: 'S' }, { value: 'm', label: 'M' }, { value: 'l', label: 'L' }, { value: 'xl', label: 'XL' }], hero.size || 'xl', (v) => { hero.size = v; onChange(); })),
    field('Headline font', selectInput([{ value: 'default', label: 'Theme default' }, { value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }, { value: 'display', label: 'Display' }, { value: 'mono', label: 'Mono' }], hero.font || 'default', (v) => { hero.font = v; onChange(); })),
    el('div', { class: 'ap-field' }, [
      el('label', { class: 'ap-label', text: 'Text color' }),
      el('div', { class: 'ap-row' }, [
        colorInput(hero.textColor || '#ffffff', (v) => { hero.textColor = v; onChange(); }),
        el('button', { class: 'ap-btn ap-btn--ghost ap-btn--sm', text: 'Auto', onClick: () => { hero.textColor = null; onChange(); } }),
      ]),
    ]),
    divider(),
    slidesHost,
  ];
}

function iconBtn(ic, title, on, extra = '') {
  return el('button', { class: 'ap-btn ap-btn--icon ap-btn--sm ' + extra, title, 'aria-label': title, onClick: on }, [icon(ic)]);
}

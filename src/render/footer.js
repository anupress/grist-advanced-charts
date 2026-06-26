// Basic site footer: free text + in-page links on the left, and the (always-on) ANUPRESS
// credit pinned to the right. The credit cannot be disabled.

import { el } from '../util.js';
import { brandLogo } from '../assets/icons.js';

export function buildFooter(config, opts = {}) {
  const f = config.footer || {};
  const links = el('div', { class: 'ap-footer__links' },
    (f.links || []).map((l) =>
      el('a', { href: l.tab ? '#' : (l.href || '#'), text: l.label,
        onClick: (e) => { if (l.tab) { e.preventDefault(); opts.onNav?.(l.tab); } } })));

  const credit = el('a', { class: 'ap-footer__credit', href: 'https://anupress.com', target: '_blank', rel: 'noopener',
    title: 'Built with ANUPRESS', onClick: (e) => e.stopPropagation() }, [
    brandLogo(20), el('span', { html: 'Built with <b>ANUPRESS</b>' }),
  ]);

  const inner = el('div', { class: 'ap-footer__inner' + (opts.editing ? ' ap-editable' : '') }, [
    el('div', { class: 'ap-footer__left' }, [
      f.text ? el('div', { class: 'ap-footer__meta', text: f.text }) : null,
    ]),
    el('div', { class: 'ap-footer__right' }, [links, credit]),
    opts.editing ? el('span', { class: 'ap-edit-tag', text: 'footer' }) : null,
  ]);
  if (opts.editing) inner.addEventListener('click', () => opts.onEditFooter?.());

  return el('footer', { class: 'ap-footer' }, [inner]);
}

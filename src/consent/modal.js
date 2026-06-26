// The ANUPRESS consent + privacy modal. Shown before requesting full Grist access.
// Resolves true (accept) or false (decline). Declining keeps the user in Demo mode.

import { el } from '../util.js';
import { brandLogo, icon } from '../assets/icons.js';

export function showConsent({ docName } = {}) {
  return new Promise((resolve) => {
    const close = (val) => { overlay.style.animation = 'ap-fade-in .15s reverse both'; setTimeout(() => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(val); }, 140); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', onKey);

    const bullet = (iconName, strong, rest) =>
      el('li', {}, [icon(iconName), el('span', { html: `<strong>${strong}</strong> ${rest}` })]);

    const modal = el('div', { class: 'ap-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ap-consent-title' }, [
      el('div', { class: 'ap-modal__banner' }, [
        el('div', { class: 'ap-modal__brand' }, [ brandLogo(34) ]),
        el('h2', { class: 'ap-modal__title', id: 'ap-consent-title', text: 'Enable editing & save to your own document' }),
      ]),
      el('div', { class: 'ap-modal__body' }, [
        el('div', { class: 'ap-trust' }, [
          icon('shield'),
          el('div', {}, [ el('strong', { text: 'Your data stays yours.' }),
            el('div', { class: 'ap-muted', html: 'ANUPRESS never receives, stores, or transmits your data. Everything runs in your browser, and your data stays inside your Grist document.' }) ]),
        ]),
        el('p', { class: 'ap-muted', text: 'To let you customize this widget and keep your design, ANUPRESS needs your permission to:' }),
        el('ul', { class: 'ap-consent-list' }, [
          bullet('database', 'Create one table', `in ${docName ? `“${docName}”` : 'your document'} — <code>ANUPRESS_Config</code> — to store your design (layout, colors, logo).`),
          bullet('eye', 'Read your tables', 'with <b>full document access</b>, so you can chart any column from any table.'),
          bullet('save', 'Save your design', 'back into that table, so it reloads next time.'),
          bullet('lock', 'Nothing leaves Grist', 'there is no ANUPRESS server, no analytics, and no third-party calls.'),
        ]),
        el('p', { class: 'ap-fineprint', html: 'On the next step, Grist will also ask you to grant <b>full document access</b> — this is required to create the table above. You can revoke it anytime from the widget’s settings.' }),
      ]),
      el('div', { class: 'ap-modal__foot' }, [
        el('button', { class: 'ap-btn ap-btn--ghost', text: 'Not now', onClick: () => close(false) }),
        el('button', { class: 'ap-btn ap-btn--primary', onClick: () => close(true) }, [ icon('checkCircle'), 'Accept & continue' ]),
      ]),
    ]);

    const overlay = el('div', { class: 'ap-overlay', onClick: (e) => { if (e.target === overlay) close(false); } }, [modal]);
    document.body.appendChild(overlay);
    modal.querySelector('.ap-btn--primary').focus();
  });
}

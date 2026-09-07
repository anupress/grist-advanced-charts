// Widget block: another Grist custom widget, by URL, inside this page.
//
// The frame is a plain iframe of the URL the person would otherwise give Grist. What makes it a
// working widget rather than a picture of one is grist/widget-host.js, which carries its calls to
// the document and back; this file only builds the frame and hands it over.

import { el } from '../util.js';
import { icon } from '../assets/icons.js';
import { attachNestedFrame } from '../grist/widget-host.js';

export const WIDGET_MIN_HEIGHT = 80;
export const WIDGET_MAX_HEIGHT = 4000;
// Enough for a real widget to work (scripts, its own storage, forms, a popup it opens on purpose)
// and no more: the frame cannot navigate this page or the one above it.
const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads';

export const widgetHeight = (h) => Math.max(WIDGET_MIN_HEIGHT, Math.min(WIDGET_MAX_HEIGHT, Number(h) || 420));

/** An absolute http(s) URL, or null. A relative one resolves against this page, which is how the demo finds its own example. */
export function resolveWidgetUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s, typeof document !== 'undefined' ? document.baseURI : 'https://localhost/');
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch { return null; }
}

export function renderWidgetBlock(block, ctx) {
  const c = block.config || {};
  const url = resolveWidgetUrl(c.url);
  const height = widgetHeight(c.height);
  if (!url) {
    return el('div', { class: 'ap-card ap-widget ap-widget--empty', dataset: { blockId: block.id }, style: { minHeight: Math.min(height, 200) + 'px' } }, [
      icon('widget'),
      el('div', { class: 'ap-widget__hint', text: ctx?.edit?.active ? 'Add the URL of a custom widget to show it here.' : 'This widget has no URL yet.' }),
    ]);
  }
  // The address waits in data-src until the block's page is shown (mountWidgets), the way charts
  // mount when their tab appears: a dashboard with a widget on every page would otherwise load them
  // all at once, and a nested widget in a page nobody opens would still be talking to the document.
  const iframe = el('iframe', {
    class: 'ap-widget__frame',
    dataset: { src: url },
    sandbox: SANDBOX,
    style: { height: height + 'px' },
    title: c.title || 'Nested widget',
    allow: 'clipboard-read; clipboard-write',
  });
  attachNestedFrame(iframe, { blockId: block.id, table: c.table || null, mappings: c.mappings || {} });
  return el('div', { class: 'ap-card ap-widget', dataset: { blockId: block.id } }, [iframe]);
}

/** Start loading every Widget block frame under `scope` that has not started yet. */
export function mountWidgets(scope) {
  (scope || document).querySelectorAll('iframe.ap-widget__frame[data-src]').forEach((f) => {
    if (!f.getAttribute('src')) f.src = f.dataset.src;
  });
}

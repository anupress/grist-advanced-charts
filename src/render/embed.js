// HTML/CSS/JS embed block. Security boundary is the iframe sandbox, not string sanitization:
// `sandbox="allow-scripts"` WITHOUT `allow-same-origin` gives the embedded document an opaque
// origin — it cannot reach window.grist, this widget's data/settings, cookies, or the parent
// page/top-level navigation. This is deliberately the opposite of Grist's own Custom Widget
// Builder "Fiddle", whose embedded code intentionally *is* the whole widget and so *does* get
// window.grist — here the embed is just decorative/content, isolated from everything else.

import { el } from '../util.js';

// <script>/<style> are parsed in RAWTEXT mode — a literal "</script"/"</style" substring inside
// user content would prematurely close the tag when the browser parses the srcdoc string as
// HTML, breaking the user's own code into stray text. Escaping it is a correctness fix, not a
// security one (the sandbox is what makes this safe, not this escape).
function escapeClose(s, tag) {
  return String(s || '').replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);
}

function composeDoc(html, css, js) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${escapeClose(css, 'style')}</style></head>
<body>${html || ''}
<script>${escapeClose(js, 'script')}<\/script>
</body></html>`;
}

export function renderEmbed(block) {
  const c = block.config || {};
  const height = Math.max(80, Math.min(1200, Number(c.height) || 300));
  const iframe = el('iframe', {
    class: 'ap-embed__frame',
    sandbox: 'allow-scripts',
    srcdoc: composeDoc(c.html, c.css, c.js),
    style: { height: height + 'px' },
    title: 'Custom embed',
    loading: 'lazy',
  });
  return el('div', { class: 'ap-card ap-embed', dataset: { blockId: block.id } }, [iframe]);
}

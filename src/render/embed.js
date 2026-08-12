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

// The theme values handed down to an embed. The iframe has an opaque origin by design, so it can
// neither read the parent's CSS variables nor inherit its colours — which is why an embed stayed
// stubbornly light when the page switched to dark unless its author had written dark styles by
// hand. These are injected as real variables plus a sensible default body style, BEFORE the user's
// own CSS so anything they write still wins.
const THEME_VARS = ['--ap-text', '--ap-text-soft', '--ap-text-mute', '--ap-surface', '--ap-bg',
  '--ap-bg-soft', '--ap-border', '--ap-primary', '--ap-accent', '--ap-font-body', '--ap-font-head'];

export function readHostTheme() {
  const root = document.getElementById('anupress-root') || document.documentElement;
  const cs = getComputedStyle(root);
  const vars = {};
  for (const v of THEME_VARS) vars[v] = cs.getPropertyValue(v).trim();
  return { mode: root.getAttribute('data-mode') || 'light', vars };
}

const themeCss = (theme) => `:root{color-scheme:${theme.mode};${
  Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';')}}
body{margin:0;font-family:var(--ap-font-body,system-ui,sans-serif);color:var(--ap-text,#1f2233);background:transparent;}
a{color:var(--ap-primary,#6d5efc);}`;

function composeDoc(html, css, js, theme) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style id="ap-theme">${themeCss(theme)}</style>
<style>${escapeClose(css, 'style')}</style></head>
<body>${html || ''}
<script>window.addEventListener("message",function(e){if(e.data&&e.data.__apTheme){var s=document.getElementById("ap-theme");if(s)s.textContent=e.data.__apTheme;}});<\/script>
<script>${escapeClose(js, 'script')}<\/script>
</body></html>`;
}

// Re-theme every embed in place. postMessage rather than rewriting srcdoc: reassigning srcdoc
// reloads the frame and restarts the author's script, so a running clock or animation would jump
// back to its starting state every time someone toggled dark mode.
export function syncEmbedThemes(scope) {
  const theme = readHostTheme();
  const css = themeCss(theme);
  (scope || document).querySelectorAll('.ap-embed__frame').forEach((f) => {
    try { f.contentWindow?.postMessage({ __apTheme: css }, '*'); } catch { /* frame not ready yet */ }
  });
}

// One document-level listener for the whole page, registered the first time any embed renders.
let _themeListenerWired = false;
function wireThemeListenerOnce() {
  if (_themeListenerWired) return;
  _themeListenerWired = true;
  document.addEventListener('ap:theme', () => syncEmbedThemes());
}

export function renderEmbed(block) {
  wireThemeListenerOnce();
  const c = block.config || {};
  const height = Math.max(80, Math.min(1200, Number(c.height) || 300));
  const iframe = el('iframe', {
    class: 'ap-embed__frame',
    sandbox: 'allow-scripts',
    srcdoc: composeDoc(c.html, c.css, c.js, readHostTheme()),
    style: { height: height + 'px' },
    title: 'Custom embed',
    loading: 'lazy',
  });
  return el('div', { class: 'ap-card ap-embed', dataset: { blockId: block.id } }, [iframe]);
}

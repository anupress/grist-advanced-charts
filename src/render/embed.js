// HTML/CSS/JS embed block. Security boundary is the iframe sandbox, not string sanitization:
// `sandbox="allow-scripts"` WITHOUT `allow-same-origin` gives the embedded document an opaque
// origin — it cannot reach window.grist, this widget's data/settings, cookies, or the parent
// page/top-level navigation.
//
// With `access: 'grist'` the block becomes a custom widget of its own, the way Grist's Custom
// Widget Builder treats the code it holds: the plugin API script is loaded ahead of the author's
// code, and the frame is registered with grist/widget-host.js, which carries its calls to the
// document. The sandbox is unchanged — the frame still cannot touch this page — but the person
// switching it on is choosing to let their code read and, at full access, write the document, and
// the editor says so.

import { el } from '../util.js';
import { attachNestedFrame, pluginApiUrl } from '../grist/widget-host.js';

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

// The theme a nested widget is given outside Grist, and before Grist has sent one: this page's own
// tokens in the shape of Grist's theme message, so a widget that reads --grist-theme-* variables
// follows the page's light or dark mode instead of staying stubbornly light.
export function hostThemeForWidgets() {
  const { mode, vars } = readHostTheme();
  const v = (k) => vars[k] || '';
  return {
    appearance: mode === 'dark' ? 'dark' : 'light',
    colors: {
      'text': v('--ap-text'), 'text-light': v('--ap-text-soft'), 'text-medium': v('--ap-text-mute'), 'text-dark': v('--ap-text'),
      'page-bg': v('--ap-bg'), 'page-panels-main-panel-bg': v('--ap-surface'), 'table-body-bg': v('--ap-surface'),
      'table-body-border': v('--ap-border'), 'link': v('--ap-primary'), 'accent': v('--ap-primary'), 'control-primary-bg': v('--ap-primary'),
    },
  };
}

const themeCss = (theme) => `:root{color-scheme:${theme.mode};${
  Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';')}}
body{margin:0;font-family:var(--ap-font-body,system-ui,sans-serif);color:var(--ap-text,#1f2233);background:transparent;}
a{color:var(--ap-primary,#6d5efc);}`;

function composeDoc(html, css, js, theme, apiUrl) {
  // The API script goes in the head so `grist` exists by the time the author's markup and code
  // run, as it would in a widget page that loads it with a script tag of its own.
  const api = apiUrl ? `<script src="${String(apiUrl).replace(/"/g, '&quot;')}"><\/script>` : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<style id="ap-theme">${themeCss(theme)}</style>${api}
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
  // Up to 4000px: a whole form or a long page embedded as a widget inside the widget needs its
  // real height, and 1200 cut such a form off with a scrollbar inside a scrollbar.
  const height = Math.max(80, Math.min(4000, Number(c.height) || 300));
  const withGrist = c.access === 'grist';
  const iframe = el('iframe', {
    class: 'ap-embed__frame',
    sandbox: 'allow-scripts',
    srcdoc: composeDoc(c.html, c.css, c.js, readHostTheme(), withGrist ? pluginApiUrl() : null),
    style: { height: height + 'px' },
    title: 'Custom embed',
    loading: 'lazy',
  });
  if (withGrist) attachNestedFrame(iframe, { blockId: block.id, table: c.table || null, mappings: c.mappings || {} });
  return el('div', { class: 'ap-card ap-embed', dataset: { blockId: block.id } }, [iframe]);
}

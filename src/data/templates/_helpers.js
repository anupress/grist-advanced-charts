// Shared block constructors for the industry template library — same shapes as
// data/default-site.js's local stat()/chart() helpers, generalized for reuse across templates.
//
// Every block's table/column/dims/measures below uses 'Data', a deliberate shared placeholder —
// applying a template runs adaptTemplateToTable() (data/provider.js), which recognizes 'Data'
// specifically as "map this onto the target's default table" and repairs every block type's
// columns to match (stat/chart/breakdown/map/progress/livetable/calendar), not just stat/chart.
// A block naming a *real*, specific table instead (e.g. Research Labs' 'Samples') is only ever
// repointed when a table by that exact name genuinely exists on the target — otherwise it's left
// completely alone rather than guessed onto an unrelated table. See adaptTemplateToTable's own
// comment for why (2026-08-11 feedback: guessing produced working-but-wrong results).

export const stat = (id, label, column, agg, icon, fmt, span = 3) =>
  ({ id, type: 'stat', span, config: { table: 'Data', label, column, agg, icon, format: fmt || {} } });

export const chart = (id, title, chartType, dims, measures, extra = {}, span = 6) =>
  ({ id, type: 'chart', span, config: { table: 'Data', title, chartType, dims, measures, agg: 'sum', ...extra } });

export const text = (id, heading, html, span = 12) =>
  ({ id, type: 'text', span, config: { heading, html } });

export const spacer = (id, height = 40) => ({ id, type: 'spacer', span: 12, config: { height } });

export const accordion = (id, title, items, span = 12, openFirst = true) =>
  ({ id, type: 'accordion', span, config: { title, items, openFirst } });

export const counter = (id, label, start, end, opts = {}, span = 3) =>
  ({ id, type: 'counter', span, config: { label, start, end, duration: 1400, prefix: opts.prefix || '', suffix: opts.suffix || '', decimals: opts.decimals || 0, icon: opts.icon || 'sparkles', iconData: null } });

export const button = (id, label, style, align, target, span = 3) =>
  ({ id, type: 'button', span, config: { label, style, align, target } });

export const iconBlock = (id, iconName, size, bg, color, align, span = 3) =>
  ({ id, type: 'icon', span, config: { icon: iconName, iconData: null, size, color, bg, align, target: { kind: null, tab: null, url: null, newTab: true } } });

export const progress = (id, title, value, target, opts = {}, span = 4) =>
  ({ id, type: 'progress', span, config: { title, mode: 'manual', value, target, table: 'Data', valueColumn: null, agg: 'sum', suffix: opts.suffix || '', color: opts.color || null } });

// A no-op target for buttons/icons that just look clickable in the preview (no real page to
// link to yet, since templates don't know the final tab ids the user will keep/rename).
export const noTarget = { kind: null, tab: null, url: null, newTab: true };
export const urlTarget = (url) => ({ kind: 'url', tab: null, url, newTab: true });
export const tabTarget = (tab) => ({ kind: 'tab', tab, url: null, newTab: true });

// A soft gradient "photo" (SVG data URI) — same technique as default-site.js's demoSlide(), so
// the Image block shows something real without needing an actual upload. Carries a centered
// "Replace with your image" label + picture glyph so it reads unmistakably as a placeholder to
// swap out, not as final artwork — the same cue across every template's image blocks.
export const placeholderImage = (c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
  + `<rect width="800" height="500" fill="url(#g)"/><circle cx="680" cy="80" r="160" fill="#fff" opacity="0.08"/><circle cx="100" cy="440" r="130" fill="#fff" opacity="0.06"/>`
  + `<g transform="translate(400 210)" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" opacity="0.85"><rect x="-34" y="-26" width="68" height="52" rx="6"/><circle cx="-14" cy="-6" r="7"/><path d="M-34 18l22-20 16 14 12-10 18 16"/></g>`
  + `<text x="400" y="300" font-family="Segoe UI, system-ui, sans-serif" font-size="30" font-weight="700" letter-spacing="1" fill="#fff" fill-opacity="0.92" text-anchor="middle">Replace with your image</text></svg>`);

export const image = (id, imageData, alt, caption, span = 6) =>
  ({ id, type: 'image', span, config: { mode: 'upload', imageData, ref: { table: null, column: null, row: null }, alt, fit: 'cover', caption, link: noTarget } });

export const testimonials = (id, title, entries, span = 12) =>
  ({ id, type: 'testimonials', span, config: { title, mode: 'manual', entries, table: null, nameColumn: null, quoteColumn: null, ratingColumn: null, photoColumn: null, limit: 6 } });

// Column refs are placeholders, same as stat/chart's — adaptTemplateToTable repairs breakdown's
// `column` and map's `latColumn`/`lonColumn` too when 'Data' maps onto a real table. If the
// target has nothing suitable (e.g. no lat/lon-shaped column for map), these still degrade
// gracefully (breakdown: one "—" bucket; map: "missing coordinates") rather than breaking.
export const breakdown = (id, title, span = 4) =>
  ({ id, type: 'breakdown', span, config: { table: 'Data', title, column: 'Category', limit: 12 } });

export const mapBlock = (id, title, span = 12) =>
  ({ id, type: 'map', span, config: { table: 'Data', title, latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Category', colorBy: null } });

// columns:[] (not omitted) deliberately — renderLiveTable falls back to showing every column of
// whatever table it ends up bound to, rather than a hardcoded list of placeholder column ids
// that would filter down to zero columns (an empty, headerless table shell) once remapped.
export const livetable = (id, title, span = 12) =>
  ({ id, type: 'livetable', span, config: { title, table: 'Data', columns: [], pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [] } });

export const embed = (id, html, css, js, height = 160) =>
  ({ id, type: 'embed', span: 12, config: { html, css, js, height } });

// A small, universally-relevant embed demo (real HTML+CSS+JS, updating every second) — more
// representative of the feature than a static/promotional snippet would be.
export const clockEmbed = (id, label, height = 150) => embed(
  id,
  `<div id="clock">--:--:--</div><div class="tz">${label}</div>`,
  `body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;margin:0;font-family:system-ui,sans-serif;color:#333}
#clock{font-size:32px;font-weight:800;letter-spacing:1px}
.tz{font-size:12px;opacity:.6;margin-top:4px;text-transform:uppercase;letter-spacing:.06em}`,
  `function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}
tick();
setInterval(tick,1000);`,
  height,
);

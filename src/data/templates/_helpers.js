// Shared block constructors for the industry template library — same shapes as
// data/default-site.js's local stat()/chart() helpers, generalized for reuse across templates.
//
// Every stat/chart's table/column/dims/measures below is a placeholder: applying a template
// always runs adaptConfigToTable() (data/provider.js) first, which overwrites every stat and
// chart block's table/column/dims/measures to point at the user's actual table and columns.
// That remap does NOT touch breakdown or map blocks (their column/latColumn/lonColumn refs
// aren't remapped) — so templates deliberately stick to stat/chart plus the fully-static block
// types for everything else, so every template looks right immediately, before any manual
// reconfiguration, regardless of what the user's real table looks like.

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
// the Image block shows something real without needing an actual upload.
export const placeholderImage = (c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="680" cy="80" r="160" fill="#fff" opacity="0.08"/><circle cx="100" cy="440" r="130" fill="#fff" opacity="0.06"/></svg>`);

export const image = (id, imageData, alt, caption, span = 6) =>
  ({ id, type: 'image', span, config: { mode: 'upload', imageData, ref: { table: null, column: null, row: null }, alt, fit: 'cover', caption, link: noTarget } });

export const testimonials = (id, title, entries, span = 12) =>
  ({ id, type: 'testimonials', span, config: { title, mode: 'manual', entries, table: null, nameColumn: null, quoteColumn: null, ratingColumn: null, photoColumn: null, limit: 6 } });

// Column refs are placeholders, same caveat as stat/chart's table — but adaptConfigToTable does
// NOT remap breakdown's `column` or map's `latColumn`/`lonColumn`, only `.config.table` (set
// unconditionally for every block). Until the user picks real columns these degrade gracefully
// (breakdown: one "—" bucket; map: "missing coordinates") rather than breaking, matching how
// every other block in this app already handles absent/mismatched data.
export const breakdown = (id, title, span = 4) =>
  ({ id, type: 'breakdown', span, config: { table: 'Data', title, column: 'Category', limit: 12 } });

export const mapBlock = (id, title, span = 12) =>
  ({ id, type: 'map', span, config: { table: 'Data', title, latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Category', colorBy: null } });

// columns:[] (not omitted) deliberately — renderLiveTable falls back to showing every column of
// whatever table it ends up bound to, rather than a hardcoded list of placeholder column ids
// that would filter down to zero columns (an empty, headerless table shell) once remapped.
export const livetable = (id, title, span = 12) =>
  ({ id, type: 'livetable', span, config: { title, table: 'Data', columns: [], pageSize: 8, searchable: true, sortable: true, defaultSort: null } });

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

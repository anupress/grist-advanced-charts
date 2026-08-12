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
// Opens the browser's print dialog — which is also its "Save as PDF" on every desktop platform.
// The @media print rules in styles/site.css strip the navigation, editor chrome and card shadows
// so the result is a document worth sending, not a screenshot of a web page.
export const printTarget = () => ({ kind: 'print', tab: null, url: null, newTab: false });

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

// A small self-contained CALCULATOR for the Embed block.
//
// An embed runs in an opaque-origin sandbox, so it can never read the document's data — which
// rules out anything live. What it CAN be is a tool the reader operates themselves, and that is
// far more use on a published page than the clock that used to sit here telling people the time
// they already knew. Each template gets one that matches its trade: a dilution calculator on the
// lab bench page, an error budget for the engineering status page, a fee estimate for legal.
//
// `expr` is a JS expression over `v` (e.g. 'v.revenue / v.spend'). It is the template author's own
// code and it evaluates inside the sandbox, exactly like the block's normal JS field.
// It inherits the page's light/dark colours through the theme variables render/embed.js injects.
export const calcEmbed = (id, spec, height = 230) => {
  const { title, note, fields, expr, prefix = '', suffix = '', decimals = 2 } = spec;
  const rows = fields.map((f) =>
    `<label><span>${f.label}</span><input id="${f.key}" type="number" value="${f.value}" step="any"></label>`).join('');
  return embed(
    id,
    `<div class="c"><div class="t">${title}</div><div class="g">${rows}</div>`
    + `<div class="o"><span class="ol">${spec.resultLabel || 'Result'}</span><b id="r">—</b></div>`
    + (note ? `<div class="n">${note}</div>` : '') + '</div>',
    `.c{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.t{font-weight:700;font-size:14px}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ap-text-mute,#777)}
input{font:inherit;font-size:13px;padding:6px 8px;border-radius:8px;border:1px solid var(--ap-border,#ddd);
background:var(--ap-surface,#fff);color:var(--ap-text,#222);width:100%;box-sizing:border-box}
input:focus{outline:none;border-color:var(--ap-primary,#6d5efc)}
.o{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:10px;
background:var(--ap-bg-soft,#f4f5fa)}
.ol{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ap-text-mute,#777)}
#r{font-size:22px;font-weight:800;color:var(--ap-primary,#6d5efc)}
.n{font-size:11px;color:var(--ap-text-mute,#777);line-height:1.45}`,
    `var K=${JSON.stringify(fields.map((f) => f.key))};
var F=new Function('v','return (' + ${JSON.stringify(expr)} + ');');
function calc(){var v={};K.forEach(function(k){v[k]=parseFloat(document.getElementById(k).value)||0;});
var r;try{r=F(v);}catch(e){r=NaN;}
document.getElementById('r').textContent=(isFinite(r)?${JSON.stringify(prefix)}+r.toFixed(${decimals}).replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')+${JSON.stringify(suffix)}:'—');}
K.forEach(function(k){document.getElementById(k).addEventListener('input',calc);});calc();`,
    height,
  );
};

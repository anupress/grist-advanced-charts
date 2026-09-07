// The per-block layout/style options, held against the CSS they must produce. What matters: an
// absent style changes nothing, every number is clamped, a span goes on the cell inside a grid but
// on the wrapper on the page, and ids and classes cannot smuggle in anything but a name.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { styleFor, hasStyle, MAX_MIN_HEIGHT, MAX_SPACING } = await import(pathToFileURL(join(ROOT, 'src/render/block-style.js')).href);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };
const empty = (o) => Object.keys(o).length === 0;

// Nothing set: nothing applied.
for (const s of [undefined, null, {}, { margin: {}, hide: {} }]) {
  const r = styleFor(s);
  ok(empty(r.wrap) && empty(r.inner) && empty(r.cell) && r.classes.length === 0 && r.id === null, `no style gives no CSS (${JSON.stringify(s)})`);
  ok(!hasStyle(s), `hasStyle is false for ${JSON.stringify(s)}`);
}

// Spacing: margin on the wrapper, padding on the card, zeros dropped, limits enforced.
const sp = styleFor({ margin: { t: 24, r: 0, b: 'x', l: 8 }, padding: { t: 12 }, minHeight: 260 });
ok(sp.wrap.marginTop === '24px' && sp.wrap.marginLeft === '8px' && !('marginRight' in sp.wrap) && !('marginBottom' in sp.wrap), 'margin sides map to the wrapper, zero and junk dropped');
ok(sp.inner.paddingTop === '12px' && sp.inner.minHeight === '260px', 'padding and min-height go on the card');
ok(hasStyle({ minHeight: 260 }), 'hasStyle sees a set value');
ok(styleFor({ minHeight: 99999 }).inner.minHeight === MAX_MIN_HEIGHT + 'px', 'min-height clamps');
ok(styleFor({ margin: { t: 9999 } }).wrap.marginTop === MAX_SPACING + 'px', 'margin clamps');

// Spans: on the page the wrapper spans rows; in a cell the cell spans both ways.
const top = styleFor({ rowSpan: 2, colSpan: 2, alignSelf: 'center', order: 3 });
ok(top.wrap.gridRow === 'span 2' && !('gridColumn' in top.wrap) && top.wrap.order === '3' && empty(top.cell), 'page block: row span and order on the wrapper, column span ignored');
const cellS = styleFor({ rowSpan: 2, colSpan: 3, alignSelf: 'center', order: -2 }, { nested: true });
ok(cellS.cell.gridColumn === 'span 3' && cellS.cell.gridRow === 'span 2' && cellS.cell.alignSelf === 'center' && cellS.cell.order === '-2' && empty(cellS.wrap), 'cell block: spans, alignment and order on the cell');
ok(!('gridRow' in styleFor({ rowSpan: 1 }).wrap) && !('alignSelf' in styleFor({ alignSelf: 'stretch' }, { nested: true }).cell), 'span 1 and stretch are defaults, not written');
ok(styleFor({ colSpan: 40 }, { nested: true }).cell.gridColumn === 'span 4', 'spans clamp to 4');
ok(!('alignSelf' in styleFor({ alignSelf: 'sideways' }, { nested: true }).cell), 'an unknown alignment is ignored');

// Look.
const look = styleFor({ bg: '#fff3b0', borderWidth: 2, borderColor: '#c00', radius: 0, shadow: 'bold' });
ok(look.inner.background === '#fff3b0' && look.inner.borderWidth === '2px' && look.inner.borderStyle === 'solid' && look.inner.borderColor === '#c00', 'background and border');
ok(look.inner.borderRadius === '0px', 'a radius of 0 is a real choice (square corners)');
ok(look.inner.boxShadow === 'var(--ap-shadow-lg)' && styleFor({ shadow: 'none' }).inner.boxShadow === 'none' && !('boxShadow' in styleFor({ shadow: 'default' }).inner), 'shadow words');

// Visibility and attributes.
const vis = styleFor({ hide: { phone: true, desktop: true }, cssClass: 'promo  hero-card <bad>', cssId: 'kpi one!', zIndex: 5 });
ok(vis.classes.join(' ') === 'ap-hide-phone ap-hide-desktop promo hero-card', `hide flags and safe classes only (got ${vis.classes.join(' ')})`);
ok(vis.id === 'kpione', `id keeps only name characters (got ${vis.id})`);
ok(vis.wrap.zIndex === '5' && vis.wrap.position === 'relative', 'z-index positions the wrapper');
ok(styleFor({ zIndex: '' }).wrap.zIndex === undefined, 'an empty z-index is unset');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// el()'s style prop, against a stand-in for the browser's style declaration.
//
// The stand-in behaves the way CSSStyleDeclaration does in the one respect that matters here:
// setProperty reaches the element, and assigning a custom property as a plain JS property does
// not. That gap is how an invoice's Accent colour and a calendar's "Color events by" rendered as
// the theme's primary however they were set, until 3.8.1.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;

function fakeStyle() {
  const applied = new Map();   // what the element would actually render with
  const target = {
    setProperty: (name, value) => applied.set(name, String(value)),
    getPropertyValue: (name) => applied.get(name) || '',
  };
  // Ordinary properties (width, background, …) reach the element when assigned; '--x' does not.
  return new Proxy(target, {
    set(t, k, v) { if (typeof k === 'string' && !k.startsWith('--')) applied.set(k, String(v)); t[k] = v; return true; },
  });
}
globalThis.document = {
  createElement: (tag) => ({ tagName: tag.toUpperCase(), style: fakeStyle(), dataset: {}, setAttribute() {}, append() {}, addEventListener() {} }),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
};

const { el } = await import(R('src/util.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

console.log('el style');
const inv = el('div', { style: { '--ap-inv-accent': '#c2410c' } });
eq('a custom property reaches the element (invoice accent)', inv.style.getPropertyValue('--ap-inv-accent'), '#c2410c');
const pill = el('button', { style: { '--ap-cal-dot': '#16a34a', width: '40px' } });
eq('custom and ordinary properties together (calendar dot)', [pill.style.getPropertyValue('--ap-cal-dot'), pill.style.getPropertyValue('width')], ['#16a34a', '40px']);
const plain = el('div', { style: { marginTop: '8px' } });
eq('an ordinary property still assigns', plain.style.getPropertyValue('marginTop'), '8px');
const skipped = el('div', { style: { '--ap-inv-accent': null, color: false } });
eq('null and false values are skipped', [skipped.style.getPropertyValue('--ap-inv-accent'), skipped.style.getPropertyValue('color')], ['', '']);
let threw = false;
try { el('div', { style: null }); } catch { threw = true; }
eq('style: null (an invoice with no accent) is skipped, not a crash', threw, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

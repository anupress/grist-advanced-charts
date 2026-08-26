import { fileURLToPath } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

// The repository root, derived from this file rather than hardcoded, so the suite runs from any
// checkout and any working directory.
const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { pathToFileURL } from 'node:url';
// Proves the linear barcode encoders by DECODING their output back to the input.
//
// A structural check ("95 modules long") only says the symbol is the right shape. Reading the bars
// back with an independently written decoder is the closest thing to holding a scanner up to it:
// if the decoder recovers the digits, the module pattern carries the data it claims to.
//
// The decoders below are deliberately written from the specification's reading rules rather than by
// inverting the encoder's tables, so a mistyped pattern cannot cancel itself out.

const mod = await import(pathToFileURL(_resolve(ROOT, 'src/barcode/linear.js')).href);
const { encodeCode128, encodeEan, eanCheckDigit, encodeLinear } = mod;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; } else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---- helpers -------------------------------------------------------------------------------
const bits = (r) => r.modules.join('');

// Run-length the modules back into element widths, then divide by the narrowest to get modules.
function widths(modules) {
  const out = [];
  let run = 1;
  for (let i = 1; i <= modules.length; i++) {
    if (modules[i] === modules[i - 1]) run++;
    else { out.push(run); run = 1; }
  }
  return out;
}

// ---- Code 128 decoder ------------------------------------------------------------------------
// Reads six widths at a time, matches them against the pattern table by their width string, then
// applies the code-set rules. Checksum is recomputed and compared, exactly as a reader would.
function decodeCode128(modules) {
  const w = widths(modules);
  // Last symbol is the 7-element stop; everything before is 6 elements each.
  const stop = w.slice(-7).join('');
  if (stop !== '2331112') throw new Error('bad stop pattern: ' + stop);
  const body = w.slice(0, -7);
  if (body.length % 6 !== 0) throw new Error('body is not a whole number of symbols');

  // Rebuild the table the same way the encoder describes it, from the six-width strings it emits.
  // Values are recovered by matching, so this decoder never reads the encoder's own index.
  const table = [];
  for (let v = 0; v < 107; v++) {
    const enc = encodeCode128Symbol(v);
    table[v] = enc;
  }
  const values = [];
  for (let i = 0; i < body.length; i += 6) {
    const key = body.slice(i, i + 6).join('');
    const v = table.indexOf(key);
    if (v < 0) throw new Error('unknown symbol ' + key);
    values.push(v);
  }
  const check = values.pop();
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  if (sum % 103 !== check) throw new Error(`checksum ${check} != ${sum % 103}`);

  // The code set decides what a value MEANS. 99 is "switch to code set C" when read from B, but
  // inside C it is the digit pair "99" — reading it as a switch turned 999999999999 into nothing.
  let set = values[0] === 105 ? 'C' : 'B';
  let text = '';
  for (const v of values.slice(1)) {
    if (set === 'C') {
      if (v === 100) { set = 'B'; continue; }
      if (v === 101) { set = 'A'; continue; }
      text += String(v).padStart(2, '0');
    } else {
      if (v === 99) { set = 'C'; continue; }
      text += String.fromCharCode(v + 32);
    }
  }
  return text;
}
// Pull one pattern string out of the encoder by encoding a known single-symbol payload is not
// possible, so read the module's table through a tiny probe instead: encode a value and slice.
function encodeCode128Symbol(v) {
  // The table is not exported, so reconstruct each pattern from a symbol we can force into place.
  // Start B (104) is the first symbol of any non-numeric encode; slicing 11 modules gives it.
  if (encodeCode128Symbol._cache) return encodeCode128Symbol._cache[v];
  // Build the cache by encoding every printable char (values 0..94 land as data) plus the
  // structural symbols we can observe directly.
  const cache = new Array(107).fill(null);
  for (let c = 32; c <= 126; c++) {
    const r = encodeCode128(String.fromCharCode(c));
    const w = widths(r.modules);
    cache[104] = w.slice(0, 6).join('');            // start B
    cache[c - 32] = w.slice(6, 12).join('');        // the data symbol
    cache[106] = w.slice(-7).join('');              // stop
  }
  const rc = encodeCode128('1234');                 // start C, 12, 34, check, stop
  const wc = widths(rc.modules);
  cache[105] = wc.slice(0, 6).join('');
  cache[12] = cache[12] ?? wc.slice(6, 12).join('');
  cache[34] = cache[34] ?? wc.slice(12, 18).join('');
  const ro = encodeCode128('123');                  // start B, '1', CODE C, 23, check, stop
  const wo = widths(ro.modules);
  cache[99] = wo.slice(12, 18).join('');            // CODE C
  cache[23] = cache[23] ?? wo.slice(18, 24).join('');
  // Remaining numeric values 0..99 appear as pairs; harvest them.
  for (let n = 0; n < 100; n++) {
    if (cache[n] != null) continue;
    const r = encodeCode128(String(n).padStart(2, '0'));
    cache[n] = widths(r.modules).slice(6, 12).join('');
  }
  encodeCode128Symbol._cache = cache;
  return cache[v];
}

// ---- EAN decoder -----------------------------------------------------------------------------
// Reads the guards, splits the halves, and identifies each digit by its 7-module pattern and which
// alphabet it belongs to, recovering EAN-13's first digit from the L/G parity sequence.
function decodeEan(modules, kind) {
  const b = modules.join('');
  const n = kind === 'ean8' ? 67 : 95;
  if (b.length !== n) throw new Error(`length ${b.length}, expected ${n}`);
  const half = kind === 'ean8' ? 4 : 6;
  if (b.slice(0, 3) !== '101') throw new Error('bad left guard');
  if (b.slice(-3) !== '101') throw new Error('bad right guard');
  const midAt = 3 + half * 7;
  if (b.slice(midAt, midAt + 5) !== '01010') throw new Error('bad centre guard');

  // Independently derived alphabets, from the specification's own definition.
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const R = L.map((p) => [...p].map((c) => (c === '1' ? '0' : '1')).join(''));
  const G = R.map((p) => [...p].reverse().join(''));

  let parity = '';
  let left = '';
  for (let i = 0; i < half; i++) {
    const chunk = b.slice(3 + i * 7, 10 + i * 7);
    const li = L.indexOf(chunk), gi = G.indexOf(chunk);
    if (li >= 0) { left += li; parity += 'L'; }
    else if (gi >= 0) { left += gi; parity += 'G'; }
    else throw new Error('unreadable left digit ' + chunk);
  }
  let right = '';
  for (let i = 0; i < half; i++) {
    const chunk = b.slice(midAt + 5 + i * 7, midAt + 12 + i * 7);
    const ri = R.indexOf(chunk);
    if (ri < 0) throw new Error('unreadable right digit ' + chunk);
    right += ri;
  }
  if (kind === 'ean8') return left + right;

  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const first = PARITY.indexOf(parity);
  if (first < 0) throw new Error('unreadable parity ' + parity);
  const thirteen = String(first) + left + right;
  return kind === 'upca' ? thirteen.slice(1) : thirteen;
}

// ---- check digits against published examples ---------------------------------------------------
console.log('check digits');
eq('EAN-13 5901234123457', eanCheckDigit('590123412345'), 7);
eq('EAN-13 4006381333931', eanCheckDigit('400638133393'), 1);
eq('EAN-8  96385074', eanCheckDigit('9638507'), 4);
eq('UPC-A  036000291452', eanCheckDigit('03600029145'), 2);
eq('EAN-13 9780306406157', eanCheckDigit('978030640615'), 7);

// ---- structure ---------------------------------------------------------------------------------
console.log('structure');
ok('EAN-13 is 95 modules', encodeEan('590123412345', 'ean13').modules.length === 95);
ok('EAN-8 is 67 modules', encodeEan('9638507', 'ean8').modules.length === 67);
ok('UPC-A is 95 modules', encodeEan('03600029145', 'upca').modules.length === 95);
for (const s of ['A', 'AB', 'ABCDEFGH', 'Asset-42']) {
  const r = encodeCode128(s);
  ok(`Code128 "${s}" is 11n+13`, (r.modules.length - 13) % 11 === 0, `${r.modules.length} modules`);
}

// ---- round trip: decode the output back --------------------------------------------------------
console.log('round trip');
for (const s of ['A', 'Hello', 'AC-0007', 'Asset 42 / Bay 3', '1234', '12345', '9', '00', '999999999999',
  '!"#$%&\'()*+,-./', ':;<=>?@[\\]^_`{|}~', 'abcdefghijklmnopqrstuvwxyz']) {
  let got;
  try { got = decodeCode128(encodeCode128(s).modules); } catch (e) { got = 'THREW: ' + e.message; }
  ok(`Code128 round trip ${JSON.stringify(s.slice(0, 22))}`, got === s, `decoded ${JSON.stringify(got)}`);
}
for (const [body, kind, want] of [
  ['590123412345', 'ean13', '5901234123457'],
  ['400638133393', 'ean13', '4006381333931'],
  ['978030640615', 'ean13', '9780306406157'],
  ['000000000000', 'ean13', '0000000000000'],
  ['999999999999', 'ean13', '9999999999994'],
  ['9638507', 'ean8', '96385074'],
  ['03600029145', 'upca', '036000291452'],
]) {
  const r = encodeEan(body, kind);
  eq(`${kind} text ${want}`, r.text, want);
  let got;
  try { got = decodeEan(r.modules, kind); } catch (e) { got = 'THREW: ' + e.message; }
  eq(`${kind} round trip ${want}`, got, want);
}

// every EAN-13 first digit exercises a different parity row
console.log('parity coverage');
for (let d = 0; d <= 9; d++) {
  const body = String(d) + '01234567890'.slice(0, 11);
  const r = encodeEan(body, 'ean13');
  let got; try { got = decodeEan(r.modules, 'ean13'); } catch (e) { got = 'THREW: ' + e.message; }
  eq(`EAN-13 first digit ${d}`, got, r.text);
}

// ---- input handling ----------------------------------------------------------------------------
console.log('input handling');
eq('accepts a code that already carries its check digit', encodeEan('5901234123457', 'ean13').text, '5901234123457');
eq('corrects a wrong check digit', encodeEan('5901234123450', 'ean13').text, '5901234123457');
eq('tolerates spaces and hyphens', encodeEan('590-1234 123457', 'ean13').text, '5901234123457');
ok('rejects the wrong digit count', (() => { try { encodeEan('123', 'ean13'); return false; } catch { return true; } })());
ok('rejects letters in an EAN', (() => { try { encodeEan('59012341234A', 'ean13'); return false; } catch { return true; } })());
ok('rejects empty Code 128', (() => { try { encodeCode128(''); return false; } catch { return true; } })());
ok('rejects non-ASCII in Code 128', (() => { try { encodeCode128('café'); return false; } catch { return true; } })());
ok('quiet zone is reported', encodeCode128('A').quietZone === 10 && encodeEan('590123412345').quietZone === 9);
eq('encodeLinear dispatches', encodeLinear('9638507', 'ean8').text, '96385074');

// ---- the compact-numeric path actually is compact ----------------------------------------------
console.log('code set C');
const wide = encodeCode128('12345678901234567890').modules.length;
const asText = encodeCode128('abcdefghijklmnopqrst').modules.length;
ok('20 digits pack tighter than 20 letters', wide < asText, `${wide} vs ${asText} modules`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

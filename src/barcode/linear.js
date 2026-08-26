// Linear (1D) barcode encoders: Code 128, EAN-13, EAN-8 and UPC-A.
//
// Dependency-free and entirely client-side, matching the QR encoder next door and this app's
// "nothing about a generated code leaves the browser" claim.
//
// Every encoder returns the same thing: an array of 1s and 0s, one per MODULE, where 1 is a bar.
// A module is the narrowest element the symbology has, and every width in a barcode is a whole
// number of them. Working in modules rather than millimetres is what lets the renderer place bars
// on exact boundaries later — a bar drawn at a fractional module is a bar a scanner may misread.
//
// Two things matter more here than anywhere else in this codebase:
//
//   1. Correctness. A wrong module is not a cosmetic bug, it is a barcode that fails at a till or
//      an unreadable asset tag on a shelf. Every table below is checked for structural integrity at
//      module load (see assertTables), and the test suite decodes the output back to the input.
//   2. Quiet zones. The blank margin either side is part of the symbol, not padding around it. A
//      scanner needs it to find the edges, so it is returned as part of the module count and drawn
//      by the renderer rather than left to CSS, where a stylesheet could helpfully remove it.

// ---- Code 128 --------------------------------------------------------------------------------
//
// 107 symbols, each 11 modules wide, written as six alternating widths starting with a bar:
// bar, space, bar, space, bar, space. The stop pattern is the exception at 13 modules over seven
// widths. Values 0-102 are shared across the three code sets; 103-105 start them; 106 stops.
const C128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const C128_START_B = 104;
const C128_START_C = 105;
const C128_CODE_C = 99;    // switch to code set C, as read from within code set B
const C128_STOP = 106;

// ---- EAN / UPC -------------------------------------------------------------------------------
//
// Seven modules per digit in three alphabets. L is used on the left of the symbol, R on the right,
// and G is L's mirror — it exists so the first digit of an EAN-13 can be carried by the PATTERN of
// L and G choices rather than by bars of its own. That is why an EAN-13 holds thirteen digits in
// twelve digits' worth of space.
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_R = EAN_L.map((p) => [...p].map((b) => (b === '1' ? '0' : '1')).join(''));   // complement
const EAN_G = EAN_R.map((p) => [...p].reverse().join(''));                            // mirrored R

// Which of the left-hand digits use G rather than L. The index is the first digit; every EAN-13
// begins LL and ends with an even count of each, which is what makes the parity readable in reverse.
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

const GUARD_EDGE = '101';
const GUARD_MID = '01010';

/**
 * Structural integrity of the tables, checked once when this module loads.
 *
 * Every one of these is a hand-transcribed table, and a single mistyped digit produces a barcode
 * that looks perfectly convincing and scans as the wrong thing — or as nothing. These assertions
 * cannot prove a pattern is the RIGHT one, but they catch the whole class of transcription errors
 * that change a symbol's width, which is most of them.
 */
function assertTables() {
  C128_PATTERNS.forEach((p, i) => {
    const sum = [...p].reduce((n, d) => n + Number(d), 0);
    const want = i === C128_STOP ? 13 : 11;
    if (sum !== want) throw new Error(`Code 128 pattern ${i} is ${sum} modules, expected ${want}`);
    if (p.length !== (i === C128_STOP ? 7 : 6)) throw new Error(`Code 128 pattern ${i} has the wrong element count`);
  });
  if (C128_PATTERNS.length !== 107) throw new Error('Code 128 needs exactly 107 patterns');
  for (const [name, set] of [['L', EAN_L], ['G', EAN_G], ['R', EAN_R]]) {
    if (set.length !== 10) throw new Error(`EAN ${name} needs 10 patterns`);
    set.forEach((p, i) => {
      if (p.length !== 7) throw new Error(`EAN ${name}${i} is not 7 modules`);
      // Every EAN digit is exactly two bars and two spaces; L and G start with a space, R with a bar.
      const runs = p.match(/(.)\1*/g).length;
      if (runs !== 4) throw new Error(`EAN ${name}${i} should have 4 runs, has ${runs}`);
    });
  }
  if (EAN_PARITY.length !== 10 || EAN_PARITY.some((p) => p.length !== 6)) {
    throw new Error('EAN parity table is malformed');
  }
}
assertTables();

const toModules = (bits) => [...bits].map((b) => (b === '1' ? 1 : 0));

// Widths alternate bar, space, bar, space… so an even index is ink.
function widthsToModules(widths) {
  const out = [];
  [...widths].forEach((w, i) => {
    const on = i % 2 === 0 ? 1 : 0;
    for (let n = 0; n < Number(w); n++) out.push(on);
  });
  return out;
}

/** The check digit for an EAN/UPC body, which is every digit except the check digit itself. */
export function eanCheckDigit(digits) {
  const d = String(digits).replace(/\D/g, '');
  // Weights run 3,1,3,1… from the RIGHT of the body, which is the only definition that works
  // unchanged for EAN-8, UPC-A and EAN-13 despite their different lengths.
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    const fromRight = d.length - 1 - i;
    sum += Number(d[i]) * (fromRight % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Code 128's running checksum: start value plus each symbol weighted by its position. */
function c128Checksum(values) {
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  return sum % 103;
}

const isDigits = (s) => /^\d+$/.test(s);

/**
 * Code 128, the general-purpose one.
 *
 * Code set B carries any printable ASCII, which is what an internal asset tag or a batch reference
 * usually is. Code set C packs two digits into one symbol, halving the width of a numeric string —
 * worth having, because numeric strings are most of what gets printed onto a label.
 *
 * The switching is deliberately simple: all-digit data uses C (after one digit in B when the length
 * is odd, so the remainder pairs up), anything else stays in B throughout. Chasing the optimal
 * mixed encoding buys a few millimetres and costs a class of bugs that only shows up on a scanner.
 */
export function encodeCode128(value) {
  const data = String(value ?? '');
  if (!data) throw new Error('Code 128 needs some text to encode');
  for (const ch of data) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Code 128 here supports printable ASCII only, not ${JSON.stringify(ch)}`);
  }

  const values = [];
  if (isDigits(data)) {
    let rest = data;
    if (rest.length % 2 === 1) {
      values.push(C128_START_B, rest.charCodeAt(0) - 32, C128_CODE_C);
      rest = rest.slice(1);
    } else {
      values.push(C128_START_C);
    }
    for (let i = 0; i < rest.length; i += 2) values.push(Number(rest.slice(i, i + 2)));
  } else {
    values.push(C128_START_B);
    for (const ch of data) values.push(ch.charCodeAt(0) - 32);
  }
  values.push(c128Checksum(values));
  values.push(C128_STOP);

  const modules = [];
  for (const v of values) modules.push(...widthsToModules(C128_PATTERNS[v]));
  return {
    symbology: 'code128',
    text: data,
    modules,
    // Ten modules each side, which is the minimum the specification allows.
    quietZone: 10,
    displayText: data,
  };
}

/**
 * EAN-13, and with it UPC-A and EAN-8.
 *
 * A UPC-A is an EAN-13 whose first digit is zero: the same 95 modules, the same guards, and the
 * leading zero simply selects the all-L parity. Rather than write a second encoder that would have
 * to be kept in step with this one, UPC-A is prefixed and handed straight here.
 */
export function encodeEan(value, kind = 'ean13') {
  const raw = String(value ?? '').replace(/[\s-]/g, '');
  if (!isDigits(raw)) throw new Error('An EAN or UPC code is digits only');

  const bodyLen = { ean13: 12, ean8: 7, upca: 11 }[kind];
  if (bodyLen === undefined) throw new Error(`Unknown symbology ${kind}`);

  // Accept the code with or without its check digit. Most people have the number printed on the
  // box, check digit included; some have only the body. Recomputing either way also means a
  // mistyped check digit is corrected rather than faithfully printed as an unscannable code.
  let body;
  if (raw.length === bodyLen) body = raw;
  else if (raw.length === bodyLen + 1) body = raw.slice(0, bodyLen);
  else throw new Error(`${kind.toUpperCase()} needs ${bodyLen} digits (or ${bodyLen + 1} with the check digit), got ${raw.length}`);

  const check = eanCheckDigit(body);
  const full = body + check;
  const digits = [...full].map(Number);

  let bits = GUARD_EDGE;
  if (kind === 'ean8') {
    for (let i = 0; i < 4; i++) bits += EAN_L[digits[i]];
    bits += GUARD_MID;
    for (let i = 4; i < 8; i++) bits += EAN_R[digits[i]];
  } else {
    const wide = kind === 'upca' ? '0' + full : full;
    const wideDigits = [...wide].map(Number);
    const parity = EAN_PARITY[wideDigits[0]];
    for (let i = 0; i < 6; i++) {
      const d = wideDigits[i + 1];
      bits += parity[i] === 'L' ? EAN_L[d] : EAN_G[d];
    }
    bits += GUARD_MID;
    for (let i = 7; i < 13; i++) bits += EAN_R[wideDigits[i]];
  }
  bits += GUARD_EDGE;

  const want = kind === 'ean8' ? 67 : 95;
  if (bits.length !== want) throw new Error(`${kind} came out ${bits.length} modules, expected ${want}`);

  return {
    symbology: kind,
    text: full,
    modules: toModules(bits),
    // EAN asks for more room on the left than the right, because the left is where a scanner
    // establishes the module width. Nine is the specified minimum for the leading side.
    quietZone: kind === 'ean8' ? 7 : 9,
    displayText: full,
  };
}

export const SYMBOLOGIES = {
  code128: { id: 'code128', label: 'Code 128', hint: 'Any text or number. The usual choice for asset tags, batches and internal references.' },
  ean13: { id: 'ean13', label: 'EAN-13', hint: '12 digits, or 13 with the check digit. Retail products worldwide.' },
  ean8: { id: 'ean8', label: 'EAN-8', hint: '7 digits, or 8 with the check digit. Small retail packs.' },
  upca: { id: 'upca', label: 'UPC-A', hint: '11 digits, or 12 with the check digit. Retail in the US and Canada.' },
};

/** One entry point, so a block only has to store which symbology it wants. */
export function encodeLinear(value, symbology = 'code128') {
  if (symbology === 'code128') return encodeCode128(value);
  if (symbology in SYMBOLOGIES) return encodeEan(value, symbology);
  throw new Error(`Unknown symbology ${symbology}`);
}

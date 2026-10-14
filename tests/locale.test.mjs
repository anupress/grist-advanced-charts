// Numbers in the document's locale (3.9): formatting, currency placement, and reading typed numbers.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = await import(pathToFileURL(_resolve(ROOT, 'src/util.js')).href);

let pass = 0, fail = 0;
const sp = (s) => String(s).replace(/[  ]/g, ' ');   // compare with plain spaces
const eq = (n, got, want) => { if (sp(JSON.stringify(got)) === sp(JSON.stringify(want))) pass++; else { fail++; console.log(`  FAIL ${n}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); } };

// ---- English is exactly what it was before 3.9 (the tutorial videos and every English dashboard)
function oldFmt(v, opts = {}, L) {
  if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  const trimZero = (x) => String(Number(x.toFixed(2)));
  const { compact, currency, percent, decimals } = opts;
  if (percent) return (n).toLocaleString(L, { maximumFractionDigits: decimals ?? 1 }) + '%';
  if (compact && Math.abs(n) >= 1000) {
    const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
    for (const [s, f] of units) if (Math.abs(n) >= f) return (currency ? currency : '') + trimZero(n / f) + s;
  }
  const fixed = decimals != null ? n.toFixed(decimals) : trimZero(Math.round(n * 100) / 100);
  return (currency || '') + Number(fixed).toLocaleString(L, { maximumFractionDigits: decimals ?? 2 });
}
const values = [0, 4.3, 12.5, 999, 1000, 1234.567, 7670, 481800, 1170000, 2.5e9, -3456.78, 0.0049];
const optsList = [{}, { compact: true }, { compact: true, currency: '$' }, { currency: '€' }, { percent: true }, { decimals: 2 }, { decimals: 0, currency: '£' }];
for (const L of ['en-US', 'en-GB']) {
  u.setLocale(L, null);
  for (const v of values) for (const o of optsList) eq(`${L} unchanged ${v} ${JSON.stringify(o)}`, u.fmtNumber(v, o), oldFmt(v, o, L));
}
u.setLocale('en-US', null);
eq('en compact', u.fmtNumber(1170000, { compact: true, currency: '$' }), '$1.17M');
eq('en plain', u.fmtNumber(1234.567), '1,234.57');

// ---- German
u.setLocale('de-DE', 'EUR');
eq('de plain', u.fmtNumber(1234.567), '1.234,57');
eq('de small', u.fmtNumber(4.3), '4,3');
eq('de currency after, with a space', u.fmtNumber(1234.5, { currency: '€' }), '1.234,5 €');
eq('de compact millions', u.fmtNumber(1170000, { compact: true }), '1,17 Mio.');
eq('de compact with currency', u.fmtNumber(1170000, { compact: true, currency: '€' }), '1,17 Mio. €');
eq('de compact thousands are written out', u.fmtNumber(481800, { compact: true }), '481.800');
eq('de percent', u.fmtNumber(30.92, { percent: true }), '30,9 %');
eq('de cell', u.formatCellValue(1234.5, { type: 'Numeric' }), '1.234,5');
eq('de currency column takes the document currency', u.formatCellValue(9.5, { type: 'Numeric', widgetOptions: { numMode: 'currency', decimals: 2 } }), '9,50 €');
eq('de placeholders', u.interpolate('%total rows', { total: 12345 }), '12.345 rows');
eq('de separators', u.numberSymbols(), { decimal: ',', group: '.' });

// ---- French: a space groups thousands, the currency follows
u.setLocale('fr-FR', null);
eq('fr plain', u.fmtNumber(1234.5), '1 234,5');
eq('fr currency', u.fmtNumber(1234.5, { currency: '€' }), '1 234,5 €');

// ---- percentages the caller rounded
u.setLocale('en-GB', null);
eq('en pct unchanged', u.pctText(30.92), '30.92%');
eq('en pct string unchanged', u.pctText('0.50'), '0.50%');
u.setLocale('de-DE', 'EUR');
eq('de pct', u.pctText(30.92), '30,92 %');
eq('de pct integer', u.pctText(7), '7 %');
u.setLocale('fr-FR', null);
eq('fr pct', u.pctText('1.5'), '1,5 %');

// ---- reading typed numbers
const P = (s, L) => u.parseLocaleNumber(s, L);
eq('de 9,50', P('9,50', 'de-DE'), 9.5);
eq('de 1.234,56', P('1.234,56', 'de-DE'), 1234.56);
eq('de 1.234 is a thousand and more', P('1.234', 'de-DE'), 1234);
eq('de 12.5 is twelve and a half', P('12.5', 'de-DE'), 12.5);
eq('de 1.234.567', P('1.234.567', 'de-DE'), 1234567);
eq('de -3,5', P('-3,5', 'de-DE'), -3.5);
eq('de with a euro sign', P('9,50 €', 'de-DE'), 9.5);
eq('de 1 234,5 with a space', P('1 234,5', 'de-DE'), 1234.5);
eq('en 9.50', P('9.50', 'en-US'), 9.5);
eq('en 1,234.56', P('1,234.56', 'en-US'), 1234.56);
eq('en 1,234', P('1,234', 'en-US'), 1234);
eq('en 1.234 stays a decimal', P('1.234', 'en-US'), 1.234);
eq('en 12,5 is twelve and a half', P('12,5', 'en-US'), 12.5);
eq('fr 1 234,56', P('1 234,56', 'fr-FR'), 1234.56);
eq('de-CH 1\'234.56', P("1'234.56", 'de-CH'), 1234.56);
eq('exponent', P('1e3', 'de-DE'), 1000);
eq('integer', P('42', 'de-DE'), 42);
eq('text is not a number', Number.isNaN(P('abc', 'de-DE')), true);
eq('empty is not a number', Number.isNaN(P('', 'de-DE')), true);

console.log(`locale: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

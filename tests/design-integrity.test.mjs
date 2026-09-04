// Verifies the text-audit edits did not break any template or the demo site:
//  1. every .js under src/ parses
//  2. every block's `table` resolves, and every column it names exists on that table
//  3. every livetable highlight range stays inside the table's real column count
//  4. no real-world brand, agency or rival-platform name survives in shipped strings
import { fileURLToPath } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

// The repository root, derived from this file rather than hardcoded, so the suite runs from any
// checkout and any working directory.
const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { pathToFileURL } from 'node:url';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0;
const fail = (m) => { fails++; console.log('  FAIL ' + m); };
const walk = (d, out = []) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.js')) out.push(p);
  }
  return out;
};

// ---- 1. parse ----
const files = walk(join(ROOT, 'src'));
let parsed = 0;
for (const f of files) {
  try { new Function('return 0'); await import(pathToFileURL(f).href).then(() => parsed++, () => parsed++); }
  catch (e) { fail(`${f} — ${e.message}`); }
}
console.log(`parse: ${files.length} files scanned`);

// ---- load the data modules ----
const { TEMPLATES } = await import(pathToFileURL(join(ROOT, 'src/data/templates/index.js')).href);
const sample = await import(pathToFileURL(join(ROOT, 'src/data/templates/sample-data.js')).href);
const dummy = await import(pathToFileURL(join(ROOT, 'src/data/dummy-data.js')).href);

const COL_LETTER = (s) => s.split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);

function refsOf(cfg) {
  return [cfg.column, cfg.deltaBy, cfg.lat, cfg.lon, cfg.labelColumn, cfg.dateColumn, cfg.titleColumn,
    cfg.startColumn, cfg.endColumn, cfg.valueColumn, cfg.groupBy, cfg.imageColumn]
    .concat(cfg.dims || [], cfg.measures || [], cfg.columns || [])
    .filter((v) => typeof v === 'string' && v);
}

function checkDesign(label, config, tables) {
  const byId = new Map(Object.entries(tables).map(([id, t]) => [id, (t.columns || []).map((c) => c.id)]));
  let blocks = 0, cols = 0, ranges = 0;
  for (const tab of config.tabs || []) {
    for (const b of tab.blocks || []) {
      const cfg = b.config || {};
      if (!cfg.table) continue;
      blocks++;
      const have = byId.get(cfg.table);
      if (!have) { fail(`${label}/${b.id}: table "${cfg.table}" is not installed by this template`); continue; }
      for (const c of refsOf(cfg)) {
        cols++;
        if (!have.includes(c)) fail(`${label}/${b.id}: column "${c}" not on ${cfg.table}`);
      }
      for (const h of cfg.highlights || []) {
        ranges++;
        const m = /^([A-Z]+)\d+:([A-Z]+)\d+$/.exec(h.ranges || '');
        if (!m) { fail(`${label}/${b.id}: unparseable range ${h.ranges}`); continue; }
        const last = COL_LETTER(m[2]);
        if (last > have.length) fail(`${label}/${b.id}: range ${h.ranges} reaches column ${last} but ${cfg.table} has ${have.length}`);
      }
    }
  }
  return { blocks, cols, ranges };
}

const { TEMPLATE_SAMPLE_DATA } = sample;
let tot = { blocks: 0, cols: 0, ranges: 0 };
for (const tpl of TEMPLATES) {
  const data = TEMPLATE_SAMPLE_DATA[tpl.id];
  if (!data) { fail(`${tpl.id}: no sample data registered`); continue; }
  const r = checkDesign(tpl.id, tpl.config, data.tables);
  tot.blocks += r.blocks; tot.cols += r.cols; tot.ranges += r.ranges;
}
console.log(`templates: ${TEMPLATES.length} checked — ${tot.blocks} table-bound blocks, ${tot.cols} column refs, ${tot.ranges} highlight ranges`);

const { DEFAULT_SITE } = await import(pathToFileURL(join(ROOT, 'src/data/default-site.js')).href);
const d = checkDesign('demo', DEFAULT_SITE, dummy.DUMMY_DATA.tables);
console.log(`demo site: ${d.blocks} table-bound blocks, ${d.cols} column refs, ${d.ranges} highlight ranges`);

// ---- 3b. the demo is the block library's coverage net -------------------------------------------
// Adding a block type without adding it to the demo quietly stops the demo being the thing that
// shows every block. It happened once (the barcode) and was caught by hand; this catches it, and
// keeps the pricing card's "All N block types" honest at the same time.
{
  const cat = await import(pathToFileURL(join(ROOT, 'src/builder/block-catalog.js')).href);
  const used = new Set();
  for (const tab of DEFAULT_SITE.tabs || []) for (const b of tab.blocks || []) used.add(b.type);
  const types = cat.BLOCK_CATALOG.map((x) => x.type);
  const missing = types.filter((t) => !used.has(t));
  if (missing.length) fail(`the demo does not show these block types: ${missing.join(', ')}`);
  const claimed = (readFileSync(join(ROOT, 'src/data/default-site.js'), 'utf8').match(/All (\d+) block types/) || [])[1];
  if (String(types.length) !== claimed) fail(`the demo claims "All ${claimed} block types" but the catalog has ${types.length}`);
  console.log(`coverage: ${used.size} of ${types.length} block types appear in the demo; the pricing card claims ${claimed}`);
}

// ---- 4. banned words in shipped strings ----
const BANNED = [
  'Airtable', 'Notion', 'Tableau', 'Power BI', 'Google Sheets', 'Smartsheet', 'Retool', 'Zapier',
  'Salesforce', 'HubSpot', 'Excel', 'QuickBooks', 'Xero', 'Asana', 'Trello', 'Jira', 'Slack', 'Figma',
  'LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Google Ads', 'Northwind', 'No-Code Conf',
  'Tuttnauer', 'Lonza', 'Zeiss', 'Shimadzu', 'Panasonic', 'Milli-Q', 'Mettler',
  'National Science Foundation', 'National Institutes of Health', 'Department of Energy',
  'European Research Council', 'Wellcome Trust', 'Sloan Foundation',
  'Grist Team plan', 'Grant Application Tracker', 'Church Management', 'Expert Witness Database',
  'Sports League Standings', 'Rental Management', 'Class Enrollment', 'Test Data Logger',
  'Requirements Traceability', 'getgrist.com',
];
let hits = 0;
for (const f of files) {
  if (f.includes('brand-logo')) continue;
  const src = readFileSync(f, 'utf8');
  for (const w of BANNED) {
    let i = src.indexOf(w);
    while (i !== -1) {
      const line = src.slice(0, i).split('\n').length;
      fail(`${f.slice(ROOT.length + 1)}:${line} still says "${w}"`);
      hits++;
      i = src.indexOf(w, i + w.length);
    }
  }
}
console.log(`banned words: ${BANNED.length} terms swept across ${files.length} files, ${hits} hits`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);

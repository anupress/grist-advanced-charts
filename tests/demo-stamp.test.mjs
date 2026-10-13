// The demo design is stamped as the installed, untouched 'demo-dashboard' template, so the template
// picker calls it "Active" and not "Active · edited" (which it did on every fresh demo until 3.8.3).
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;
const { DEFAULT_SITE } = await import(R('src/data/default-site.js'));
const { designSignature, clone } = await import(R('src/util.js'));
const { TEMPLATES } = await import(R('src/data/templates/index.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};

console.log('demo stamp');
eq('the demo names its template', DEFAULT_SITE.templateId, 'demo-dashboard');
eq('...and that template exists', TEMPLATES.some((t) => t.id === 'demo-dashboard'), true);
eq('its signature matches its design', DEFAULT_SITE.templateSig, designSignature(DEFAULT_SITE));
eq('a copy of the demo (what a document boots with) still matches', designSignature(clone(DEFAULT_SITE)), DEFAULT_SITE.templateSig);
const edited = clone(DEFAULT_SITE);
edited.tabs[0].blocks[0].config.title = 'Changed';
eq('a change breaks the match, so an edited demo still reads as edited', designSignature(edited) === DEFAULT_SITE.templateSig, false);
const dark = clone(DEFAULT_SITE);
dark.theme.mode = 'dark';
eq("a viewer's dark mode is not an edit", designSignature(dark), DEFAULT_SITE.templateSig);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

// Production build: bundle + minify (esbuild) then obfuscate (javascript-obfuscator).
// Runs in CI (GitHub Actions has Node) — local development needs NO build step,
// because src/ runs directly in the browser as native ES modules.
//
// Output: dist/ contains index.html, vendored libs, assets, and a split, minified,
// comment-free JS bundle. The Grist custom-widget URL points at dist/.

import { build } from 'esbuild';
import JsObfuscator from 'javascript-obfuscator';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist';
const root = process.cwd();

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}
function copyIfExists(src, dest) { if (fs.existsSync(src)) cp(src, dest); }

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

// 1. Bundle the whole app into a single IIFE (dynamic imports are inlined). IIFE obfuscates
//    far more reliably than split ESM (no import/export bindings to preserve). The dist still
//    ships multiple files (vendored libs + styles + this bundle).
const result = await build({
  entryPoints: { app: 'src/main.js' },
  bundle: true,
  format: 'iife',
  splitting: false,
  minify: true,
  legalComments: 'none',
  target: ['es2019'],
  outdir: path.join(OUT, 'assets'),
  metafile: true,
  write: false,
});

// 2. Obfuscate every emitted JS chunk, write the rest verbatim.
// NOTE: We intentionally do NOT use these options — they break the reflective el() helper
// (which inspects object literal keys at runtime) and cause silent DOMException failures
// in embedded Grist widgets. Learned the hard way in v1 on self-hosted Grist:
//   - transformObjectKeys: mangles our { class:'…', onClick:fn } props objects
//   - controlFlowFlattening + deadCodeInjection: added a lot of noise for little gain
// Identifier mangling + string-array + base64 still makes the code hard to casually read.
const obfOpts = {
  compact: true,
  identifierNamesGenerator: 'mangled-shuffled',
  numbersToExpressions: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  unicodeEscapeSequence: false,
};
for (const file of result.outputFiles) {
  const rel = path.relative(root, file.path);
  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  if (file.path.endsWith('.js')) {
    const obf = JsObfuscator.obfuscate(file.text, obfOpts).getObfuscatedCode();
    fs.writeFileSync(file.path, obf);
    console.log('obfuscated', rel);
  } else {
    fs.writeFileSync(file.path, file.contents);
    console.log('emitted   ', rel);
  }
}

// 3. Static assets + vendored libs + styles (data & SVGs are JS modules => bundled).
copyIfExists('vendor', path.join(OUT, 'vendor'));
copyIfExists('src/styles', path.join(OUT, 'assets/styles'));
copyIfExists('src/assets/brand', path.join(OUT, 'assets/media/brand'));
copyIfExists('examples', path.join(OUT, 'examples'));
copyIfExists('manifest.json', path.join(OUT, 'manifest.json'));

// 4. Production index.html — load the obfuscated entry chunk.
const indexHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Advanced Charts — by ANUPRESS</title>
<link rel="icon" href="assets/media/brand/favicon.png" type="image/png"/>
<link rel="apple-touch-icon" href="assets/media/brand/favicon.png"/>
<link rel="stylesheet" href="assets/styles/tokens.css"/>
<link rel="stylesheet" href="assets/styles/base.css"/>
<link rel="stylesheet" href="assets/styles/site.css"/>
<link rel="stylesheet" href="assets/styles/builder.css"/>
<link rel="stylesheet" href="vendor/leaflet.css"/>
<link rel="stylesheet" href="vendor/MarkerCluster.css"/>
<link rel="stylesheet" href="vendor/MarkerCluster.Default.css"/>
<script src="vendor/grist-plugin-api.js"></script>
<script src="vendor/echarts.min.js"></script>
<script src="vendor/Sortable.min.js"></script>
<script src="vendor/leaflet.js"></script>
<script src="vendor/leaflet.markercluster.js"></script>
</head><body><div id="anupress-root" class="ap-root" aria-live="polite"></div>
<script src="assets/app.js"></script></body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml);

console.log('\\nBuild complete -> dist/');

// Which blocks a printout may hold: everything but an embedded frame, and the catalog is the list.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { isPrintable, unprintableReason } = await import(pathToFileURL(join(ROOT, 'src/print/printable.js')).href);
const { BLOCK_CATALOG } = await import(pathToFileURL(join(ROOT, 'src/builder/block-catalog.js')).href);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + msg); } };

const types = BLOCK_CATALOG.map((b) => b.type);
const out = types.filter((t) => !isPrintable({ type: t }));
ok(out.sort().join() === 'embed,widget', `exactly the two frame blocks are unprintable (got ${out.join()})`);
ok(types.filter((t) => isPrintable({ type: t })).length === types.length - 2, 'every other catalog type prints');
ok(!isPrintable(null) && !isPrintable(undefined), 'nothing is not printable');
ok(unprintableReason({ type: 'chart' }) === null, 'a printable block has no reason');
ok(/frame/.test(unprintableReason({ type: 'widget' })) && /frame/.test(unprintableReason({ type: 'embed' })), 'the reasons name the frame');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

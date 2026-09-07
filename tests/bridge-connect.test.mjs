// connect() decides whether the widget is inside Grist or merely inside an iframe.
//
// The bug these cover: grist.ready() returns nothing, so awaiting it "succeeded" instantly inside
// any iframe — a blog post embedding the demo, say — and the app went live against a host that
// was never there. What proves a host is a message from it.
import { pathToFileURL } from 'node:url';
import { resolve as _resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRIDGE = process.env.BRIDGE_PATH || 'src/grist/bridge.js';
let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
};

let n = 0;
async function freshBridge({ inFrame, search = '', grist }) {
  globalThis.window = globalThis;
  globalThis.self = globalThis;
  globalThis.top = inFrame ? {} : globalThis;
  globalThis.location = { search };
  if (grist) globalThis.grist = grist; else delete globalThis.grist;
  return import(pathToFileURL(_resolve(ROOT, BRIDGE)).href + `?n=${++n}`);
}

/** A host that answers ready() the way Grist does: a settings message, at once, at any access level. */
function gristLike(calls) {
  const listeners = [];
  return {
    ready: (opts) => { calls.push(`ready:${opts?.requiredAccess}`); setTimeout(() => listeners.forEach((f) => f({ settings: { accessLevel: 'none' } })), 5); },
    on: (evt, fn) => { if (evt === 'message') listeners.push(fn); },
    // Grist sending a later message, e.g. after the access level changes in the panel.
    push: (msg) => listeners.forEach((f) => f(msg)),
  };
}
/** Any other parent page: ready() posts into the void and nothing ever comes back. */
const silentParent = (calls) => ({ ready: (opts) => { calls.push(`ready:${opts?.requiredAccess}`); }, on: () => {} });

{
  const calls = [];
  const host = gristLike(calls);
  const b = await freshBridge({ inFrame: true, grist: host });
  eq('inside Grist: the host answers, so we are live', await b.connect(500), true);
  // One ask, for full access: the plugin API ignores every ready() after the first, so asking for
  // less here and more later never reached Grist.
  eq('and it asked for full access, once', calls, ['ready:full']);
  eq('isLive follows', b.isLive(), true);
  eq('the level Grist reported is what accessLevel() answers', b.accessLevel(), 'none');
  eq('so a write is refused until Grist grants full', await b.escalateToFull(), false);
  host.push({ settings: { accessLevel: 'full' } });
  eq('a later settings message updates the level', b.accessLevel(), 'full');
  eq('and the write is allowed without a second ready()', await b.escalateToFull(), true);
  eq('ready() was still called exactly once', calls, ['ready:full']);
}
{
  const calls = [];
  const t0 = Date.now();
  const b = await freshBridge({ inFrame: true, grist: silentParent(calls) });
  eq('inside a plain iframe: no answer, so demo', await b.connect(300), false);
  eq('ready was still sent, in case the host is merely slow', calls, ['ready:full']);
  eq('it gave up at the timeout rather than hanging', Date.now() - t0 < 2000, true);
  eq('isLive stays false', b.isLive(), false);
}
{
  const b = await freshBridge({ inFrame: false, grist: gristLike([]) });
  eq('top-level page: demo without asking', await b.connect(500), false);
}
{
  const calls = [];
  const b = await freshBridge({ inFrame: true, search: '?demo=1', grist: gristLike(calls) });
  eq('?demo inside any frame: demo', await b.connect(500), false);
  eq('and ready is never sent', calls, []);
}
{
  const b = await freshBridge({ inFrame: true, grist: undefined });
  eq('no API script at all: demo', await b.connect(500), false);
}
{
  // An API whose ready() returns a promise and has no event bus: the promise is the proof.
  const b = await freshBridge({ inFrame: true, grist: { ready: async () => {} } });
  eq('a promise-returning ready() without on(): trusted', await b.connect(500), true);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

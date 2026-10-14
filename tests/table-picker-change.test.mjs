// "Edit the data in …" names the table the block reads now, not the one its editor opened with.
//
// The button's label follows a bubbling 'change' in the drawer. A native <select> sends one; the
// table picker that replaced it in 3.3.0 did not, so after switching a chart from Sales to another
// table the button went on saying "Edit the data in Sales" (it still opened the right table).
// Found while checking Refresh with a table made after the widget opened, on 3.9.0.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as _resolve } from 'node:path';

const ROOT = _resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => pathToFileURL(_resolve(ROOT, p)).href;

// Just enough of a document: elements with parents, listeners, bubbling events and closest().
const node = (tag) => {
  const classes = new Set();
  const n = {
    nodeType: 1, tagName: tag.toUpperCase(), dataset: {}, children: [], attrs: {}, listeners: {}, parentNode: null, textContent: '',
    style: { setProperty() {} },
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
      toggle: (c, on) => ((on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c)),
    },
    set className(v) { String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return n.attrs[k] ?? null; },
    addEventListener(t, fn) { (n.listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) { n.listeners[t] = (n.listeners[t] || []).filter((f) => f !== fn); },
    dispatchEvent(e) {
      for (let at = n; at; at = e.bubbles ? at.parentNode : null) for (const fn of at.listeners[e.type] || []) fn(e);
      return true;
    },
    append(...kids) { for (const k of kids) { if (k && typeof k === 'object') k.parentNode = n; n.children.push(k); } },
    closest(sel) { const c = sel.replace(/^\./, ''); for (let at = n; at; at = at.parentNode) if (at.classList?.contains(c)) return at; return null; },
    contains(other) { for (let at = other; at; at = at.parentNode) if (at === n) return true; return false; },
    focus() {},
    click() { n.dispatchEvent({ type: 'click', bubbles: true }); },
  };
  if (tag === 'template') n.content = { firstElementChild: null };
  Object.defineProperty(n, 'innerHTML', { set() { if (n.content) n.content.firstElementChild = node('svg'); } });
  return n;
};
globalThis.document = {
  createElement: node, createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  body: node('body'), documentElement: node('html'),
};
globalThis.window = globalThis;

const { tablePicker } = await import(R('src/builder/ui.js'));
const { editDataRow } = await import(R('src/builder/block-editor.js'));

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.log(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const all = (n, out = []) => { if (n && typeof n === 'object') { out.push(n); (n.children || []).forEach((c) => all(c, out)); } return out; };
const option = (root, v) => all(root).find((x) => x.attrs.role === 'option' && x.dataset.v === v);
const labelOf = (row) => all(row).find((x) => x.tagName === 'SPAN' && /^Edit the data in /.test(x.textContent))?.textContent;

const provider = {
  isLive: true,
  tables: () => [{ id: 'Sales', label: 'Sales' }, { id: 'Stock', label: 'Stock' }, { id: 'Parts', label: 'Parts' }],
  columns: () => [], records: () => [],
};

// A drawer with a table picker and the Edit data button, wired the way the block editors wire them.
async function drawerFor(onChangeFor) {
  const wb = { config: { table: 'Sales' } };
  const drawer = node('div'); drawer.className = 'ap-drawer';
  const picker = tablePicker(provider, wb.config.table, onChangeFor(wb));
  const row = editDataRow(() => wb.config.table, { provider }, () => {});
  drawer.append(picker, row);
  await tick();   // editDataRow attaches its listener one tick after it is built
  return { wb, drawer, picker, row };
}

{
  const { wb, drawer, picker, row } = await drawerFor((wb) => (v) => { wb.config.table = v; });
  eq('the button starts on the block\'s table', labelOf(row), 'Edit the data in Sales');
  const seen = [];
  drawer.addEventListener('change', () => seen.push(wb.config.table));
  option(picker, 'Stock').click();
  eq('choosing a table tells the drawer, once', seen.length, 1);
  eq('after the block already reads the new table', seen, ['Stock']);
  eq('the button names the new table', labelOf(row), 'Edit the data in Stock');
  option(picker, 'Parts').click();
  eq('and the next one', labelOf(row), 'Edit the data in Parts');
}

{
  // Most editors change table in an async handler (read the rows, then redraw); the table is set
  // before its first await, which is all the label needs.
  const { row, picker } = await drawerFor((wb) => async (v) => { wb.config.table = v; await tick(); });
  option(picker, 'Stock').click();
  eq('an editor that reads rows first still renames the button', labelOf(row), 'Edit the data in Stock');
}

{
  // An editor that rebuilds itself on change takes the picker out of the drawer: the event then
  // reaches nothing, and nothing breaks.
  const { picker } = await drawerFor(() => () => {});
  picker.parentNode = null;
  let threw = null;
  try { option(picker, 'Stock').click(); } catch (e) { threw = e.message; }
  eq('a picker no longer in a drawer chooses without error', threw, null);
}

console.log(`table-picker-change: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

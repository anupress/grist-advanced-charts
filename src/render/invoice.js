// Invoice block: turns a row of an invoice table into a document you can send.
//
// It reads whatever shape the table is already in, because invoice tables come in two:
//
//   FLAT       one row per invoice with a single Amount column. Most people start here, and it is
//              what our own finance template ships. Renders as a one-line invoice.
//   ITEMISED   a header row plus a separate line-items table pointing back at it, each line
//              carrying a description, quantity and unit price. This is what an invoice actually
//              wants once it has more than one thing on it.
//
// Both are handled by the same block: point it at a line-items table and it itemises, leave that
// blank and it bills the amount column. Nothing has to be restructured to get a usable invoice out.
//
// The client works the same way. A Client column holding a name is matched against a client table
// by name; a Grist reference column arrives as a row id and is looked up directly. Either gives a
// billing address without the author having to know which kind they have.
//
// The sender's own details — name, address, logo, terms, tax — live in the block's config rather
// than a table. They are branding: they belong with the theme and the logo, they are the same on
// every invoice, and putting them in the design means there is no extra table to create before the
// block does anything.

import { el, fmtNumber, clone } from '../util.js';
import { icon } from '../assets/icons.js';
import { sanitizeToFragment } from '../security/sanitize.js';

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.eE+-]/g, '')); return isFinite(n) ? n : 0; };
const money = (v, cur) => fmtNumber(v, { currency: cur || '$', decimals: 2 });

// A date for a document, not a dashboard: "28 Aug 2026" rather than "2026-08-28".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function docDate(v) {
  if (v == null || v === '') return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (!m) return String(v);
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/** The client's name and address block, whichever way the table refers to them. */
function resolveClient(row, c, ctx) {
  const raw = row[c.clientColumn];
  if (raw == null || raw === '') return { name: '—', lines: [] };

  const clientRows = c.clientTable ? (ctx.provider.records(c.clientTable) || []) : [];
  let match = null;
  if (clientRows.length) {
    // A Grist reference arrives as a row id; a plain text column arrives as the name itself.
    match = typeof raw === 'number'
      ? clientRows.find((r) => r.id === raw)
      : clientRows.find((r) => String(r[c.clientNameColumn] ?? '').trim().toLowerCase() === String(raw).trim().toLowerCase());
  }
  if (!match) return { name: String(raw), lines: [] };

  const lines = (c.clientAddressColumns || [])
    .map((col) => String(match[col] ?? '').trim())
    .filter(Boolean);
  return { name: String(match[c.clientNameColumn] ?? raw), lines };
}

/**
 * The billable lines. Itemised when a line-items table is configured and has rows for this
 * invoice; otherwise a single line standing for the invoice's own amount, so a flat table still
 * produces a correct document rather than an empty one.
 */
function resolveLines(row, c, ctx) {
  if (c.itemsTable && c.itemsLinkColumn) {
    const all = ctx.provider.records(c.itemsTable) || [];
    const mine = all.filter((r) => {
      const link = r[c.itemsLinkColumn];
      // The link is a row id when it is a reference, or the invoice number when it is text.
      return link != null && (link === row.id || String(link) === String(row[c.numberColumn]));
    });
    if (mine.length) {
      return mine.map((r) => {
        const qty = c.itemQtyColumn ? num(r[c.itemQtyColumn]) : 1;
        const price = c.itemPriceColumn ? num(r[c.itemPriceColumn]) : 0;
        // Trust a stored line total when the table keeps one — it may be a formula with rounding
        // or a discount baked in that qty x price would not reproduce.
        const amount = c.itemTotalColumn && r[c.itemTotalColumn] != null && r[c.itemTotalColumn] !== ''
          ? num(r[c.itemTotalColumn]) : qty * price;
        return { desc: String(r[c.itemDescColumn] ?? 'Item'), qty, price, amount, itemised: true };
      });
    }
  }
  const amount = num(row[c.amountColumn]);
  return [{ desc: c.singleLineLabel || 'Services rendered', qty: 1, price: amount, amount, itemised: false }];
}

function totalsFor(lines, c) {
  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const rate = Math.max(0, Math.min(100, num(c.taxRate)));
  const tax = rate ? subtotal * (rate / 100) : 0;
  return { subtotal, rate, tax, total: subtotal + tax };
}

function party(title, name, lines, extra) {
  return el('div', { class: 'ap-invoice__party' }, [
    el('div', { class: 'ap-invoice__partylabel', text: title }),
    el('div', { class: 'ap-invoice__partyname', text: name || '—' }),
    ...(lines || []).map((l) => el('div', { class: 'ap-invoice__partyline', text: l })),
    ...(extra || []).map((l) => el('div', { class: 'ap-invoice__partyline ap-invoice__partyline--meta', text: l })),
  ]);
}

function metaField(label, value, cls) {
  return el('div', { class: 'ap-invoice__meta' + (cls ? ' ' + cls : '') }, [
    el('div', { class: 'ap-invoice__metalabel', text: label }),
    el('div', { class: 'ap-invoice__metavalue', text: value }),
  ]);
}

// The document itself, for one invoice row.
function buildDocument(row, c, ctx) {
  const from = c.from || {};
  const cur = c.currency || '$';
  const client = resolveClient(row, c, ctx);
  const lines = resolveLines(row, c, ctx);
  const t = totalsFor(lines, c);
  const status = c.statusColumn ? String(row[c.statusColumn] ?? '') : '';
  const itemised = lines.some((l) => l.itemised);

  const logo = from.logoData
    ? el('img', { class: 'ap-invoice__logo', src: from.logoData, alt: from.name || 'Logo' })
    : null;

  const head = el('div', { class: 'ap-invoice__head' }, [
    el('div', { class: 'ap-invoice__brand' }, [
      logo,
      el('div', { class: 'ap-invoice__fromname', text: from.name || 'Your business' }),
    ]),
    el('div', { class: 'ap-invoice__title' }, [
      el('div', { class: 'ap-invoice__word', text: c.documentTitle || 'Invoice' }),
      el('div', { class: 'ap-invoice__number', text: String(row[c.numberColumn] ?? `#${row.id}`) }),
      status ? el('span', { class: 'ap-invoice__status', dataset: { status: status.toLowerCase() }, text: status }) : null,
    ]),
  ]);

  const parties = el('div', { class: 'ap-invoice__parties' }, [
    party('From', from.name, String(from.address || '').split('\n').map((s) => s.trim()).filter(Boolean),
      [from.email, from.phone, from.taxId ? `${c.taxIdLabel || 'Tax ID'}: ${from.taxId}` : ''].filter(Boolean)),
    party('Bill to', client.name, client.lines),
    el('div', { class: 'ap-invoice__metas' }, [
      metaField('Issued', docDate(row[c.dateColumn])),
      c.dueColumn ? metaField('Due', docDate(row[c.dueColumn]), 'is-due') : null,
      metaField('Amount due', money(t.total, cur), 'is-total'),
    ]),
  ]);

  const table = el('table', { class: 'ap-invoice__table' }, [
    el('thead', {}, [el('tr', {}, [
      el('th', { scope: 'col', text: 'Description' }),
      itemised ? el('th', { scope: 'col', class: 'is-num', text: 'Qty' }) : null,
      itemised ? el('th', { scope: 'col', class: 'is-num', text: 'Unit price' }) : null,
      el('th', { scope: 'col', class: 'is-num', text: 'Amount' }),
    ])]),
    el('tbody', {}, lines.map((l) => el('tr', {}, [
      el('td', { text: l.desc }),
      itemised ? el('td', { class: 'is-num', text: String(l.qty) }) : null,
      itemised ? el('td', { class: 'is-num', text: money(l.price, cur) }) : null,
      el('td', { class: 'is-num', text: money(l.amount, cur) }),
    ]))),
  ]);

  const totalRow = (label, value, cls) => el('div', { class: 'ap-invoice__totalrow' + (cls ? ' ' + cls : '') }, [
    el('span', { text: label }), el('span', { class: 'is-num', text: value }),
  ]);
  const totals = el('div', { class: 'ap-invoice__totals' }, [
    totalRow('Subtotal', money(t.subtotal, cur)),
    t.rate ? totalRow(`${c.taxLabel || 'Tax'} ${t.rate}%`, money(t.tax, cur)) : null,
    totalRow('Total', money(t.total, cur), 'is-grand'),
  ]);

  const noteText = c.noteColumn ? String(row[c.noteColumn] ?? '').trim() : '';
  const foot = (noteText || c.terms) ? el('div', { class: 'ap-invoice__foot' }, [
    noteText ? el('div', { class: 'ap-invoice__note' }, [
      el('div', { class: 'ap-invoice__partylabel', text: 'Note' }),
      el('div', { text: noteText }),
    ]) : null,
    c.terms ? el('div', { class: 'ap-invoice__terms' }, [
      el('div', { class: 'ap-invoice__partylabel', text: 'Payment terms' }),
      (() => { const d = el('div'); d.appendChild(sanitizeToFragment(c.terms)); return d; })(),
    ]) : null,
  ]) : null;

  return el('div', { class: 'ap-invoice__doc', style: c.accent ? { '--ap-inv-accent': c.accent } : null }, [
    head, parties, el('div', { class: 'ap-invoice__linesbox' }, [table]), totals, foot,
  ]);
}

export function renderInvoice(block, ctx) {
  const c = block.config || {};
  const rows = ctx.provider.records(c.table) || [];
  const isLivePage = ctx.edit === null;

  if (!rows.length) {
    return el('div', { class: 'ap-card ap-invoice', dataset: { blockId: block.id } }, [
      el('div', { class: 'ap-empty', text: 'No invoices to show yet — point this block at a table with some rows.' }),
    ]);
  }

  // Which invoice. The chooser is how "create an invoice from that table" actually feels: the
  // ledger is above, you pick a row, the document appears below it ready to print.
  const labelFor = (r) => {
    const n = c.numberColumn ? r[c.numberColumn] : null;
    const who = c.clientColumn ? r[c.clientColumn] : '';
    const clientName = typeof who === 'number' ? resolveClient(r, c, ctx).name : who;
    return [n || `#${r.id}`, clientName].filter(Boolean).join(' · ');
  };

  const docHost = el('div', { class: 'ap-invoice__host' });
  let current = rows.find((r) => String(r.id) === String(c.rowId)) || rows[0];
  const draw = () => docHost.replaceChildren(buildDocument(current, c, ctx));
  draw();

  const select = el('select', { class: 'ap-input ap-invoice__picker', 'aria-label': 'Choose an invoice' },
    rows.map((r) => el('option', { value: String(r.id), selected: r.id === current.id ? true : null, text: labelFor(r) })));
  select.addEventListener('change', () => {
    current = rows.find((r) => String(r.id) === select.value) || rows[0];
    draw();
  });

  const printBtn = el('button', { class: 'ap-btn ap-btn--primary ap-btn--sm ap-invoice__print', type: 'button' },
    [icon('download'), el('span', { text: 'Print / Save as PDF' })]);

  const card = el('div', { class: 'ap-card ap-invoice', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-invoice__bar' }, [
      el('div', { class: 'ap-invoice__barlabel', text: c.title || 'Invoice' }),
      select,
      printBtn,
    ]),
    docHost,
  ]);

  // Printing an invoice should produce the invoice, not the dashboard it happens to live on.
  // The page-level Print button prints everything, which is right for a ledger; here the intent is
  // narrower, so the block marks itself as the target and the print stylesheet hides its
  // neighbours. The flag is cleared on afterprint, and also on a timer, because a user who cancels
  // the dialog fires afterprint on most browsers but not reliably on all of them — and a page
  // stuck in print-only mode would look broken.
  printBtn.addEventListener('click', () => {
    if (!isLivePage) return;
    const root = document.getElementById('anupress-root') || document.body;
    const wrapper = card.closest('.ap-block') || card;
    wrapper.classList.add('is-printtarget');
    root.setAttribute('data-print-only', '1');
    const clear = () => {
      root.removeAttribute('data-print-only');
      wrapper.classList.remove('is-printtarget');
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
    setTimeout(clear, 60000); // belt and braces if afterprint never arrives
    window.print();
  });

  return card;
}

// Everything the editor needs to guess a sensible starting configuration from a table's columns,
// so the block draws a real invoice the moment it is added rather than after twelve dropdowns.
export function guessInvoiceConfig(columns, tables) {
  const ids = (columns || []).map((c) => c.id);
  const find = (...pats) => ids.find((id) => pats.some((p) => p.test(id))) || null;
  const dateCols = (columns || []).filter((c) => /^Date/i.test(c.type || '')).map((c) => c.id);
  return {
    numberColumn: find(/^invoice.?number$/i, /number/i, /^id$/i, /ref/i) || ids[0] || null,
    clientColumn: find(/client/i, /customer/i, /account/i, /company/i, /donor/i),
    dateColumn: find(/issue/i, /^date$/i, /created/i) || dateCols[0] || null,
    dueColumn: find(/due/i) || (dateCols[1] || null),
    amountColumn: find(/^amount$/i, /total/i, /value/i, /price/i),
    statusColumn: find(/status/i, /state/i),
    noteColumn: find(/note/i, /memo/i, /comment/i, /description/i),
    clientTable: (tables || []).map((t) => t.id).find((id) => /client|customer|account|business|compan/i.test(id)) || null,
  };
}

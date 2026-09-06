// The block a type starts life as when it is picked from the Add Element chooser.
//
// This used to live inside the builder as a chain of `if (type === …)` branches ending in the
// chart default. The chain was hand-maintained, and two block types were added to the catalog
// without a branch — so picking "Slicer" opened "Add chart", exactly as a community member
// reported. It is its own module now so a test can hold it against the catalog: every type the
// chooser offers must come back as that type, never as the fallback.
//
// Column guesses are deliberately visible defaults, not hidden ones: each lands in a dropdown in
// the block's editor, where a wrong guess is one click from right.

import { uid } from '../util.js';
import { autoPick, isMeasure, isDimension, isTemporal } from '../charts/recommend.js';
import { detectLatLon } from '../render/map.js';
import { guessInvoiceConfig } from '../render/invoice.js';
import { DEFAULT_MODULE_MM, DEFAULT_HEIGHT_MM } from '../render/barcode.js';
import { emptyCells } from '../data/grid.js';

const link = () => ({ kind: null, tab: null, url: null, newTab: true });

/**
 * @param {string} type       a BLOCK_CATALOG type id
 * @param {{ table: string, provider: { columns(table): Array, tables(): Array } }} ctx
 */
export function newBlock(type, { table, provider }) {
  const cols = provider.columns(table) || [];
  const blk = (span, config) => ({ id: uid('blk'), type, span, __isNew: true, config });

  if (type === 'stat') {
    const m = cols.filter(isMeasure)[0];
    const col = m || cols[0];
    // deltaBy is deliberately absent, not null: unset means "automatic", so a new stat picks up
    // the table's date column and shows a trend without anyone finding the setting. An explicit
    // null would mean the author had switched it off. See resolveDeltaBy in stats/aggregate.js.
    return blk(3, { table, label: 'New metric', column: col?.id, agg: m ? 'sum' : 'count', icon: 'pulse', format: { compact: true } });
  }
  if (type === 'text') return blk(12, { heading: 'New section', html: 'Write something here…' });
  if (type === 'breakdown') {
    const dim = cols.filter(isDimension)[0] || cols[0];
    return blk(4, { table, title: dim?.label || 'Breakdown', column: dim?.id, limit: 12 });
  }
  if (type === 'map') {
    const det = detectLatLon(cols);
    const label = cols.find((c) => /name|code|title|label/i.test(c.id)) || cols.filter(isDimension)[0] || cols[0];
    return blk(12, { table, title: 'Map', latColumn: det.lat || '', lonColumn: det.lon || '', labelColumn: label?.id || null, colorBy: null });
  }
  if (type === 'spacer') return blk(12, { height: 40 });
  if (type === 'button') return blk(3, { label: 'Click here', style: 'primary', align: 'left', target: link() });
  if (type === 'icon') return blk(3, { icon: 'sparkles', iconData: null, size: 'm', color: null, bg: null, align: 'left', target: link() });
  if (type === 'progress') {
    const m = cols.filter(isMeasure)[0];
    return blk(4, { title: 'Progress', mode: 'manual', value: 40, target: 100, table, valueColumn: (m || cols[0])?.id, agg: 'sum', prefix: '', suffix: '', color: null });
  }
  if (type === 'counter') return blk(3, { label: 'Happy customers', start: 0, end: 100, duration: 1400, prefix: '', suffix: '', decimals: 0, icon: 'sparkles', iconData: null });
  if (type === 'accordion') return blk(12, { title: 'Frequently asked questions', items: [{ q: 'Question one', a: 'Answer goes here.' }], openFirst: true });
  if (type === 'image') return blk(6, { mode: 'upload', imageData: null, ref: { table: null, column: null, row: null }, alt: '', fit: 'cover', caption: '', link: link() });
  if (type === 'testimonials') return blk(12, { title: 'What people are saying', mode: 'manual', entries: [{ name: '', quote: '', rating: 5, photoData: null }], table: null, nameColumn: null, quoteColumn: null, ratingColumn: null, photoColumn: null, limit: 6 });
  if (type === 'livetable') return blk(12, { title: '', table, columns: cols.slice(0, 5).map((c) => c.id), pageSize: 10, searchable: true, sortable: true, defaultSort: null, highlights: [] });
  // The column guesses matter more here than elsewhere: an invoice with the wrong column in the
  // "amount" slot is not a slightly-off chart, it is a wrong bill. guessInvoiceConfig() names the
  // usual suspects so the block draws something correct immediately, and every guess is a visible
  // dropdown in the editor rather than a hidden default.
  if (type === 'invoice') {
    const guess = guessInvoiceConfig(cols, provider.tables());
    return blk(12, {
      title: 'Invoice', documentTitle: 'Invoice', style: 'classic', footerText: null, table, ...guess,
      clientNameColumn: 'Name', clientAddressColumns: [],
      itemsTable: null, itemsLinkColumn: null, itemDescColumn: null, itemQtyColumn: null,
      itemPriceColumn: null, itemTotalColumn: null,
      singleLineLabel: 'Services rendered',
      from: { name: '', address: '', email: '', phone: '', taxId: '', logoData: null },
      terms: 'Payment due within 30 days of the issue date.',
      referenceColumn: null, referenceLabel: 'Your reference', totalLabel: 'Amount due',
      paymentDetails: '', paymentDetailsLabel: 'Payment details', preparedBy: '', thanksText: '',
      currency: '$', taxRate: 0, taxLabel: 'Tax', taxIdLabel: 'Tax ID', accent: null, rowId: null,
    });
  }
  if (type === 'embed') return blk(12, { html: '', css: '', js: '', height: 300 });
  if (type === 'qrcode') return blk(3, { text: 'https://', level: 'M', fg: '#000000', bg: '#ffffff', size: 200, caption: '' });
  // Empty on purpose: the preview says "Add a number or code", which is the truth, where a made-up
  // sample code could be printed onto a label before anyone noticed it was ours.
  if (type === 'barcode') return blk(3, { symbology: 'code128', value: '', moduleMm: DEFAULT_MODULE_MM, heightMm: DEFAULT_HEIGHT_MM, showText: true, fg: '#000000', bg: '#ffffff', caption: '' });
  if (type === 'countdown') return blk(4, { title: '', targetDate: new Date(Date.now() + 7 * 86400000).toISOString(), expiredText: 'This has ended.', color: null });
  if (type === 'timeline') return blk(12, { title: 'Our history', items: [{ date: '', title: 'Milestone one', description: '' }] });
  if (type === 'divider') return blk(12, { style: 'solid', thickness: 1, color: null });
  if (type === 'pricing') return blk(12, { title: 'Choose your plan', plans: [
    { name: 'Basic', price: '$9', period: '/mo', features: ['Feature one', 'Feature two'], highlighted: false, buttonLabel: 'Choose', buttonTarget: link() },
    { name: 'Pro', price: '$29', period: '/mo', features: ['Everything in Basic', 'Feature three', 'Feature four'], highlighted: true, buttonLabel: 'Choose', buttonTarget: link() },
  ] });
  if (type === 'calendar') {
    const dateCol = cols.find((c) => /date/i.test(c.type)) || cols[0];
    const titleCol = cols.find((c) => c.id !== dateCol?.id && /text|choice/i.test(c.type)) || cols.find((c) => c.id !== dateCol?.id) || cols[0];
    return blk(12, { title: 'Calendar', table, dateColumn: dateCol?.id, titleColumn: titleCol?.id, detailColumns: [], colorBy: null, draggable: true });
  }
  if (type === 'slicer') {
    // A Choice column makes the best slicer (few values, all meaningful), then a reference, then
    // any text-like column. Dates and numbers would give one chip per row.
    const col = cols.find((c) => /^Choice$/i.test(c.type))
      || cols.find((c) => /^Ref:/.test(c.type))
      || cols.filter(isDimension).find((c) => !isTemporal(c))
      || cols[0];
    return blk(12, { table, column: col?.id || '', label: col?.label || col?.id || '', style: 'auto', multi: true, showCounts: true });
  }
  // Six empty cells, three across: the shape people draw when they ask for "a grid". Blocks go
  // into the cells from the page, where each empty cell has its own Add button.
  if (type === 'grid') return blk(12, { title: '', cols: 3, rows: 2, gap: 'normal', cells: emptyCells(3, 2) });
  if (type !== 'chart') throw new Error(`newBlock: no default for block type "${type}"`);
  return blk(6, { table, title: 'New chart', ...autoPick(cols) });
}

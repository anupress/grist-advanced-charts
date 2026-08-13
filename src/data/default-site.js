// The prebuilt demo site — the FIRST thing anyone sees after pasting the widget URL into Grist
// (step 3 of the published guide: "explore sample data"). Its job is therefore not just to look
// good but to TEACH: what this widget is, what it can build, and how to make it yours.
//
// It is organized so each page answers one question, rather than being a pile of blocks:
//   Overview      — "what could my table look like?"      (the aspirational dashboard)
//   Chart types   — "what can it draw?"                   (all 11 chart types, labelled)
//   Live data     — "does it read my real rows?"          (table, breakdowns, map, calendar)
//   Team          — "does it handle more than one table?" (a second table, People)
//   Page elements — "is it only charts?"                  (the website blocks)
//   Get started   — "how do I do this with my data?"      (the five steps, privacy, FAQ)
//
// It also doubles as the sensible starting point once a real user begins editing, and as the
// coverage net for the block library: every one of the 21 block types and all 11 chart types
// appear here, each in a place where it makes sense rather than dumped on one "showcase" page.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget, spacer, image, testimonials,
  calcEmbed, placeholderImage,
} from './templates/_helpers.js';

export const SITE_VERSION = 1;

// A genuinely blank starting point, for "Start from scratch". Not a stripped-down copy of the demo
// — one empty page, no blocks, no sample copy, no createdTables record — so the first thing a user
// sees is their own canvas and the Add Element button, with nothing of ours to delete first.
// Deliberately keeps a header title and one page: a site with zero pages has nothing to click and
// no way back into the editor.
export function emptySite() {
  return {
    version: SITE_VERSION,
    theme: { paletteId: 'aurora', fontId: 'system', mode: 'auto' },
    dataTable: null,
    header: { logoData: null, title: 'My dashboard', slogan: '', menu: [{ label: 'Page 1', tab: 'tab-1' }] },
    footer: { text: '', links: [], showCredit: true },
    tabs: [{ id: 'tab-1', title: 'Page 1', hero: { enabled: false }, blocks: [] }],
  };
}

const GUIDE = 'https://anupress.com/advanced-charts-grist-widget-guide/';
const VIOLET = '#6d5efc';
const TEAL = '#16c4a6';

// Lightweight gradient "photo" used only to demo the hero slider (no bundled image files).
const demoSlide = (c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="420" fill="url(#g)"/><circle cx="1010" cy="70" r="240" fill="#fff" opacity="0.08"/><circle cx="160" cy="380" r="190" fill="#fff" opacity="0.06"/></svg>`);

const stat = (id, label, column, agg, icon, fmt, span = 3) =>
  ({ id, type: 'stat', span, config: { table: 'Sales', label, column, agg, icon, format: fmt, deltaBy: 'Month' } });

const chart = (id, title, chartType, dims, measures, extra = {}, span = 6) =>
  ({ id, type: 'chart', span, config: { table: 'Sales', title, chartType, dims, measures, agg: 'sum', ...extra } });

export const DEFAULT_SITE = {
  version: SITE_VERSION,
  theme: { paletteId: 'aurora', fontId: 'system', mode: 'auto' },
  dataTable: 'Sales',
  header: {
    logoData: null, // null => ANUPRESS brand mark
    title: 'Advanced Charts',
    slogan: 'Turn any Grist table into a dashboard',
    menu: [
      { label: 'Overview', tab: 'tab-overview' },
      { label: 'Chart types', tab: 'tab-charts' },
      { label: 'Live data', tab: 'tab-live' },
      { label: 'Team', tab: 'tab-team' },
      { label: 'Page elements', tab: 'tab-elements' },
      { label: 'Get started', tab: 'tab-start' },
    ],
  },
  footer: {
    text: '© 2026 Advanced Charts — a free, open-source widget for Grist.',
    links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Get started', tab: 'tab-start' }],
    showCredit: true,
  },
  tabs: [
    {
      id: 'tab-overview', title: 'Overview',
      hero: {
        title: 'This is a Grist table 👋',
        subtitle: 'Every number, chart and map on this page is read live from one ordinary table — no export, no BI tool, no server in the middle.',
        align: 'left', vAlign: 'bottom', size: 'xl', autoplay: true, interval: 6,
        slides: [
          { image: demoSlide(VIOLET, TEAL), title: 'This is a Grist table 👋', subtitle: 'Read live from 48 rows of demo data — nothing here is hard-coded.' },
          { image: demoSlide(TEAL, '#ff8a5b'), title: 'Point it at your own data', subtitle: 'Any table, any columns — text, number, choice, date, yes/no.' },
          { image: demoSlide('#7048e8', '#e64980'), title: 'Publish it as a page', subtitle: 'Menus, themes, dark mode and twenty-one kinds of block.' },
        ],
      },
      blocks: [
        stat('s1', 'Total Revenue', 'Revenue', 'sum', 'coins', { compact: true, currency: '$' }),
        stat('s2', 'Units Sold', 'Units', 'sum', 'cart', { compact: true }),
        stat('s3', 'Total Profit', 'Profit', 'sum', 'trending', { compact: true, currency: '$' }),
        stat('s4', 'Avg Satisfaction', 'Satisfaction', 'avg', 'star', { decimals: 1 }),
        chart('c1', 'Revenue over time', 'area', ['Month'], ['Revenue'], { smooth: true }, 8),
        chart('c2', 'Revenue by category', 'doughnut', ['Category'], ['Revenue'], {}, 4),
        chart('c3', 'Profit by region', 'column', ['Region'], ['Profit'], { sortByValue: true }, 6),
        chart('c4', 'Units by channel', 'column', ['Channel'], ['Units'], {}, 6),
        { id: 'c5', type: 'progress', span: 12, config: { title: 'Annual revenue goal', mode: 'data', table: 'Sales', valueColumn: 'Revenue', agg: 'sum', target: 3000000, prefix: '$', suffix: '', color: VIOLET } },
        text('c6', 'Everything above came from one table',
          'Four KPI cards, four charts and a progress bar — all reading the same 48-row demo table, each pointed at a different column. Nothing was typed in by hand, so when the rows change the page changes with them. Use the menu to see what else the widget can draw, or jump straight to <b>Get started</b> to point it at your own document.'),
        button('c7', 'Show me how to use my own data', 'primary', 'center', tabTarget('tab-start'), 12),
      ],
    },
    {
      id: 'tab-charts', title: 'Chart types',
      hero: { title: 'Eleven ways to draw it 📊', subtitle: 'The same demo table, plotted every way the widget knows how — with a note on when each one is the right choice.' },
      blocks: [
        text('g0', 'Not sure which to pick?',
          'The <b>guided chart wizard</b> reads the shape of your data and recommends one, so you never have to know what a treemap is for. This page shows the full set anyway, because seeing them side by side is the fastest way to recognise the one you want.'),
        chart('g1', 'Column — compare categories', 'column', ['Region'], ['Revenue'], { sortByValue: true }, 6),
        chart('g2', 'Bar — the same, but for long labels', 'bar', ['Product'], ['Revenue'], { sortByValue: true, limit: 8 }, 6),
        chart('g3', 'Line — change over time', 'line', ['Month'], ['Revenue', 'Profit'], { smooth: true }, 6),
        chart('g4', 'Area — a total that accumulates', 'area', ['Month'], ['Units'], { smooth: true }, 6),
        chart('g5', 'Pie — share of a whole', 'pie', ['Channel'], ['Revenue'], {}, 4),
        chart('g6', 'Doughnut — the same, with room in the middle', 'doughnut', ['Category'], ['Revenue'], {}, 4),
        chart('g7', 'Treemap — many parts at once', 'treemap', ['Product'], ['Revenue'], {}, 4),
        // Stages as MEASURES: no category, two or more values in the order they happen. Revenue
        // then Profit is the only true chain in this demo table — profit is part of revenue, not a
        // sibling of it — so the second stage's label reads as the margin, which is exactly the
        // drop-off a funnel exists to show. Marketing's template has the four-stage version.
        chart('g8', 'Funnel — stages that narrow', 'funnel', [], ['Revenue', 'Profit'],
          { subtitle: 'Each value is a stage; the label is what survives the one before' }, 4),
        // The same chart type built the other way, shown next to it on purpose. Grouping by a
        // category is what most people try first, and it only tells the truth when that column is
        // cumulative — a status or channel field partitions the total instead, so the widths are
        // just a sorted bar chart bent into a triangle. Easier to see the difference side by side
        // than to explain it.
        chart('g8b', 'Funnel — from a category instead', 'funnel', ['Channel'], ['Units'],
          { sortByValue: true, subtitle: 'Only honest when the column is cumulative — these are just sorted' }, 4),
        chart('g9', 'Radar — several categories compared', 'radar', ['Category'], ['Satisfaction'], { agg: 'avg' }, 4),
        // A gauge wants one number and no category dimension, so dims:[] is deliberate here —
        // groupAggregate treats an empty dims list as "aggregate the whole table to a single value".
        chart('g10', 'Gauge — one number against a scale', 'gauge', [], ['Satisfaction'], { agg: 'avg' }, 4),
        // Widened from 6 to make the thirteen charts tile the 12-column grid cleanly again after
        // the second funnel joined the row above: 4+4+4, 4+8, 12.
        chart('g11', 'Scatter — is one thing driving another?', 'scatter', ['Category'], ['Units', 'Revenue'], {}, 8),
        chart('g12', 'Stacked column — parts within a whole', 'column', ['Category', 'Region'], ['Revenue'], { stacked: true }, 12),
        text('g13', 'Every chart is configurable',
          'Chart type, columns, how values are grouped (sum, average, count, distinct count, minimum, maximum, median, standard deviation), sort order, series limits, smoothing, stacking and colours are all editable from the panel — no formulas required.'),
      ],
    },
    {
      id: 'tab-live', title: 'Live data',
      hero: { title: 'It reads your actual rows 🔎', subtitle: 'Not a screenshot and not a copy — searchable tables, grouped counts, maps, and a calendar that writes back.' },
      blocks: [
        {
          id: 'l1', type: 'livetable', span: 12,
          config: {
            title: 'Every row, searchable and sortable', table: 'Sales',
            columns: ['Month', 'Region', 'Category', 'Product', 'Units', 'Revenue', 'Profit', 'Margin'],
            pageSize: 8, searchable: true, sortable: true, defaultSort: null,
            // G = Profit in the RENDERED order, which follows the table's own column order
            // (render/livetable.js filters allCols) — not the order of the array above.
            highlights: [{ ranges: 'G1:G48', color: '#d3f9d8' }],
          },
        },
        text('l2', '',
          'Type in the search box, or click a column heading to sort. The <b>Profit</b> column is tinted using a spreadsheet-style range (<code>G1:G48</code>) — useful for drawing the eye to the column that matters, without touching your data.'),
        { id: 'l3', type: 'breakdown', span: 4, config: { table: 'Sales', title: 'Rows by region', column: 'Region', limit: 12, subtitle: '%groups regions' } },
        { id: 'l4', type: 'breakdown', span: 4, config: { table: 'Sales', title: 'Rows by category', column: 'Category', limit: 12 } },
        { id: 'l5', type: 'breakdown', span: 4, config: { table: 'Sales', title: 'Rows by channel', column: 'Channel', limit: 12, display: 'chart', chartType: 'doughnut' } },
        text('l6', 'Breakdowns count rows; charts measure them',
          'A breakdown answers "how many of each?" and shows as either a list or a chart. Reach for it when you want a count of a choice column — and for a chart when you want to sum or average a number.'),
        { id: 'l7', type: 'divider', span: 12, config: { style: 'dashed', thickness: 1, color: null } },
        {
          id: 'lv1', type: 'livetable', span: 12,
          config: {
            title: 'Invoices', table: 'Invoices',
            columns: ['InvoiceNumber', 'Client', 'IssueDate', 'DueDate', 'Amount', 'Status'],
            pageSize: 6, searchable: true, sortable: true, defaultSort: null, highlights: [],
          },
        },
        {
          id: 'lv2', type: 'invoice', span: 12,
          config: {
            title: 'Send one of them', documentTitle: 'Invoice', table: 'Invoices',
            numberColumn: 'InvoiceNumber', clientColumn: 'Client',
            dateColumn: 'IssueDate', dueColumn: 'DueDate',
            amountColumn: 'Amount', statusColumn: 'Status', noteColumn: 'Note',
            clientTable: 'Clients', clientNameColumn: 'Name',
            clientAddressColumns: ['Street', 'City', 'Country'],
            itemsTable: 'InvoiceItems', itemsLinkColumn: 'Invoice',
            itemDescColumn: 'Description', itemQtyColumn: 'Quantity',
            itemPriceColumn: 'UnitPrice', itemTotalColumn: 'LineTotal',
            singleLineLabel: 'Services rendered',
            from: {
              name: 'Anupress Studio', address: '12 Fore Street\nLondon EC2Y 5EN',
              email: 'billing@example.com', phone: '+1 (212) 555-0100', taxId: 'GB123456789',
              logoData: null,
            },
            terms: 'Payment due within 30 days. Bank details on request.',
            currency: '$', taxRate: 20, taxLabel: 'VAT', taxIdLabel: 'VAT no.', accent: null, rowId: null,
          },
        },
        text('lv3', 'A row becomes a document',
          'Pick an invoice above and it renders below as something you can actually send — your details, the client\'s address, every line with its quantity and unit price, tax and total. <b>Print / Save as PDF</b> prints just the invoice, not the page around it. It reads line items from their own table here; point it at a single amount column instead and it bills that as one line, so it works before you have restructured anything.'),
        { id: 'l8', type: 'calendar', span: 12, config: { title: 'Anything with a date becomes a calendar', table: 'Tasks', dateColumn: 'DueDate', titleColumn: 'Task', detailColumns: ['AssignedTo', 'Project', 'Status', 'Notes'], colorBy: 'Priority', draggable: true } },
        text('l9', '',
          'Click an event for its details, or a day\'s <b>+N more</b> link to see everything on that date. On a published page, dragging an event to another day writes the new date straight back to your table — and anything changed directly in Grist shows up here within about 15 seconds, with no refresh.'),
      ],
    },
    {
      id: 'tab-team', title: 'Team',
      hero: { title: 'More than one table 🧑‍🤝‍🧑', subtitle: 'Blocks on one page can each read a different table. This page is a 36-row People table — not the Sales data behind every other page.' },
      blocks: [
        { id: 'm1', type: 'stat', span: 3, config: { table: 'People', label: 'Headcount', column: 'Name', agg: 'count', icon: 'users', format: {} } },
        { id: 'm2', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Age', column: 'Age', agg: 'avg', icon: 'pulse', format: { decimals: 0 } } },
        { id: 'm3', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Salary', column: 'Salary', agg: 'avg', icon: 'coins', format: { compact: true, currency: '$' } } },
        { id: 'm4', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Performance', column: 'Rating', agg: 'avg', icon: 'star', format: { decimals: 1 } } },
        { id: 'm5', type: 'chart', span: 6, config: { table: 'People', title: 'Headcount by department', chartType: 'column', dims: ['Department'], measures: ['Name'], agg: 'count', sortByValue: true } },
        { id: 'm6', type: 'chart', span: 6, config: { table: 'People', title: 'Average salary by department', chartType: 'bar', dims: ['Department'], measures: ['Salary'], agg: 'avg', sortByValue: true } },
        { id: 'm7', type: 'map', span: 12, config: { table: 'People', title: 'Where the team is', subtitle: '%count team members mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'Department', popupColumns: ['Role', 'City', 'Salary'] } },
        text('m8', 'Any latitude/longitude pair becomes a map',
          'Point the map block at two numeric columns and it plots and clusters your rows, colours the pins by any other column, and shows whichever fields you choose when a pin is clicked. Map tiles are the one and only thing this widget fetches from outside: the tile service sees the map area and your IP address, never your data.'),
        { id: 'm9', type: 'chart', span: 12, config: { table: 'People', title: 'Age vs salary by department', chartType: 'scatter', dims: ['Department'], measures: ['Age', 'Salary'], agg: 'avg' } },
      ],
    },
    {
      id: 'tab-elements', title: 'Page elements',
      hero: { title: 'It builds pages, not just charts 🧩', subtitle: 'The blocks below hold no data at all — they are what turn a dashboard into something you would happily send to a client.' },
      blocks: [
        iconBlock('e1', 'sparkles', 'l', VIOLET, '#ffffff', 'center', 3),
        iconBlock('e2', 'target', 'l', TEAL, '#ffffff', 'center', 3),
        iconBlock('e3', 'shield', 'l', '#7048e8', '#ffffff', 'center', 3),
        iconBlock('e4', 'star', 'l', '#e64980', '#ffffff', 'center', 3),
        counter('e5', 'Block types', 0, 21, {}, 3),
        counter('e6', 'Chart types', 0, 11, {}, 3),
        counter('e7', 'Starter templates', 0, 9, {}, 3),
        counter('e8', 'Servers in the middle', 0, 0, {}, 3),
        text('e9', 'Icons and counters',
          'Counters animate upward when they scroll into view, and hold still if your system asks for reduced motion. Both take any icon from the built-in set, or an SVG of your own.'),
        { id: 'e10', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
        image('e11', placeholderImage(VIOLET, TEAL), 'A published dashboard on a laptop screen', 'Images can be uploaded, or pulled from a Grist attachment column', 6),
        testimonials('e12', 'What people say', [
          { name: 'Priya Patel', quote: 'We had a client-ready dashboard published before our coffee got cold.', rating: 5, photoData: null },
          { name: 'Diego Costa', quote: 'The only widget where our data genuinely never leaves our own document.', rating: 5, photoData: null },
        ], 6),
        { id: 'e13', type: 'pricing', span: 8, config: { title: 'Pricing tables, if you need one', plans: [
          { name: 'Advanced Charts', price: '$0', period: 'forever', features: ['All 21 block types', 'All 11 chart types', '9 starter templates', 'Open source and self-hostable'], highlighted: true, buttonLabel: 'Read the guide', buttonTarget: urlTarget(GUIDE) },
          { name: 'Your dashboard', price: 'Yours', period: 'to keep', features: ['Lives in your own document', 'No account, no sign-up', 'No analytics, no tracking', 'Works on self-hosted Grist'], highlighted: false, buttonLabel: 'Get started', buttonTarget: tabTarget('tab-start') },
        ] } },
        { id: 'e14', type: 'countdown', span: 4, config: { title: 'Countdowns for launches & deadlines', targetDate: new Date(Date.now() + 21 * 86400000).toISOString(), expiredText: 'The date has passed — this message replaces the timer.', color: VIOLET } },
        { id: 'e15', type: 'divider', span: 12, config: { style: 'dashed', thickness: 1, color: null } },
        text('e16', 'And a sandbox for anything else',
          'The embed block takes your own HTML, CSS and JavaScript and runs it in a sandboxed frame — useful for an iframe, a third-party snippet, or something small like the clock below. It is deliberately given no access to your Grist document.'),
        calcEmbed('e17', {
            title: 'Percentage change', resultLabel: 'Change',
            fields: [
              { key: 'before', label: 'Was', value: 88936 },
              { key: 'after', label: 'Now', value: 148500 },
            ],
            expr: 'v.before ? ((v.after - v.before) / v.before) * 100 : 0', suffix: '%', decimals: 1,
            note: 'Real HTML, CSS and JavaScript running in a sandboxed frame — try changing the numbers. The defaults are the first and last month of revenue in this demo.',
          }),
        spacer('e18', 20),
        button('e19', 'See every block in the Add Element panel', 'ghost', 'center', urlTarget(GUIDE), 12),
      ],
    },
    {
      id: 'tab-start', title: 'Get started',
      hero: { title: 'Make this yours in five steps ⚡', subtitle: 'You are already looking at step three. The rest takes a couple of minutes.' },
      blocks: [
        { id: 'x1', type: 'timeline', span: 12, config: { title: 'From demo data to your own dashboard', items: [
          { date: 'Step 1', title: 'Add a custom widget in Grist', description: 'On any page choose Add New → Add Widget to Page, pick Custom, and select the table you want to start from.' },
          { date: 'Step 2', title: 'Paste the widget URL', description: 'Open the three-dot menu → Widget options, and paste the Advanced Charts URL from the guide.' },
          { date: 'Step 3', title: 'Explore the sample data', description: 'This page. Nothing here has touched your document yet — click around, switch pages, try the calendar and the search box.' },
          { date: 'Step 4', title: 'Grant access, once', description: 'Click Edit and accept the consent screen. Full document access is what lets blocks read any table, and what lets the calendar write a moved date back.' },
          { date: 'Step 5', title: 'Build and publish', description: 'Add elements, point them at your columns, pick a theme, and save. The layout is stored in the document itself, so anyone who can see the page sees the dashboard.' },
        ] } },
        text('x2', 'Or start from a template',
          'Nine ready-made starter sites ship with the widget — Research Labs, Nonprofits, Legal, Higher Education, Marketing, Finance &amp; Accounting, Developers, Small Business and Sports Facility Management. Each arrives complete with its own demo tables, so you can see the finished shape first and swap in your own data afterwards. Click <b>Edit → Templates</b> to browse them.'),
        { id: 'x3', type: 'stat', span: 3, config: { table: 'Sales', label: 'Rows in this demo', column: 'Product', agg: 'count', icon: 'database', format: {} } },
        { id: 'x4', type: 'stat', span: 3, config: { table: 'Sales', label: 'Regions covered', column: 'Region', agg: 'countd', icon: 'globe', format: {} } },
        counter('x5', 'Accounts required', 0, 0, {}, 3),
        counter('x6', 'Minutes to first chart', 0, 2, {}, 3),
        { id: 'x7', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
        accordion('x8', 'Frequently asked questions', [
          { q: 'Does my data ever leave my browser?', a: 'No. Every chart, table and calculation runs client-side against your own Grist document. There is no ANUPRESS server, no analytics and no third-party calls. The single exception is map tiles, fetched from a public tile service that sees the map area and your IP address — never your data. If you use no map block, nothing is fetched at all.' },
          { q: 'Why does it ask for full document access?', a: 'Read-only access is limited to the one table the widget was added to. Full access is what lets blocks on a single page read different tables — as the Team page here does — and what lets the calendar write a rescheduled date back. You are asked once, and you can decline and still use everything read-only.' },
          { q: 'Where is my dashboard saved?', a: 'In the widget options of your own document, as plain configuration. There is nothing to back up separately, and copying the document copies the dashboard with it.' },
          { q: 'Does it work with self-hosted Grist?', a: 'Yes. The widget is a static page with no backend of its own, so it behaves the same against hosted Grist, a self-hosted instance, or grist-core running on your laptop.' },
          { q: 'What if I only want a couple of blocks?', a: 'Delete the rest. This demo is deliberately maximal so you can see what exists; a real page is usually four or five blocks. Nothing here is required.' },
        ]),
        { id: 'x9', type: 'qrcode', span: 4, config: { text: GUIDE, level: 'M', fg: '#0b1020', bg: '#ffffff', size: 180, caption: 'Scan to open the full guide on your phone' } },
        text('x10', 'Read the full guide',
          'The guide covers installation, every block type, theming, publishing and self-hosting, plus release notes for each version. It is the same link as the QR code beside it — handy if you are reading this on a laptop and would rather have the docs in your hand.'),
        spacer('x11', 10),
        button('x12', 'Open the guide', 'primary', 'center', urlTarget(GUIDE), 12),
      ],
    },
  ],
};

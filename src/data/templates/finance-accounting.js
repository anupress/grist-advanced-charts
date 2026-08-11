// Finance & Accounting template — a unified "money in vs money out" cockpit.
// Modeled on Grist's own three finance templates (Invoicing, Payroll, Expense Tracking), which
// ship as SEPARATE documents. This widget's edge is a published, website-style dashboard, so we
// unify them into one live view a small business actually runs its books from — and go past what
// those templates track: invoices carry a Status + Paid Date (so AR aging, overdue emphasis and a
// draggable due-date calendar are possible), expenses carry an approval Status, and a CashFlow
// summary ties the streams together by month. Five real tables — Invoices, Expenses, Payroll,
// Clients, CashFlow — matched by data/templates/sample-data.js's finance-accounting entry;
// adaptTemplateToTable + the template picker's create-or-map flow handle a real Grist document.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, clockEmbed, placeholderImage,
} from './_helpers.js';

const BLUE = '#0b6bcb';

export const TEMPLATE = {
  id: 'finance-accounting',
  name: 'Finance & Accounting',
  tagline: 'Invoices, payroll and expenses — one live cash cockpit',
  config: {
    version: 1,
    theme: { paletteId: 'corporate', fontId: 'system', mode: 'light' },
    dataTable: 'Invoices',
    header: {
      logoData: null, title: 'Anupress Financial', slogan: 'Every dollar, in one view',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Invoices', tab: 'tab-invoices' },
        { label: 'Payroll', tab: 'tab-payroll' }, { label: 'Expenses', tab: 'tab-expenses' },
        { label: 'Clients', tab: 'tab-clients' },
      ],
    },
    footer: { text: '© 2026 Anupress Financial.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Invoices', tab: 'tab-invoices' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Your money, in one live view 💵', subtitle: 'Cash in from invoices, cash out to payroll and expenses — pulled straight from the tables your business already keeps.' },
        blocks: [
          { id: 'fa1', type: 'stat', span: 3, config: { table: 'Invoices', label: 'Invoiced', column: 'Amount', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'fa2', type: 'stat', span: 3, config: { table: 'Invoices', label: 'Outstanding', column: 'Outstanding', agg: 'sum', icon: 'pulse', format: { compact: true, currency: '$' } } },
          { id: 'fa3', type: 'stat', span: 3, config: { table: 'Payroll', label: 'Payroll cost', column: 'Payment', agg: 'sum', icon: 'users', format: { compact: true, currency: '$' } } },
          { id: 'fa4', type: 'stat', span: 3, config: { table: 'Expenses', label: 'Expenses', column: 'Amount', agg: 'sum', icon: 'cart', format: { compact: true, currency: '$' } } },
          { id: 'fa5', type: 'chart', span: 8, config: { table: 'CashFlow', title: 'Money in vs out by month', chartType: 'column', dims: ['Month'], measures: ['Invoiced', 'Expenses', 'Payroll'], agg: 'sum' } },
          { id: 'fa6', type: 'breakdown', span: 4, config: { table: 'Invoices', title: 'Invoices by status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'fa7', type: 'chart', span: 8, config: { table: 'CashFlow', title: 'Net cash by month', chartType: 'area', dims: ['Month'], measures: ['Net'], agg: 'sum', smooth: true } },
          { id: 'fa8c', type: 'countdown', span: 4, config: { title: 'Next payroll run', targetDate: new Date(Date.now() + 12 * 86400000).toISOString(), expiredText: 'Payroll runs today — approve timesheets.', color: BLUE } },
          { id: 'fa8', type: 'progress', span: 12, config: { title: 'Annual revenue target', mode: 'data', table: 'Invoices', valueColumn: 'Amount', agg: 'sum', target: 750000, prefix: '$', color: BLUE } },
          text('fa9', 'About this dashboard', 'This cockpit reads five tables your business already keeps — Invoices, Expenses, Payroll, Clients and a monthly CashFlow summary. Click <b>Edit</b> to connect your own Grist document: create these tables with sample data in one click, or map each block onto tables you already have.'),
          accordion('fa10', 'Frequently asked questions', [
            { q: 'Where does this data live?', a: 'Entirely inside your own Grist document. This dashboard reads it in your browser and never sends financial data to a third-party server.' },
            { q: 'Can I chase overdue invoices from here?', a: 'Yes — the Invoices page has a due-date calendar. Drag an invoice to a new day to reschedule the follow-up, and it writes the new due date straight back to your Invoices table.' },
            { q: 'Is this a substitute for accounting software?', a: 'It\'s a live, shareable view of your operational finances — great for a team cockpit and client-ready reporting, alongside whatever ledger or tax software you already use.' },
          ]),
        ],
      },
      {
        id: 'tab-invoices', title: 'Invoices',
        hero: { title: 'Accounts receivable', subtitle: 'Who owes what, what\'s overdue, and what\'s due next — at a glance.' },
        blocks: [
          {
            id: 'fa11', type: 'livetable', span: 12,
            config: {
              title: 'Invoices', table: 'Invoices',
              columns: ['InvoiceNumber', 'Client', 'IssueDate', 'DueDate', 'Amount', 'Status'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F30', color: '#ffe3e3' }],
            },
          },
          text('fa11n', '', 'The <b>Status</b> column is highlighted so unpaid and overdue invoices catch the eye — the same cell-highlighting available on any Data Table block.'),
          { id: 'fa12', type: 'calendar', span: 12, config: { title: 'Invoice due dates', table: 'Invoices', dateColumn: 'DueDate', titleColumn: 'Client', detailColumns: ['InvoiceNumber', 'Amount', 'Status'], colorBy: 'Status', draggable: true } },
          text('fa12n', '', 'Drag an invoice to a new day to reschedule its due date — on the published page that writes straight back to your Invoices table, so your AR follow-up stays in sync both ways.'),
          spacer('fa12s', 10),
          { id: 'fa13', type: 'chart', span: 8, config: { table: 'Invoices', title: 'Billed by client', chartType: 'bar', dims: ['Client'], measures: ['Amount'], agg: 'sum', sortByValue: true } },
          {
            id: 'fa14', type: 'qrcode', span: 4,
            config: { text: 'https://anupress.com/pay/INV-1024', level: 'M', fg: '#0b3d5c', bg: '#ffffff', size: 180, caption: 'Add a “scan to pay” code to every invoice' },
          },
        ],
      },
      {
        id: 'tab-payroll', title: 'Payroll',
        hero: { title: 'Payroll', subtitle: 'Hours, rates and pay by period, role and person.' },
        blocks: [
          { id: 'fa15', type: 'stat', span: 3, config: { table: 'Payroll', label: 'Payroll cost', column: 'Payment', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'fa16', type: 'stat', span: 3, config: { table: 'Payroll', label: 'Hours logged', column: 'Hours', agg: 'sum', icon: 'countdown', format: { compact: true } } },
          { id: 'fa17', type: 'stat', span: 3, config: { table: 'Payroll', label: 'Avg. hourly rate', column: 'HourlyRate', agg: 'avg', icon: 'trending', format: { currency: '$', decimals: 0 } } },
          counter('fa18', 'People on payroll', 0, 7, {}, 3),
          { id: 'fa19', type: 'chart', span: 6, config: { table: 'Payroll', title: 'Cost by pay period', chartType: 'column', dims: ['PayPeriod'], measures: ['Payment'], agg: 'sum' } },
          { id: 'fa20', type: 'chart', span: 6, config: { table: 'Payroll', title: 'Cost by department', chartType: 'bar', dims: ['Department'], measures: ['Payment'], agg: 'sum', sortByValue: true } },
          { id: 'fa21', type: 'chart', span: 12, config: { table: 'Payroll', title: 'Hours by person', chartType: 'column', dims: ['Employee'], measures: ['Hours'], agg: 'sum', sortByValue: true } },
          {
            id: 'fa22', type: 'livetable', span: 12,
            config: { title: 'Pay records', table: 'Payroll', columns: ['Employee', 'Role', 'Department', 'PayPeriod', 'Hours', 'HourlyRate', 'Payment'], pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [{ ranges: 'G1:G28', color: '#e7f5ff' }] },
          },
        ],
      },
      {
        id: 'tab-expenses', title: 'Expenses',
        hero: { title: 'Expenses & budgets', subtitle: 'Where the money goes — by category, account and month.' },
        blocks: [
          { id: 'fa23', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'By category', column: 'Category', limit: 12 } },
          { id: 'fa24', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'By account', column: 'Account', limit: 12, display: 'chart', chartType: 'doughnut' } },
          { id: 'fa25', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'Approval status', column: 'Status', limit: 6 } },
          { id: 'fa26', type: 'chart', span: 8, config: { table: 'CashFlow', title: 'Spend by month', chartType: 'column', dims: ['Month'], measures: ['Expenses'], agg: 'sum' } },
          { id: 'fa27', type: 'progress', span: 4, config: { title: 'Quarterly expense budget', mode: 'data', table: 'Expenses', valueColumn: 'Amount', agg: 'sum', target: 60000, prefix: '$', color: BLUE } },
          {
            id: 'fa28', type: 'livetable', span: 12,
            config: { title: 'Expense log', table: 'Expenses', columns: ['Date', 'Account', 'Category', 'Description', 'Amount', 'Reimbursable', 'Status'], pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [{ ranges: 'E1:E42', color: '#fff3b0' }] },
          },
          text('fa28n', '', 'In your own document, add a <b>Receipt</b> attachment column to the Expenses table — the Image block can surface receipts, and access rules can let staff log their own expenses without seeing everyone else\'s.'),
        ],
      },
      {
        id: 'tab-clients', title: 'Clients',
        hero: { title: 'Clients', subtitle: 'Who you bill, where they are, and how much they\'re worth.' },
        blocks: [
          { id: 'fa29', type: 'map', span: 12, config: { table: 'Clients', title: 'Where our clients are', subtitle: '%count clients mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'State', popupColumns: ['City', 'TotalBilled'] } },
          {
            id: 'fa30', type: 'livetable', span: 12,
            config: { title: 'Client directory', table: 'Clients', columns: ['Name', 'Contact', 'Email', 'City', 'State', 'TotalBilled'], pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [] },
          },
          spacer('fa30s', 10),
          iconBlock('fa31', 'shield', 'l', BLUE, '#ffffff', 'center', 3),
          iconBlock('fa32', 'coins', 'l', '#0891b2', '#ffffff', 'center', 3),
          iconBlock('fa33', 'trending', 'l', BLUE, '#ffffff', 'center', 3),
          iconBlock('fa34', 'users', 'l', '#0891b2', '#ffffff', 'center', 3),
          counter('fa35', 'Years in business', 0, 12, {}, 3),
          counter('fa36', 'Active clients', 0, 10, {}, 3),
          counter('fa37', 'On-time payment rate', 0, 94, { suffix: '%' }, 3),
          counter('fa38', 'Invoices sent this year', 0, 30, {}, 3),
          spacer('fa38s', 10),
          image('fa39', placeholderImage(BLUE, '#0891b2'), 'Finance team reviewing dashboards', 'Where we close the books each month', 6),
          testimonials('fa40', 'What our clients say', [
            { name: 'George Whitman', quote: 'I can see exactly what I owe and when — no more chasing paper invoices.', rating: 5, photoData: null },
            { name: 'Linda Park', quote: 'Transparent, on time, and the reporting is genuinely clear.', rating: 5, photoData: null },
          ], 6),
          { id: 'fa41', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          {
            id: 'fa42', type: 'pricing', span: 12,
            config: {
              title: 'Bookkeeping & billing plans', plans: [
                { name: 'Starter', price: '$149', period: '/mo', features: ['Up to 25 invoices/mo', 'Monthly cash summary', 'Email support'], highlighted: false, buttonLabel: 'Get started', buttonTarget: tabTarget('tab-overview') },
                { name: 'Growth', price: '$349', period: '/mo', features: ['Unlimited invoices', 'Payroll & expense tracking', 'Overdue follow-up calendar'], highlighted: true, buttonLabel: 'Get started', buttonTarget: tabTarget('tab-overview') },
                { name: 'Firm', price: 'Custom', period: '', features: ['Multi-entity books', 'Dedicated accountant', 'Custom reporting'], highlighted: false, buttonLabel: 'Contact us', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('fa43', 'Talk to our finance team', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('fa43s', 20),
          clockEmbed('fa44', 'Business hours'),
        ],
      },
    ],
  },
};

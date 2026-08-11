// Small Business template — running the business, not closing the books.
// Grounded in three Grist docs: Account-based Sales Team (Companies.Account_Owner cascading into
// Contacts.Contact_Owner and Deals.Deal_Owner — the ownership chain its access rules depend on,
// with Deal_Stage running Cold → Responsive → Negotiating → Deal Closed), Payroll (Payment =
// Hours × a per-person, per-role rate) and Expense Tracking for Teams (Account + Expense_Type +
// receipt, employee auto-filled from the logged-in user).
//
// Deliberately positioned against our Finance & Accounting template: that one CLOSES THE BOOKS
// (invoices, AR ageing, cash flow). This one RUNS THE BUSINESS — pipeline first, then the people
// and costs behind it, so an owner can answer "am I selling enough to cover the team?". Payroll
// and expenses appear in both, which is right for an owner, but the centre of gravity differs.
//
// Past what the sources do: a dated, DRAGGABLE close-date forecast and a win rate — the ABM doc
// tracks stages but carries no dates and (per its own schema) no weighting or commission fields.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, clockEmbed, placeholderImage,
} from './_helpers.js';

const CLAY = '#c2410c';
const AMBER = '#d97706';

export const TEMPLATE = {
  id: 'small-business',
  name: 'Small Business',
  tagline: 'Pipeline, customers, team and costs — one owner’s view',
  config: {
    version: 1,
    theme: { paletteId: 'warmclay', fontId: 'humanist', mode: 'light' },
    dataTable: 'Deals',
    header: {
      logoData: null, title: 'Anupress Supply Co.', slogan: 'Locally owned, built on repeat business',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Pipeline', tab: 'tab-pipeline' },
        { label: 'Customers', tab: 'tab-customers' }, { label: 'Team', tab: 'tab-team' },
        { label: 'Costs', tab: 'tab-costs' },
      ],
    },
    footer: { text: '© 2026 Anupress Supply Co.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Customers', tab: 'tab-customers' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'How the business is actually doing 🛠️', subtitle: 'What’s in the pipeline, what we’ve won, who we serve, and what it costs to run — from the records we already keep.' },
        blocks: [
          { id: 'sb1', type: 'stat', span: 3, config: { table: 'Deals', label: 'Open pipeline', column: 'OpenAmount', agg: 'sum', icon: 'trending', format: { compact: true, currency: '$' } } },
          { id: 'sb2', type: 'stat', span: 3, config: { table: 'Deals', label: 'Won', column: 'WonAmount', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'sb3', type: 'stat', span: 3, config: { table: 'Team', label: 'Team cost', column: 'Payment', agg: 'sum', icon: 'users', format: { compact: true, currency: '$' } } },
          { id: 'sb4', type: 'stat', span: 3, config: { table: 'Expenses', label: 'Running costs', column: 'Amount', agg: 'sum', icon: 'cart', format: { compact: true, currency: '$' } } },
          { id: 'sb5', type: 'chart', span: 8, config: { table: 'Deals', title: 'Pipeline value by stage', chartType: 'column', dims: ['Stage'], measures: ['Amount'], agg: 'sum', sortByValue: true } },
          { id: 'sb6', type: 'breakdown', span: 4, config: { table: 'Deals', title: 'Deals by stage', column: 'Stage', limit: 8, display: 'chart', chartType: 'doughnut' } },
          { id: 'sb7', type: 'progress', span: 8, config: { title: 'Won against this year’s target', mode: 'data', table: 'Deals', valueColumn: 'WonAmount', agg: 'sum', target: 320000, prefix: '$', color: CLAY } },
          { id: 'sb8', type: 'countdown', span: 4, config: { title: 'Quarter ends', targetDate: new Date(Date.now() + 21 * 86400000).toISOString(), expiredText: 'New quarter — pipeline resets.', color: CLAY } },
          text('sb9', 'Our story', 'We started as a single van and grew one repeat customer at a time. This page reads straight from our own records — deals, customers, team hours and running costs — so we always know where we stand without building a report first.'),
          accordion('sb10', 'Frequently asked questions', [
            { q: 'How quickly can you quote a job?', a: 'Most quotes go out within two working days of a site visit. Anything in the pipeline here has a named owner chasing it.' },
            { q: 'Do you work outside your home city?', a: 'Yes — see the Customers page for where our current accounts are. We travel for the right job.' },
            { q: 'Who looks after my account?', a: 'Every company has a named account owner, and that same person owns the contacts and deals attached to it — so you are never handed around.' },
          ]),
        ],
      },
      {
        id: 'tab-pipeline', title: 'Pipeline',
        hero: { title: 'The pipeline', subtitle: 'Every live deal, who owns it, and when we expect it to land.' },
        blocks: [
          {
            id: 'sb11', type: 'calendar', span: 12,
            config: { title: 'Expected close dates', table: 'Deals', dateColumn: 'ExpectedClose', titleColumn: 'Company', detailColumns: ['DealNumber', 'Stage', 'Amount', 'Owner'], colorBy: 'Stage', draggable: true },
          },
          text('sb12', '', 'Drag a deal to a new day to move its expected close — on the published page that writes straight back to your Deals table. Grist’s own account-based sales template tracks stages but carries no dates at all, so the forecast lives in someone’s head.'),
          spacer('sb12s', 10),
          { id: 'sb13', type: 'stat', span: 3, config: { table: 'Deals', label: 'Open deals', column: 'IsOpen', agg: 'sum', icon: 'target', format: {} } },
          { id: 'sb14', type: 'stat', span: 3, config: { table: 'Deals', label: 'Deals won', column: 'IsWon', agg: 'sum', icon: 'check', format: {} } },
          { id: 'sb15', type: 'stat', span: 3, config: { table: 'Deals', label: 'Average deal', column: 'Amount', agg: 'avg', icon: 'coins', format: { currency: '$', decimals: 0 } } },
          { id: 'sb16', type: 'stat', span: 3, config: { table: 'Deals', label: 'Deals tracked', column: 'DealNumber', agg: 'count', icon: 'database', format: {} } },
          { id: 'sb17', type: 'chart', span: 6, config: { table: 'Deals', title: 'Open pipeline by owner', chartType: 'bar', dims: ['Owner'], measures: ['OpenAmount'], agg: 'sum', sortByValue: true } },
          { id: 'sb18', type: 'chart', span: 6, config: { table: 'Deals', title: 'Won value by company', chartType: 'bar', dims: ['Company'], measures: ['WonAmount'], agg: 'sum', sortByValue: true, limit: 8 } },
          {
            id: 'sb19', type: 'livetable', span: 12,
            config: {
              title: 'Deal register', table: 'Deals',
              columns: ['DealNumber', 'Company', 'LeadContact', 'Stage', 'ExpectedClose', 'Amount', 'Owner'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D28', color: '#ffe8cc' }],
            },
          },
          text('sb20', '', 'Stage is highlighted so a deal sitting in “Cold” for a month is obvious. Ownership cascades from the company, exactly as it does in Grist’s template — the account owner owns the contacts and the deals, which is what makes per-person access rules workable.'),
        ],
      },
      {
        id: 'tab-customers', title: 'Customers',
        hero: { title: 'Customers & contacts', subtitle: 'Who we serve, where they are, and who looks after them.' },
        blocks: [
          { id: 'sb21', type: 'map', span: 12, config: { table: 'Companies', title: 'Where our customers are', subtitle: '%count companies mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'Industry', popupColumns: ['City', 'AccountOwner', 'TotalValue'] } },
          { id: 'sb22', type: 'breakdown', span: 4, config: { table: 'Companies', title: 'By industry', column: 'Industry', limit: 10 } },
          { id: 'sb23', type: 'breakdown', span: 4, config: { table: 'Companies', title: 'Accounts per owner', column: 'AccountOwner', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'sb24', type: 'chart', span: 4, config: { table: 'Companies', title: 'Pipeline value by industry', chartType: 'bar', dims: ['Industry'], measures: ['TotalValue'], agg: 'sum', sortByValue: true } },
          {
            id: 'sb25', type: 'livetable', span: 12,
            config: {
              title: 'Company accounts', table: 'Companies',
              columns: ['Name', 'Industry', 'City', 'State', 'AccountOwner', 'OpenDeals', 'TotalValue'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F12', color: '#ffe8cc' }],
            },
          },
          {
            id: 'sb26', type: 'livetable', span: 12,
            config: {
              title: 'Contacts', table: 'Contacts',
              columns: ['FullName', 'Title', 'Company', 'Owner', 'LastInteraction', 'Interactions'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'E1:E19', color: '#e7f5ff' }],
            },
          },
          text('sb27', '', '<b>Last contacted</b> is highlighted — the single most useful column on this page. A customer nobody has spoken to in two months is a renewal you are about to lose.'),
        ],
      },
      {
        id: 'tab-team', title: 'Team',
        hero: { title: 'The team', subtitle: 'Who does the work, the hours behind it, and what it costs.' },
        blocks: [
          { id: 'sb28', type: 'stat', span: 3, config: { table: 'Team', label: 'Wage cost', column: 'Payment', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'sb29', type: 'stat', span: 3, config: { table: 'Team', label: 'Hours worked', column: 'Hours', agg: 'sum', icon: 'countdown', format: { compact: true } } },
          { id: 'sb30', type: 'stat', span: 3, config: { table: 'Team', label: 'Avg. hourly rate', column: 'HourlyRate', agg: 'avg', icon: 'trending', format: { currency: '$', decimals: 0 } } },
          counter('sb31', 'People on the team', 0, 7, {}, 3),
          { id: 'sb32', type: 'chart', span: 6, config: { table: 'Team', title: 'Wage cost by pay period', chartType: 'column', dims: ['PayPeriod'], measures: ['Payment'], agg: 'sum' } },
          { id: 'sb33', type: 'chart', span: 6, config: { table: 'Team', title: 'Cost by department', chartType: 'bar', dims: ['Department'], measures: ['Payment'], agg: 'sum', sortByValue: true } },
          { id: 'sb34', type: 'chart', span: 12, config: { table: 'Team', title: 'Hours by person', chartType: 'column', dims: ['Name'], measures: ['Hours'], agg: 'sum', sortByValue: true } },
          {
            id: 'sb35', type: 'livetable', span: 12,
            config: {
              title: 'Pay records', table: 'Team',
              columns: ['Name', 'Role', 'Department', 'PayPeriod', 'Hours', 'HourlyRate', 'Payment'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G28', color: '#ffe8cc' }],
            },
          },
          text('sb36', '', 'Pay is hours × rate, the same shape Grist’s payroll template uses. In your own document you can add a rates table so a person’s rate can change over time and by role, and the right rate is picked automatically for each period.'),
        ],
      },
      {
        id: 'tab-costs', title: 'Costs',
        hero: { title: 'Running costs', subtitle: 'What we spend to keep the vans moving and the lights on.' },
        blocks: [
          { id: 'sb37', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'By category', column: 'Category', limit: 12 } },
          { id: 'sb38', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'By account', column: 'Account', limit: 8, display: 'chart', chartType: 'doughnut' } },
          { id: 'sb39', type: 'breakdown', span: 4, config: { table: 'Expenses', title: 'Approval status', column: 'Status', limit: 4 } },
          { id: 'sb40', type: 'chart', span: 8, config: { table: 'Expenses', title: 'Spend by category', chartType: 'bar', dims: ['Category'], measures: ['Amount'], agg: 'sum', sortByValue: true } },
          { id: 'sb41', type: 'progress', span: 4, config: { title: 'Operating budget used', mode: 'data', table: 'Expenses', valueColumn: 'Amount', agg: 'sum', target: 30000, prefix: '$', color: AMBER } },
          {
            id: 'sb42', type: 'livetable', span: 12,
            config: {
              title: 'Expense log', table: 'Expenses',
              columns: ['Date', 'Account', 'Category', 'Description', 'Amount', 'Employee', 'Status'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'E1:E40', color: '#fff3b0' }],
            },
          },
          text('sb43', '', 'Everyone logs their own expenses into one table instead of mailing spreadsheets around — the exact pain Grist’s expense template was built for. Add a receipt attachment column in your own document and the photo travels with the row.'),
          spacer('sb43s', 10),
          { id: 'sb44', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          iconBlock('sb45', 'star', 'l', CLAY, '#ffffff', 'center', 3),
          iconBlock('sb46', 'users', 'l', AMBER, '#ffffff', 'center', 3),
          iconBlock('sb47', 'cart', 'l', CLAY, '#ffffff', 'center', 3),
          iconBlock('sb48', 'globe', 'l', AMBER, '#ffffff', 'center', 3),
          counter('sb49', 'Years in business', 0, 11, {}, 3),
          counter('sb50', 'Jobs completed', 0, 1840, { suffix: '+' }, 3),
          counter('sb51', 'Five-star reviews', 0, 640, { suffix: '+' }, 3),
          counter('sb52', 'Repeat customers', 0, 72, { suffix: '%' }, 3),
          image('sb53', placeholderImage(CLAY, AMBER), 'Team outside the workshop', 'The workshop on Main Street', 6),
          testimonials('sb54', 'What our customers say', [
            { name: 'Karen Lopez', quote: 'Feels like the owners actually know their customers — because they do!', rating: 5, photoData: null },
            { name: 'Mike Chen', quote: 'Quoted fast, turned up when they said, finished early. Rare.', rating: 5, photoData: null },
          ], 6),
          {
            id: 'sb55', type: 'pricing', span: 12,
            config: {
              title: 'How we work with you', plans: [
                { name: 'One-off job', price: 'Quoted', period: '', features: ['Free site visit', 'Fixed price before we start', '12-month workmanship warranty'], highlighted: false, buttonLabel: 'Request a quote', buttonTarget: tabTarget('tab-overview') },
                { name: 'Maintenance plan', price: '$180', period: '/mo', features: ['Scheduled visits', 'Priority callout', 'Parts at cost'], highlighted: true, buttonLabel: 'Start a plan', buttonTarget: tabTarget('tab-overview') },
                { name: 'Trade account', price: 'Custom', period: '', features: ['Monthly invoicing', 'Volume pricing', 'Named account owner'], highlighted: false, buttonLabel: 'Open an account', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('sb56', 'Get in touch', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('sb56s', 20),
          clockEmbed('sb57', 'Workshop hours'),
        ],
      },
    ],
  },
};

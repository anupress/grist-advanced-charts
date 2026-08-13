// Legal template — a matter-centric firm cockpit.
// Researched against Grist's legal positioning (case/matter management, billable hours incl.
// split-fee and contingency, expert-witness databases, invoicing generated from time logs, and
// above all **access rules / "ethical walls"**) and the real schemas behind its two legal docs,
// which ship separately and are internal-only:
//   • Expert Witness Database — All_Expert_Witnesses (CV attachment, "Worked for us?" flag, and a
//     two-level taxonomy where Primary_Fields is a formula derived from Secondary_Fields).
//   • Tracking Time + Invoicing — Clients.Rate_per_Hour → Projects rolling up Hours/Amount →
//     Time_Log (Amount = Duration_hrs × client rate, Mark_Start/Mark_End checkbox stopwatch) →
//     Invoices (Subtotal = Hours × rate, Due = invoice date + 30 days).
//
// Unified here over five tables — Matters, TimeEntries, Clients, ExpertWitnesses, Invoices — plus
// the things no source computes: a DRAGGABLE calendar of court dates (the highest-stakes dates in
// a practice), realization rate, profitability by practice area (a named pain point), and AR
// ageing on invoices.
//
// CONFIDENTIALITY: this page publishes. Matters are identified by number and practice area with no
// party names, and the copy tells firms to keep matter detail and billing rates behind Grist
// access rules and publish only the roll-ups.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, calcEmbed, placeholderImage,
} from './_helpers.js';

const SLATE = '#495057';
const GREY = '#868e96';

export const TEMPLATE = {
  id: 'legal',
  name: 'Legal',
  tagline: 'Matters, billable hours and experts — one practice view',
  config: {
    version: 1,
    theme: { paletteId: 'mono', fontId: 'serifmix', mode: 'auto' },
    dataTable: 'Matters',
    header: {
      logoData: null, title: 'Anupress Legal', slogan: 'Trusted counsel, clear results',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Matters', tab: 'tab-matters' },
        { label: 'Billing', tab: 'tab-billing' }, { label: 'Experts', tab: 'tab-experts' },
        { label: 'The Firm', tab: 'tab-firm' },
      ],
    },
    footer: { text: '© 2026 Anupress Legal. Attorney advertising.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Matters', tab: 'tab-matters' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Trusted counsel, clear results ⚖️', subtitle: 'A live view of the caseload, billable work and court calendar behind the practice.' },
        blocks: [
          { id: 'lg1', type: 'stat', span: 3, config: { table: 'Matters', label: 'Open matters', column: 'IsOpen', agg: 'sum', icon: 'database', format: {} } },
          { id: 'lg2', type: 'stat', span: 3, config: { table: 'TimeEntries', label: 'Billable hours', column: 'BillableHours', agg: 'sum', icon: 'countdown', format: { decimals: 0 } } },
          { id: 'lg3', type: 'stat', span: 3, config: { table: 'TimeEntries', label: 'Fees recorded', column: 'Amount', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'lg4', type: 'stat', span: 3, config: { table: 'Invoices', label: 'Outstanding', column: 'Outstanding', agg: 'sum', icon: 'pulse', format: { compact: true, currency: '$' } } },
          { id: 'lg5', type: 'chart', span: 8, config: { table: 'Matters', title: 'Fees by practice area', chartType: 'bar', dims: ['PracticeArea'], measures: ['Fees'], agg: 'sum', sortByValue: true } },
          { id: 'lg6', type: 'breakdown', span: 4, config: { table: 'Matters', title: 'Matters by status', column: 'Status', limit: 8, display: 'chart', chartType: 'doughnut' } },
          { id: 'lg7', type: 'progress', span: 8, config: { title: 'Billable hours against target', mode: 'data', table: 'TimeEntries', valueColumn: 'BillableHours', agg: 'sum', target: 220, suffix: 'hrs', color: SLATE } },
          { id: 'lg8', type: 'countdown', span: 4, config: { title: 'Next trial date', targetDate: new Date(Date.now() + 16 * 86400000).toISOString(), expiredText: 'In session — good luck to the team.', color: SLATE } },
          text('lg9', 'How to read this page', 'Everything here is a roll-up: matters appear by number and practice area, never by party name. Client detail, notes and billing rates stay inside our Grist document behind access rules — click <b>Edit</b> to connect it to your own firm\'s data.'),
          accordion('lg10', 'Frequently asked questions', [
            { q: 'How do I schedule a consultation?', a: 'Use the contact button on The Firm page, or call the office directly — most consultations are scheduled within a week.' },
            { q: 'What are your fees?', a: 'We work on hourly, contingency and flat-fee arrangements depending on the matter. The structure is agreed in writing before any engagement begins.' },
            { q: 'Is my information confidential?', a: 'Yes — everything you share is protected by attorney-client privilege from the moment we speak. Access rules inside our systems limit each matter to the team working it.' },
          ]),
        ],
      },
      {
        id: 'tab-matters', title: 'Matters',
        hero: { title: 'Caseload & court calendar', subtitle: 'What is live, who is leading it, and what is listed next.' },
        blocks: [
          {
            id: 'lg11', type: 'calendar', span: 12,
            config: { title: 'Court dates & deadlines', table: 'Matters', dateColumn: 'NextHearing', titleColumn: 'MatterNumber', detailColumns: ['PracticeArea', 'Status', 'LeadAttorney', 'Client'], colorBy: 'PracticeArea', draggable: true },
          },
          text('lg12', '', 'Drag a matter to a new day to move its listing — on the published page that writes straight back to your Matters table. Court dates are the one thing a practice cannot afford to hold in two places at once.'),
          spacer('lg12s', 10),
          { id: 'lg13', type: 'breakdown', span: 4, config: { table: 'Matters', title: 'By practice area', column: 'PracticeArea', limit: 10 } },
          { id: 'lg14', type: 'breakdown', span: 4, config: { table: 'Matters', title: 'By fee arrangement', column: 'FeeType', limit: 5, display: 'chart', chartType: 'doughnut' } },
          { id: 'lg15', type: 'chart', span: 4, config: { table: 'Matters', title: 'Matters per attorney', chartType: 'bar', dims: ['LeadAttorney'], measures: ['IsOpen'], agg: 'sum', sortByValue: true } },
          {
            id: 'lg16', type: 'livetable', span: 12,
            config: {
              title: 'Matter register', table: 'Matters',
              columns: ['MatterNumber', 'PracticeArea', 'Status', 'LeadAttorney', 'NextHearing', 'BudgetHours', 'HoursLogged'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D26', color: '#e9ecef' }],
            },
          },
          text('lg17', '', 'The highlighted column is <b>Next Court Date</b>. Budget against hours logged sits alongside it, so a matter running over can be spotted before the bill goes out, not after.'),
          { id: 'lg18', type: 'chart', span: 12, config: { table: 'Matters', title: 'Budget vs hours logged by matter', chartType: 'column', dims: ['MatterNumber'], measures: ['BudgetHours', 'HoursLogged'], agg: 'sum', limit: 12 } },
        ],
      },
      {
        id: 'tab-billing', title: 'Billing',
        hero: { title: 'Time & billing', subtitle: 'Recorded work, what of it is billable, and what has been collected.' },
        blocks: [
          { id: 'lg19', type: 'stat', span: 3, config: { table: 'TimeEntries', label: 'Hours recorded', column: 'Hours', agg: 'sum', icon: 'countdown', format: { decimals: 0 } } },
          { id: 'lg20', type: 'stat', span: 3, config: { table: 'TimeEntries', label: 'Billable hours', column: 'BillableHours', agg: 'sum', icon: 'check', format: { decimals: 0 } } },
          { id: 'lg21', type: 'stat', span: 3, config: { table: 'Invoices', label: 'Collected', column: 'Collected', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'lg22', type: 'stat', span: 3, config: { table: 'TimeEntries', label: 'Avg. hourly rate', column: 'Rate', agg: 'avg', icon: 'trending', format: { currency: '$', decimals: 0 } } },
          { id: 'lg23', type: 'chart', span: 6, config: { table: 'TimeEntries', title: 'Billable hours by attorney', chartType: 'bar', dims: ['Attorney'], measures: ['BillableHours'], agg: 'sum', sortByValue: true } },
          { id: 'lg24', type: 'chart', span: 6, config: { table: 'TimeEntries', title: 'Recorded vs billable by work type', chartType: 'column', dims: ['Description'], measures: ['Hours', 'BillableHours'], agg: 'sum' } },
          {
            id: 'lg25', type: 'livetable', span: 12,
            config: {
              title: 'Time log', table: 'TimeEntries',
              columns: ['Date', 'MatterNumber', 'Attorney', 'Description', 'Hours', 'Billable', 'Amount'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G60', color: '#e9ecef' }],
            },
          },
          text('lg26', '', 'Non-billable time is recorded too — writing it off silently is how firms lose track of realization. In your own document, time entries can price themselves from each client\'s rate, exactly as Grist\'s time-tracking template does.'),
          spacer('lg26s', 10),
          { id: 'lg27', type: 'breakdown', span: 4, config: { table: 'Invoices', title: 'Invoices by status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          {
            id: 'lg28', type: 'livetable', span: 8,
            config: {
              title: 'Invoices', table: 'Invoices',
              columns: ['InvoiceNumber', 'Client', 'InvoiceDate', 'DueDate', 'Hours', 'Amount', 'Status'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G22', color: '#ffe3e3' }],
            },
          },
          {
            id: 'lg28i', type: 'invoice', span: 12,
            config: {
              title: 'Bill a matter', documentTitle: 'Invoice', style: 'letterhead', table: 'Invoices',
              numberColumn: 'InvoiceNumber', clientColumn: 'Client', dateColumn: 'InvoiceDate',
              dueColumn: 'DueDate', amountColumn: 'Amount', statusColumn: 'Status', noteColumn: null,
              referenceColumn: null, referenceLabel: 'Matter reference', totalLabel: 'Amount due',
              clientTable: 'Clients', clientNameColumn: 'Name', clientAddressColumns: ['City', 'State'],
              itemsTable: null, itemsLinkColumn: null, itemDescColumn: null, itemQtyColumn: null,
              itemPriceColumn: null, itemTotalColumn: null, singleLineLabel: 'Professional fees',
              from: { name: 'Anupress Legal', address: '4 Chancery Lane\nLondon WC2A 1LG',
                email: 'billing@example.com', phone: '+1 (212) 555-0100', taxId: '', logoData: null },
              terms: 'Payable on receipt. Interest accrues on balances outstanding over 30 days.',
              paymentDetails: 'Client account payments only.\nBank: Example Bank   Account: 12345678',
              paymentDetailsLabel: 'How to pay', preparedBy: '', thanksText: '',
              currency: '$', taxRate: 0, taxLabel: 'VAT', taxIdLabel: 'VAT no.', accent: null,
              footerText: null, rowId: null,
            },
          },
          text('lg28j', 'A bill a client can act on',
            'Hours are recorded once against the matter and billed from here, so the invoice and the time ledger cannot disagree. The <b>Letterhead</b> style is deliberate: a firm&#39;s bill should read as correspondence rather than as a till receipt.'),
        ],
      },
      {
        id: 'tab-experts', title: 'Experts',
        hero: { title: 'Expert witnesses', subtitle: 'Who we can call, in what field, and who we have instructed before.' },
        blocks: [
          { id: 'lg29', type: 'stat', span: 3, config: { table: 'ExpertWitnesses', label: 'Experts on file', column: 'Name', agg: 'count', icon: 'users', format: {} } },
          { id: 'lg30', type: 'stat', span: 3, config: { table: 'ExpertWitnesses', label: 'Court appearances', column: 'CourtAppearances', agg: 'sum', icon: 'shield', format: {} } },
          { id: 'lg31', type: 'stat', span: 3, config: { table: 'ExpertWitnesses', label: 'Publications', column: 'Publications', agg: 'sum', icon: 'layout', format: {} } },
          { id: 'lg32', type: 'stat', span: 3, config: { table: 'ExpertWitnesses', label: 'Avg. day rate', column: 'DayRate', agg: 'avg', icon: 'coins', format: { currency: '$', decimals: 0 } } },
          { id: 'lg33', type: 'breakdown', span: 5, config: { table: 'ExpertWitnesses', title: 'By primary field', column: 'PrimaryField', limit: 8, display: 'chart', chartType: 'doughnut' } },
          { id: 'lg34', type: 'chart', span: 7, config: { table: 'ExpertWitnesses', title: 'Court experience by specialism', chartType: 'bar', dims: ['SecondaryField'], measures: ['CourtAppearances'], agg: 'sum', sortByValue: true, limit: 10 } },
          {
            id: 'lg35', type: 'livetable', span: 12,
            config: {
              title: 'Expert witness directory', table: 'ExpertWitnesses',
              columns: ['Name', 'PrimaryField', 'SecondaryField', 'CourtAppearances', 'Publications', 'WorkedForUs', 'DayRate'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D12', color: '#e9ecef' }],
            },
          },
          text('lg36', '', 'Experts are filed under a two-level taxonomy — a primary field with a specialism beneath it — so a search for “Engineering” still surfaces the materials-failure expert. That mirrors how Grist\'s own Expert Witness Database derives the primary field from the specialism. In your own document, attach each expert\'s CV to their record and it stays with them.'),
          accordion('lg37', 'Instructing an expert', [
            { q: 'How do we choose between two experts in the same field?', a: 'Court experience and publications are the usual tiebreak, alongside whether we have instructed them before — all three are columns above.' },
            { q: 'Are day rates negotiable?', a: 'Often, particularly for multi-day trials or where a report is agreed in advance. The rate shown is the standing rate we have on file.' },
            { q: 'Where are CVs kept?', a: 'Attached to the expert\'s own record, so the CV, contact details and prior instructions never drift apart into separate folders.' },
          ]),
        ],
      },
      {
        id: 'tab-firm', title: 'The Firm',
        hero: { title: 'The firm', subtitle: 'Who we act for and how we work.' },
        blocks: [
          { id: 'lg38', type: 'map', span: 12, config: { table: 'Clients', title: 'Where our clients are', subtitle: '%count clients mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'State', popupColumns: ['City', 'OpenMatters', 'TotalFees'] } },
          {
            id: 'lg39', type: 'livetable', span: 12,
            config: {
              title: 'Client directory', table: 'Clients',
              columns: ['Name', 'Contact', 'City', 'State', 'OpenMatters', 'TotalFees'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [],
            },
          },
          text('lg40', '', 'Client-facing detail only. Rates, matter notes and privileged material stay behind access rules in the underlying document — a firm can publish this page without publishing its file.'),
          spacer('lg40s', 10),
          iconBlock('lg41', 'shield', 'l', SLATE, '#ffffff', 'center', 3),
          iconBlock('lg42', 'users', 'l', GREY, '#ffffff', 'center', 3),
          iconBlock('lg43', 'layout', 'l', SLATE, '#ffffff', 'center', 3),
          iconBlock('lg44', 'star', 'l', GREY, '#ffffff', 'center', 3),
          counter('lg45', 'Matters handled', 0, 480, { suffix: '+' }, 3),
          counter('lg46', 'Years combined experience', 0, 65, { suffix: '+' }, 3),
          counter('lg47', 'Attorneys', 0, 7, {}, 3),
          counter('lg48', 'Client retention', 0, 96, { suffix: '%' }, 3),
          { id: 'lg49', type: 'timeline', span: 12, config: { title: 'Our history', items: [
            { date: '1998', title: 'Two attorneys, one practice area', description: 'The firm opened doing commercial litigation and very little else.' },
            { date: '2007', title: 'Corporate and real estate added', description: 'Transactional work joined the practice, smoothing the litigation cycle.' },
            { date: '2016', title: 'Intellectual property group', description: 'A dedicated IP team, and the first matters billed on contingency.' },
            { date: '2026', title: 'Open by default, internally', description: 'Matters, time and experts in one system the whole firm reads from — this page.' },
          ] } },
          { id: 'lg50', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          image('lg51', placeholderImage(SLATE, GREY), 'Law office conference room', 'Where matters begin', 6),
          testimonials('lg52', 'What our clients say', [
            { name: 'Robert Hale', quote: 'They explained everything in plain English and fought hard for us.', rating: 5, photoData: null },
            { name: 'Patricia Nguyen', quote: 'Responsive, thorough, and genuinely on our side throughout.', rating: 5, photoData: null },
          ], 6),
          {
            id: 'lg53', type: 'pricing', span: 12,
            config: {
              title: 'How we bill', plans: [
                { name: 'Hourly', price: '$310', period: '/hr from', features: ['Detailed time records', 'Monthly statements', 'Budget agreed up front'], highlighted: false, buttonLabel: 'Discuss a matter', buttonTarget: tabTarget('tab-overview') },
                { name: 'Fixed fee', price: 'Quoted', period: '', features: ['Agreed before we start', 'No surprises on the invoice', 'Best for defined transactions'], highlighted: true, buttonLabel: 'Request a quote', buttonTarget: tabTarget('tab-overview') },
                { name: 'Contingency', price: 'No win, no fee', period: '', features: ['We carry the risk', 'Percentage agreed in writing', 'Selected litigation only'], highlighted: false, buttonLabel: 'Check eligibility', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('lg54', 'Schedule a consultation', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('lg54s', 20),
          calcEmbed('lg55', {
            title: 'Fee estimate', resultLabel: 'Estimated fee',
            fields: [
              { key: 'hours', label: 'Estimated hours', value: 12 },
              { key: 'rate', label: 'Hourly rate', value: 420 },
              { key: 'disb', label: 'Disbursements', value: 500 },
            ],
            expr: 'v.hours * v.rate + v.disb', prefix: '$', decimals: 2,
            note: 'An estimate only, and not a quote. Recorded time on this page comes from the time-entry table.',
          }),
        ],
      },
    ],
  },
};

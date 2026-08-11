// Nonprofit template — one published mission dashboard.
// Researched against Grist's own nonprofit docs, which ship SEPARATELY: Grant Application Tracker
// (Applications with Status + Proposal_Deadline + Amount_Applied_For/Granted), Church Management
// (a constituent CRM with skills/ministries and a List_Visibility privacy flag), Donation Tracking
// (Amount/Method/Status/Receipt by year) and Event Sponsors + Registrations (Capacity_Limit,
// Ticket_Revenue, % Full). This widget publishes a website-style page, which is exactly what a
// nonprofit needs for donors, boards and funders — so those four are unified here over five real
// tables: Donations, Grants, Volunteers, Programs, Events.
//
// Past what the sources do: grant deadlines get a DRAGGABLE calendar and a win-rate (the tracker
// has deadlines but no calendar view and no requested-vs-awarded ratio), programs get
// budget-vs-actual, and event capacity gets visualised instead of just computed.
//
// PRIVACY: the source docs are internal and lean on Grist access rules. This page is public, so
// the sample donors are deliberately "Maria G." / "Anonymous" and the copy tells users to keep
// donor-level rows private and publish the aggregates.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, clockEmbed, placeholderImage,
} from './_helpers.js';

const GREEN = '#2f9e44';
const LIME = '#94d82d';

export const TEMPLATE = {
  id: 'nonprofits',
  name: 'Nonprofits',
  tagline: 'Donations, grants, volunteers and impact — one transparent view',
  config: {
    version: 1,
    theme: { paletteId: 'forest', fontId: 'humanist', mode: 'light' },
    dataTable: 'Donations',
    header: {
      logoData: null, title: 'Anupress Community', slogan: 'Making a measurable difference, together',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Fundraising', tab: 'tab-fundraising' },
        { label: 'Grants', tab: 'tab-grants' }, { label: 'Programs', tab: 'tab-programs' },
        { label: 'Get Involved', tab: 'tab-involved' },
      ],
    },
    footer: { text: '© 2026 Anupress Community. A registered nonprofit.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Programs', tab: 'tab-programs' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Making a measurable difference, together 🌱', subtitle: 'A live, transparent look at the donations, grants, volunteers and programs behind our mission.' },
        blocks: [
          { id: 'np1', type: 'stat', span: 3, config: { table: 'Donations', label: 'Raised', column: 'Received', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'np2', type: 'stat', span: 3, config: { table: 'Donations', label: 'Gifts received', column: 'Donor', agg: 'count', icon: 'users', format: { compact: true } } },
          { id: 'np3', type: 'stat', span: 3, config: { table: 'Volunteers', label: 'Volunteer hours', column: 'HoursLogged', agg: 'sum', icon: 'pulse', format: { compact: true } } },
          { id: 'np4', type: 'stat', span: 3, config: { table: 'Programs', label: 'People served', column: 'PeopleServed', agg: 'sum', icon: 'target', format: { compact: true } } },
          { id: 'np5', type: 'chart', span: 8, config: { table: 'Donations', title: 'Giving over time', chartType: 'area', dims: ['Date'], measures: ['Amount'], agg: 'sum', smooth: true } },
          { id: 'np6', type: 'breakdown', span: 4, config: { table: 'Donations', title: 'By campaign', column: 'Campaign', limit: 8, display: 'chart', chartType: 'doughnut' } },
          { id: 'np7', type: 'progress', span: 8, config: { title: 'Individual giving goal this year', mode: 'data', table: 'Donations', valueColumn: 'Received', agg: 'sum', target: 45000, prefix: '$', color: GREEN } },
          { id: 'np8', type: 'countdown', span: 4, config: { title: 'Winter Appeal closes', targetDate: new Date(Date.now() + 24 * 86400000).toISOString(), expiredText: 'Thank you — the appeal has closed!', color: GREEN } },
          text('np9', 'Where your donation goes', 'We publish our finances openly. This page reads directly from our own Grist records — the same numbers our board sees — so you always know exactly how donations are used before you give.'),
          accordion('np10', 'Frequently asked questions', [
            { q: 'Is my donation tax-deductible?', a: 'Yes — we\'re a registered 501(c)(3) nonprofit and every donor receives a receipt for tax purposes. Receipts sent are tracked against each gift in our records.' },
            { q: 'How much goes directly to programs?', a: 'See the Programs page: every program shows its budget alongside what has actually been spent, so you can judge for yourself rather than take our word for it.' },
            { q: 'How do you protect donor privacy?', a: 'Individual donors appear here only as initials or “Anonymous”. Donor-level records stay private inside our Grist document under access rules — only the totals are published.' },
            { q: 'Can I volunteer instead of donating?', a: 'Absolutely — the Get Involved page lists current roles, hours logged by the team, and our upcoming events.' },
          ]),
        ],
      },
      {
        id: 'tab-fundraising', title: 'Fundraising',
        hero: { title: 'Fundraising', subtitle: 'Every gift, how it arrived, and which appeal it came from.' },
        blocks: [
          { id: 'np11', type: 'stat', span: 3, config: { table: 'Donations', label: 'Received', column: 'Received', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'np12', type: 'stat', span: 3, config: { table: 'Donations', label: 'Pledged', column: 'Pledged', agg: 'sum', icon: 'trending', format: { compact: true, currency: '$' } } },
          { id: 'np13', type: 'stat', span: 3, config: { table: 'Donations', label: 'Average gift', column: 'Amount', agg: 'avg', icon: 'star', format: { currency: '$', decimals: 0 } } },
          { id: 'np14', type: 'stat', span: 3, config: { table: 'Events', label: 'Event revenue', column: 'TicketRevenue', agg: 'sum', icon: 'cart', format: { compact: true, currency: '$' } } },
          { id: 'np15', type: 'breakdown', span: 4, config: { table: 'Donations', title: 'How people give', column: 'Method', limit: 8 } },
          { id: 'np16', type: 'breakdown', span: 4, config: { table: 'Donations', title: 'One-time vs recurring', column: 'Type', limit: 4, display: 'chart', chartType: 'doughnut' } },
          { id: 'np17', type: 'breakdown', span: 4, config: { table: 'Donations', title: 'Gift status', column: 'Status', limit: 4 } },
          { id: 'np18', type: 'chart', span: 12, config: { table: 'Donations', title: 'Raised by campaign', chartType: 'bar', dims: ['Campaign'], measures: ['Amount'], agg: 'sum', sortByValue: true } },
          {
            id: 'np19', type: 'livetable', span: 12,
            config: {
              title: 'Recent gifts', table: 'Donations',
              columns: ['Donor', 'Date', 'Campaign', 'Method', 'Type', 'Amount'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'C1:C46', color: '#d3f9d8' }],
            },
          },
          text('np20', '', 'Donors appear here as initials or “Anonymous” on purpose. In your own document, keep the full donor table behind Grist access rules and publish only what you\'re comfortable sharing — this page reads whatever you allow.'),
        ],
      },
      {
        id: 'tab-grants', title: 'Grants',
        hero: { title: 'Grant pipeline', subtitle: 'What we\'ve applied for, what\'s been awarded, and what\'s due next.' },
        blocks: [
          { id: 'np21', type: 'stat', span: 3, config: { table: 'Grants', label: 'Applications', column: 'GrantName', agg: 'count', icon: 'layout', format: {} } },
          { id: 'np22', type: 'stat', span: 3, config: { table: 'Grants', label: 'Requested', column: 'AmountRequested', agg: 'sum', icon: 'trending', format: { compact: true, currency: '$' } } },
          { id: 'np23', type: 'stat', span: 3, config: { table: 'Grants', label: 'Awarded', column: 'AmountAwarded', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'np24', type: 'stat', span: 3, config: { table: 'Grants', label: 'Grants funded', column: 'Funded', agg: 'sum', icon: 'check', format: {} } },
          { id: 'np25', type: 'breakdown', span: 4, config: { table: 'Grants', title: 'Pipeline by stage', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'np26', type: 'chart', span: 8, config: { table: 'Grants', title: 'Requested vs awarded by program', chartType: 'column', dims: ['Program'], measures: ['AmountRequested', 'AmountAwarded'], agg: 'sum' } },
          {
            id: 'np27', type: 'calendar', span: 12,
            config: { title: 'Proposal deadlines', table: 'Grants', dateColumn: 'ProposalDeadline', titleColumn: 'GrantName', detailColumns: ['Foundation', 'AmountRequested', 'Status', 'Assignee'], colorBy: 'Status', draggable: true },
          },
          text('np28', '', 'Drag a proposal to a new day to move its deadline — on the published page that writes straight back to your Grants table, so the whole team sees the same dates. Grist\'s own grant tracker records deadlines but has no calendar to work them from.'),
          spacer('np28s', 10),
          {
            id: 'np29', type: 'livetable', span: 12,
            config: {
              title: 'Applications', table: 'Grants',
              columns: ['GrantName', 'Foundation', 'Program', 'Status', 'ProposalDeadline', 'AmountRequested', 'AmountAwarded'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'E1:E18', color: '#ffe3e3' }],
            },
          },
          text('np30', '', 'The highlighted column is <b>Proposal Deadline</b> — the fastest way to spot a submission about to slip.'),
        ],
      },
      {
        id: 'tab-programs', title: 'Programs',
        hero: { title: 'Programs & impact', subtitle: 'What we run, where we run it, and what it costs to deliver.' },
        blocks: [
          { id: 'np31', type: 'map', span: 12, config: { table: 'Programs', title: 'Communities we serve', subtitle: '%count programs mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Program', colorBy: 'Focus', popupColumns: ['Location', 'PeopleServed', 'Lead'] } },
          { id: 'np32', type: 'breakdown', span: 4, config: { table: 'Programs', title: 'Programs by focus', column: 'Focus', limit: 8 } },
          { id: 'np33', type: 'chart', span: 8, config: { table: 'Programs', title: 'People served by program', chartType: 'bar', dims: ['Program'], measures: ['PeopleServed'], agg: 'sum', sortByValue: true } },
          { id: 'np34', type: 'chart', span: 12, config: { table: 'Programs', title: 'Budget vs spent by program', chartType: 'column', dims: ['Program'], measures: ['Budget', 'Spent'], agg: 'sum' } },
          { id: 'np35', type: 'progress', span: 12, config: { title: 'Program budget used this year', mode: 'data', table: 'Programs', valueColumn: 'Spent', agg: 'sum', target: 250000, prefix: '$', color: GREEN } },
          {
            id: 'np36', type: 'livetable', span: 12,
            config: {
              title: 'Program register', table: 'Programs',
              columns: ['Program', 'Focus', 'Location', 'Lead', 'PeopleServed', 'Budget', 'Spent'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D6', color: '#d3f9d8' }],
            },
          },
          { id: 'np37', type: 'timeline', span: 12, config: { title: 'How we grew', items: [
            { date: '2011', title: 'Founded around one kitchen table', description: 'A single after-school reading group, run entirely by volunteers.' },
            { date: '2016', title: 'First multi-year grant', description: 'Funding that let us hire our first two full-time program staff.' },
            { date: '2021', title: 'Five programs, four neighbourhoods', description: 'Food security and housing support joined the original literacy work.' },
            { date: '2026', title: 'Open by default', description: 'We publish our numbers live from the same records the board reviews — this page.' },
          ] } },
        ],
      },
      {
        id: 'tab-involved', title: 'Get Involved',
        hero: { title: 'Ways to help', subtitle: 'Every hour and every dollar reaches someone.' },
        blocks: [
          { id: 'np38', type: 'stat', span: 3, config: { table: 'Volunteers', label: 'Volunteers', column: 'Name', agg: 'count', icon: 'users', format: {} } },
          { id: 'np39', type: 'stat', span: 3, config: { table: 'Volunteers', label: 'Hours logged', column: 'HoursLogged', agg: 'sum', icon: 'pulse', format: { compact: true } } },
          counter('np40', 'Communities reached', 0, 6, {}, 3),
          counter('np41', 'Years of service', 0, 15, {}, 3),
          { id: 'np42', type: 'chart', span: 6, config: { table: 'Volunteers', title: 'Hours by role', chartType: 'bar', dims: ['Role'], measures: ['HoursLogged'], agg: 'sum', sortByValue: true } },
          { id: 'np43', type: 'breakdown', span: 6, config: { table: 'Volunteers', title: 'Volunteer status', column: 'Status', limit: 4, display: 'chart', chartType: 'doughnut' } },
          {
            id: 'np44', type: 'livetable', span: 12,
            config: {
              title: 'Volunteer roster', table: 'Volunteers',
              columns: ['Name', 'Role', 'Program', 'Status', 'HoursLogged', 'BackgroundCheck'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F16', color: '#e7f5ff' }],
            },
          },
          text('np45', '', 'Volunteer applications, hours and background-check status live in one table — the same shape Grist\'s own volunteer guidance recommends, published here so coordinators and the board see one roster.'),
          spacer('np45s', 10),
          { id: 'np46', type: 'chart', span: 8, config: { table: 'Events', title: 'Event capacity vs registrations', chartType: 'column', dims: ['Event'], measures: ['Capacity', 'Registered'], agg: 'sum' } },
          {
            id: 'np47', type: 'qrcode', span: 4,
            config: { text: 'https://anupress.com/advanced-charts-grist-widget-guide/', level: 'M', fg: '#1b4332', bg: '#ffffff', size: 180, caption: 'Scan to sign up as a volunteer' },
          },
          {
            id: 'np48', type: 'livetable', span: 12,
            config: {
              title: 'Upcoming events', table: 'Events',
              columns: ['Event', 'Date', 'Location', 'Coordinator', 'Registered', 'Capacity', 'PercentFull'],
              pageSize: 6, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F6', color: '#fff3b0' }],
            },
          },
          { id: 'np49', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          image('np50', placeholderImage(GREEN, LIME), 'Volunteers at a community event', 'Our volunteers at last spring\'s food drive', 6),
          testimonials('np51', 'From our community', [
            { name: 'Maria Gomez', quote: 'This program helped my family get back on our feet — I\'m forever grateful.', rating: 5, photoData: null },
            { name: 'James Whitfield', quote: 'I\'ve volunteered for years — I\'ve never seen an organization this transparent.', rating: 5, photoData: null },
          ], 6),
          iconBlock('np52', 'users', 'l', GREEN, '#ffffff', 'center', 3),
          iconBlock('np53', 'globe', 'l', LIME, '#ffffff', 'center', 3),
          iconBlock('np54', 'star', 'l', GREEN, '#ffffff', 'center', 3),
          iconBlock('np55', 'target', 'l', LIME, '#ffffff', 'center', 3),
          {
            id: 'np56', type: 'pricing', span: 12,
            config: {
              title: 'Ways to give', plans: [
                { name: 'Supporter', price: '$10', period: '/mo', features: ['Feeds a family for a week', 'Monthly impact email', 'Named on our supporters wall'], highlighted: false, buttonLabel: 'Give monthly', buttonTarget: tabTarget('tab-overview') },
                { name: 'Champion', price: '$50', period: '/mo', features: ['Funds a child\'s tutoring for a month', 'Everything in Supporter', 'Invitation to our annual gala'], highlighted: true, buttonLabel: 'Become a champion', buttonTarget: tabTarget('tab-overview') },
                { name: 'Partner', price: 'Custom', period: '', features: ['Corporate & foundation giving', 'Named program sponsorship', 'Quarterly impact reporting'], highlighted: false, buttonLabel: 'Talk to us', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('np57', 'Donate now', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('np57s', 20),
          clockEmbed('np58', 'Local time'),
        ],
      },
    ],
  },
};

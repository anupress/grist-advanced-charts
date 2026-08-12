// Developers template — an engineering cockpit across the whole delivery lifecycle.
// Researched against Grist's developer positioning (REST API, webhooks, custom widgets in
// HTML/CSS/JS — this widget IS one — Python formulas, self-hosting, data as plain SQLite) and its
// real engineering templates, which ship as separate INTERNAL docs: Requirements Traceability
// (ARS requirements ↔ Verifications with pass criteria ↔ Validation, plus Risks and
// Non_compliance), Test Data Logger (Devices/Test_Setups/Test_Runs/Measurements) and Project
// Management (Projects/All_Tasks). None of them is publishable.
//
// This widget publishes, so the win is one live page a team can actually share with users and
// stakeholders — build → test → ship → run → measure — over five real tables: Issues, TestRuns,
// Releases, Incidents, Services. Past what the sources do: a DRAGGABLE release calendar that
// writes dates back to Grist, incident MTTR, a pass-rate trend, and a per-region services map.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, calcEmbed, placeholderImage,
} from './_helpers.js';

const INDIGO = '#7c83ff';
const CYAN = '#22d3ee';

export const TEMPLATE = {
  id: 'developers',
  name: 'Developers',
  tagline: 'Issues, releases, incidents and uptime — dark by default',
  config: {
    version: 1,
    theme: { paletteId: 'midnight', fontId: 'mono', mode: 'auto' },
    dataTable: 'Issues',
    header: {
      logoData: null, title: 'Anupress Dev', slogan: 'APIs and tools developers actually enjoy',
      menu: [
        { label: 'Status', tab: 'tab-overview' }, { label: 'Services', tab: 'tab-services' },
        { label: 'Issues', tab: 'tab-issues' }, { label: 'Releases', tab: 'tab-releases' },
        { label: 'Quality', tab: 'tab-quality' },
      ],
    },
    footer: { text: '© 2026 Anupress Dev.', links: [{ label: 'Status', tab: 'tab-overview' }, { label: 'Releases', tab: 'tab-releases' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Status',
        hero: { title: 'Built for developers, not decks', subtitle: 'Live uptime, traffic, open work and incidents — the same numbers our on-call engineers watch.' },
        blocks: [
          { id: 'dv1', type: 'stat', span: 3, config: { table: 'Services', label: 'Avg. uptime', column: 'Uptime', agg: 'avg', icon: 'pulse', format: { decimals: 2 } } },
          { id: 'dv2', type: 'stat', span: 3, config: { table: 'Services', label: 'Requests / day', column: 'RequestsPerDay', agg: 'sum', icon: 'code', format: { compact: true } } },
          { id: 'dv3', type: 'stat', span: 3, config: { table: 'Issues', label: 'Open issues', column: 'IsOpen', agg: 'sum', icon: 'target', format: {} } },
          { id: 'dv4', type: 'stat', span: 3, config: { table: 'Incidents', label: 'Avg. downtime (min)', column: 'DowntimeMinutes', agg: 'avg', icon: 'shield', format: { decimals: 0 } } },
          { id: 'dv5', type: 'chart', span: 8, config: { table: 'Services', title: 'Traffic by service', chartType: 'bar', dims: ['Service'], measures: ['RequestsPerDay'], agg: 'sum', sortByValue: true } },
          { id: 'dv6', type: 'breakdown', span: 4, config: { table: 'Incidents', title: 'Incidents by severity', column: 'Severity', limit: 4, display: 'chart', chartType: 'doughnut' } },
          // Error budget, not "uptime vs SLA": a bar comparing 99.75% to a 99.95% target renders as
          // ~100% full and tells you nothing. Minutes of downtime against the budget actually moves.
          { id: 'dv7', type: 'progress', span: 8, config: { title: 'Error budget used (900 min allowance)', mode: 'data', table: 'Incidents', valueColumn: 'DowntimeMinutes', agg: 'sum', target: 900, suffix: 'min', color: INDIGO } },
          { id: 'dv8', type: 'countdown', span: 4, config: { title: 'Next release window', targetDate: new Date(Date.now() + 9 * 86400000).toISOString(), expiredText: 'Shipping now — watch the status page.', color: INDIGO } },
          text('dv9', 'Status, not marketing', 'This page reads straight from our own tables — issues, releases, incidents, services and test runs. No spin, just numbers. Click <b>Edit</b> to point it at your own Grist document.'),
          accordion('dv10', 'Frequently asked questions', [
            { q: 'What are the rate limits?', a: 'Free tier is capped per minute per key; paid tiers scale with usage. Every response carries the remaining budget in its rate-limit headers.' },
            { q: 'How does authentication work?', a: 'Bearer tokens over HTTPS — generate a key from your dashboard. No OAuth dance required for server-to-server calls.' },
            { q: 'Can we self-host?', a: 'Yes. Everything runs from a single container and your data stays in plain SQLite files you can back up, diff and move whenever you like.' },
            { q: 'Where do I report an issue?', a: 'Open an issue on our GitHub repo — the Issues page here is the same backlog, published live.' },
          ]),
        ],
      },
      {
        id: 'tab-services', title: 'Services',
        hero: { title: 'Services & regions', subtitle: 'What runs where, how fast it responds, and who owns it.' },
        blocks: [
          { id: 'dv11', type: 'map', span: 12, config: { table: 'Services', title: 'Where our services run', subtitle: '%count services mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Service', colorBy: 'Region', popupColumns: ['Region', 'Owner', 'Uptime'] } },
          { id: 'dv12', type: 'chart', span: 6, config: { table: 'Services', title: 'p95 latency by service', chartType: 'bar', dims: ['Service'], measures: ['P95Latency'], agg: 'avg', sortByValue: true } },
          { id: 'dv13', type: 'chart', span: 6, config: { table: 'Services', title: 'Error rate by service', chartType: 'column', dims: ['Service'], measures: ['ErrorRate'], agg: 'avg', sortByValue: true } },
          {
            id: 'dv14', type: 'livetable', span: 12,
            config: {
              title: 'Service register', table: 'Services',
              columns: ['Service', 'Owner', 'Region', 'Uptime', 'P95Latency', 'ErrorRate', 'RequestsPerDay'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D8', color: '#1f3a5f' }],
            },
          },
          text('dv15', '', 'The highlighted column is <b>Uptime %</b> — the number that decides whether we owe anyone an apology this month.'),
          spacer('dv15s', 10),
          {
            id: 'dv16', type: 'livetable', span: 12,
            config: {
              title: 'Incident log', table: 'Incidents',
              columns: ['IncidentID', 'Service', 'Severity', 'StartedAt', 'DowntimeMinutes', 'Status', 'Summary'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'C1:C14', color: '#4a2230' }],
            },
          },
          { id: 'dv17', type: 'chart', span: 12, config: { table: 'Incidents', title: 'Downtime by service', chartType: 'column', dims: ['Service'], measures: ['DowntimeMinutes'], agg: 'sum', sortByValue: true } },
        ],
      },
      {
        id: 'tab-issues', title: 'Issues',
        hero: { title: 'The backlog, in the open', subtitle: 'Everything we know about, ranked the way we actually work on it.' },
        blocks: [
          { id: 'dv18', type: 'stat', span: 3, config: { table: 'Issues', label: 'Open', column: 'IsOpen', agg: 'sum', icon: 'target', format: {} } },
          { id: 'dv19', type: 'stat', span: 3, config: { table: 'Issues', label: 'Open bugs', column: 'IsBug', agg: 'sum', icon: 'shield', format: {} } },
          { id: 'dv20', type: 'stat', span: 3, config: { table: 'Issues', label: 'Story points', column: 'Points', agg: 'sum', icon: 'trending', format: {} } },
          { id: 'dv21', type: 'stat', span: 3, config: { table: 'Issues', label: 'Tracked', column: 'Key', agg: 'count', icon: 'database', format: {} } },
          { id: 'dv22', type: 'breakdown', span: 4, config: { table: 'Issues', title: 'By status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'dv23', type: 'breakdown', span: 4, config: { table: 'Issues', title: 'By priority', column: 'Priority', limit: 6 } },
          { id: 'dv24', type: 'breakdown', span: 4, config: { table: 'Issues', title: 'By type', column: 'Type', limit: 6 } },
          { id: 'dv25', type: 'chart', span: 12, config: { table: 'Issues', title: 'Open work by component', chartType: 'column', dims: ['Component'], measures: ['IsOpen'], agg: 'sum', sortByValue: true } },
          {
            id: 'dv26', type: 'livetable', span: 12,
            config: {
              title: 'Issue tracker', table: 'Issues',
              columns: ['Key', 'Title', 'Type', 'Priority', 'Status', 'Component', 'Assignee'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D44', color: '#4a2230' }],
            },
          },
          text('dv27', '', 'Priority is highlighted so P0s never hide in the middle of a list. This is the same table our engineers work from — published, not exported.'),
        ],
      },
      {
        id: 'tab-releases', title: 'Releases',
        hero: { title: 'Ship schedule', subtitle: 'What shipped, what is in QA, and what is going out next.' },
        blocks: [
          {
            id: 'dv28', type: 'calendar', span: 12,
            config: { title: 'Release calendar', table: 'Releases', dateColumn: 'ReleaseDate', titleColumn: 'Version', detailColumns: ['Status', 'Owner', 'IssuesShipped', 'Notes'], colorBy: 'Status', draggable: true },
          },
          text('dv29', '', 'Drag a release to a new day to move the ship date — on the published page that writes straight back to your Releases table, so the schedule everyone reads is the schedule of record.'),
          spacer('dv29s', 10),
          { id: 'dv30', type: 'breakdown', span: 4, config: { table: 'Releases', title: 'By status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'dv31', type: 'chart', span: 8, config: { table: 'Releases', title: 'Issues shipped per release', chartType: 'column', dims: ['Version'], measures: ['IssuesShipped'], agg: 'sum' } },
          {
            id: 'dv32', type: 'livetable', span: 12,
            config: {
              title: 'Release log', table: 'Releases',
              columns: ['Version', 'ReleaseDate', 'Status', 'Owner', 'IssuesShipped', 'Notes'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'C1:C11', color: '#1f3a5f' }],
            },
          },
          { id: 'dv33', type: 'timeline', span: 12, config: { title: 'How the API got here', items: [
            { date: 'v1.0', title: 'First public API', description: 'Read-only records endpoint, a single API key, and a lot of optimism.' },
            { date: 'v1.6', title: 'Writes and webhooks', description: 'Create/update endpoints plus outbound webhooks with retries.' },
            { date: 'v2.0', title: 'Scoped tokens & rate-limit headers', description: 'Per-key scopes and a documented budget on every response.' },
            { date: 'v2.8', title: 'Cursor pagination', description: 'Stable cursors so large exports stop drifting mid-page — this quarter.' },
          ] } },
        ],
      },
      {
        id: 'tab-quality', title: 'Quality',
        hero: { title: 'Tests & quality', subtitle: 'What we run before anything reaches you.' },
        blocks: [
          { id: 'dv34', type: 'stat', span: 3, config: { table: 'TestRuns', label: 'Avg. pass rate', column: 'PassRate', agg: 'avg', icon: 'check', format: { percent: true, decimals: 1 } } },
          { id: 'dv35', type: 'stat', span: 3, config: { table: 'TestRuns', label: 'Avg. coverage', column: 'Coverage', agg: 'avg', icon: 'shield', format: { decimals: 1 } } },
          { id: 'dv36', type: 'stat', span: 3, config: { table: 'TestRuns', label: 'Tests run', column: 'Total', agg: 'sum', icon: 'database', format: { compact: true } } },
          { id: 'dv37', type: 'stat', span: 3, config: { table: 'TestRuns', label: 'Failures', column: 'Failed', agg: 'sum', icon: 'target', format: {} } },
          { id: 'dv38', type: 'progress', span: 8, config: { title: 'Test pass rate', mode: 'data', table: 'TestRuns', valueColumn: 'PassRate', agg: 'avg', target: 100, suffix: '%', color: CYAN } },
          { id: 'dv39', type: 'breakdown', span: 4, config: { table: 'TestRuns', title: 'Runs by platform', column: 'Platform', limit: 4 } },
          { id: 'dv40', type: 'chart', span: 6, config: { table: 'TestRuns', title: 'Pass rate over time', chartType: 'line', dims: ['RunDate'], measures: ['PassRate'], agg: 'avg', smooth: true } },
          { id: 'dv41', type: 'chart', span: 6, config: { table: 'TestRuns', title: 'Passed vs failed by suite', chartType: 'column', dims: ['Suite'], measures: ['Passed', 'Failed'], agg: 'sum', stacked: true } },
          {
            id: 'dv42', type: 'livetable', span: 12,
            config: {
              title: 'Recent test runs', table: 'TestRuns',
              columns: ['Suite', 'RunDate', 'Platform', 'Total', 'Failed', 'PassRate', 'Coverage'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'D1:D30', color: '#4a2230' }],
            },
          },
          accordion('dv43', 'How we verify what we build', [
            { q: 'Do requirements trace to tests?', a: 'Yes — every requirement links to the verifications that prove it and the validation that accepts it, so nothing ships unverified. That traceability model is exactly what Grist\'s own Requirements Traceability template encodes.' },
            { q: 'What runs on every commit?', a: 'Unit and contract suites on every push; integration, end-to-end and load suites on the release branch. Each run lands in the table above.' },
            { q: 'What happens when a suite fails?', a: 'The release moves to “In QA” and stays there. You can see that on the Releases page — we don\'t quietly ship past a red build.' },
          ]),
          spacer('dv43s', 10),
          image('dv44', placeholderImage(INDIGO, CYAN), 'Engineers reviewing a dashboard', 'Release review, every Thursday', 6),
          testimonials('dv45', 'What developers say', [
            { name: 'Priya Natarajan, Staff Eng.', quote: 'Best-documented API we\'ve integrated in years — shipped in an afternoon.', rating: 5, photoData: null },
            { name: 'Tom Reilly, Indie Dev', quote: 'Rate limits are generous and the errors actually tell you what\'s wrong.', rating: 5, photoData: null },
          ], 6),
          iconBlock('dv46', 'code', 'l', INDIGO, '#ffffff', 'center', 3),
          iconBlock('dv47', 'database', 'l', CYAN, '#ffffff', 'center', 3),
          iconBlock('dv48', 'globe', 'l', INDIGO, '#ffffff', 'center', 3),
          iconBlock('dv49', 'shield', 'l', CYAN, '#ffffff', 'center', 3),
          counter('dv50', 'Developers building with us', 0, 54000, { suffix: '+' }, 3),
          counter('dv51', 'GitHub stars', 0, 9200, { suffix: '+' }, 3),
          counter('dv52', 'Countries', 0, 61, {}, 3),
          counter('dv53', 'Years in production', 0, 7, {}, 3),
          { id: 'dv54', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          {
            id: 'dv55', type: 'qrcode', span: 4,
            config: { text: 'https://anupress.com/advanced-charts-grist-widget-guide/', level: 'M', fg: '#0b1020', bg: '#ffffff', size: 180, caption: 'Scan for the API quickstart' },
          },
          {
            id: 'dv56', type: 'pricing', span: 8,
            config: {
              title: 'API plans', plans: [
                { name: 'Free', price: '$0', period: '/mo', features: ['10k requests/day', 'Community support', 'All endpoints'], highlighted: false, buttonLabel: 'Get a key', buttonTarget: tabTarget('tab-overview') },
                { name: 'Team', price: '$99', period: '/mo', features: ['2M requests/day', 'Webhooks & scoped tokens', '99.95% SLA'], highlighted: true, buttonLabel: 'Start building', buttonTarget: tabTarget('tab-overview') },
                { name: 'Self-hosted', price: 'Custom', period: '', features: ['Run it on your own infra', 'Plain SQLite data files', 'Priority support'], highlighted: false, buttonLabel: 'Talk to us', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('dv57', 'Read the docs', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('dv57s', 20),
          calcEmbed('dv58', {
            title: 'Error budget calculator', resultLabel: 'Downtime allowed',
            fields: [
              { key: 'slo', label: 'Uptime target (%)', value: 99.9 },
              { key: 'days', label: 'Window (days)', value: 30 },
            ],
            expr: '(100 - v.slo) / 100 * v.days * 24 * 60', suffix: ' min', decimals: 1,
            note: 'How many minutes you may be down before the SLO is breached. Three nines over 30 days is only about 43 minutes.',
          }),
        ],
      },
    ],
  },
};

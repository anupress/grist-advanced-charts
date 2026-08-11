// Research Labs template — rebuilt against real structure, not a generic placeholder table.
// Modeled directly on Grist's own three official lab templates (Sample Management, Project
// Management, Inventory Management) plus a real case study (Jozef Stefan Institute, Advanced
// Materials Dept): a lab's data genuinely spans four distinct tables — Samples (an intake→
// analysis→export pipeline), a Reagent inventory (a Purchase/Use transaction ledger, not a
// static stock count), Tasks (assigned, due-dated, calendar-worthy), and People. Every block
// below references one of those four tables by name; data/templates/sample-data.js's
// research-labs entry provides matching demo rows, and adaptTemplateToTable() (data/provider.js)
// only ever repoints a block's table when a table by that exact name genuinely exists on the
// target provider, leaving everything else intact rather than collapsing onto an unrelated table
// — see that function's comment for why.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'research-labs',
  name: 'Research Labs',
  tagline: 'Samples, reagents, tasks and people — one live dashboard',
  config: {
    version: 1,
    theme: { paletteId: 'ocean', fontId: 'humanist', mode: 'light' },
    dataTable: 'Samples',
    header: {
      logoData: null, title: 'Anupress Lab', slogan: 'Advancing science, one study at a time',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Samples', tab: 'tab-samples' },
        { label: 'Projects & Team', tab: 'tab-projects' }, { label: 'Equipment', tab: 'tab-equipment' },
        { label: 'Inventory', tab: 'tab-inventory' },
      ],
    },
    footer: { text: '© 2026 Anupress Lab.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Samples', tab: 'tab-samples' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Advancing science, one study at a time 🔬', subtitle: 'Samples, reagents, tasks and people — pulled live from the same tables your lab already runs on.' },
        blocks: [
          { id: 'rl1', type: 'stat', span: 3, config: { table: 'Samples', label: 'Samples logged', column: 'SampleID', agg: 'count', icon: 'database', format: { compact: true } } },
          { id: 'rl2', type: 'stat', span: 3, config: { table: 'Samples', label: 'Avg. turnaround (hrs)', column: 'TurnaroundHours', agg: 'avg', icon: 'pulse', format: { decimals: 1 } } },
          { id: 'rl3', type: 'stat', span: 3, config: { table: 'Tasks', label: 'Open tasks', column: 'Task', agg: 'count', icon: 'target', format: { compact: true } } },
          { id: 'rl4', type: 'stat', span: 3, config: { table: 'Reagents', label: 'Reagent transactions', column: 'Item', agg: 'count', icon: 'coins', format: { compact: true } } },
          { id: 'rl5', type: 'breakdown', span: 4, config: { table: 'Samples', title: 'Samples by type', column: 'SampleType', limit: 12, display: 'chart', chartType: 'doughnut' } },
          { id: 'rl6', type: 'chart', span: 4, config: { table: 'Samples', title: 'Samples by staff', chartType: 'column', dims: ['Staff'], measures: ['SampleID'], agg: 'count', sortByValue: true } },
          { id: 'rl7', type: 'chart', span: 4, config: { table: 'Samples', title: 'Samples by storage location', chartType: 'bar', dims: ['StorageLocation'], measures: ['SampleID'], agg: 'count', sortByValue: true } },
          spacer('rl7s', 10),
          { id: 'rl8', type: 'progress', span: 8, config: { title: 'Turnaround SLA (target: under 48 hours)', mode: 'data', table: 'Samples', valueColumn: 'TurnaroundHours', agg: 'avg', target: 48, suffix: 'hrs', color: '#1c7ed6' } },
          { id: 'rl8c', type: 'countdown', span: 4, config: { title: 'Next grant deadline', targetDate: new Date(Date.now() + 18 * 86400000).toISOString(), expiredText: 'Submitted — results pending.', color: '#1c7ed6' } },
          text('rl9', 'About this dashboard', 'This page reads straight from four tables your lab already keeps: Samples, a Reagents inventory ledger, Tasks and People. Click <b>Edit</b> to connect your own Grist document — every card here reconfigures to your columns in a couple of clicks.'),
          accordion('rl10', 'Frequently asked questions', [
            { q: 'How is participant data protected?', a: 'All identifiable data stays inside your own Grist document — this dashboard reads it directly in your browser and never sends it to a third-party server.' },
            { q: 'Can I drag a task to a new due date on the calendar?', a: 'Yes — see the Projects & Team page. Dragging an event writes the new date straight back to your Tasks table, and the calendar picks up anything changed directly in Grist within about 15 seconds.' },
            { q: 'How often is this updated?', a: 'As soon as a record changes in the underlying table, republishing this page reflects it immediately — the calendar and any live tables also refresh on their own while the page is open.' },
          ]),
        ],
      },
      {
        id: 'tab-samples', title: 'Samples',
        hero: { title: 'Sample tracking', subtitle: 'Every sample from intake through analysis to export, in one pipeline.' },
        blocks: [
          {
            id: 'rl11', type: 'livetable', span: 12,
            config: {
              title: 'Recent samples', table: 'Samples',
              columns: ['SampleID', 'SampleType', 'Source', 'Staff', 'StorageLocation', 'ReceivedAt', 'TurnaroundHours'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G8', color: '#ffe3e3' }],
            },
          },
          text('rl11n', '', 'The highlighted column above is <b>Turnaround (hrs)</b> — the same cell-highlighting available on any Data Table block, here flagging the samples worth a second look.'),
          { id: 'rl12', type: 'map', span: 12, config: { table: 'Samples', title: 'Where samples are collected', subtitle: '%count mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Source', colorBy: 'SampleType' } },
          spacer('rl12s', 10),
          image('rl13', placeholderImage('#1c7ed6', '#22b8cf'), 'Lab bench with sample tubes and equipment', 'Our main wet-lab intake bench', 6),
          { id: 'rl14', type: 'timeline', span: 6, config: { title: 'From paper to digital', items: [
            { date: '2019', title: 'Paper log books', description: 'Every sample hand-recorded, retyped into a spreadsheet at the end of the week.' },
            { date: '2022', title: 'First shared spreadsheet', description: 'One shared file — faster, but no relational structure, so storage locations and staff drifted out of sync.' },
            { date: '2024', title: 'Digitized on Grist', description: 'Samples, reagents and tasks moved onto relational tables — turnaround time is now computed automatically, not tallied by hand.' },
            { date: '2026', title: 'This dashboard', description: 'A live, published view of the same tables, safe to share with collaborators.' },
          ] } },
        ],
      },
      {
        id: 'tab-projects', title: 'Projects & Team',
        hero: { title: 'Projects, tasks and the people running them', subtitle: 'A calendar of due dates that stays in sync with your Tasks table both ways.' },
        blocks: [
          { id: 'rl15', type: 'calendar', span: 12, config: { title: 'Task calendar', table: 'Tasks', dateColumn: 'DueDate', titleColumn: 'Task', detailColumns: ['AssignedTo', 'Priority', 'Status', 'Outcome'], colorBy: 'Priority', draggable: true } },
          text('rl15n', '', 'Drag a task to a new day to reschedule it — on the published page, that writes the new date straight back to your Tasks table. Try it above (in demo mode, it edits this preview\'s own copy of the data).'),
          spacer('rl15s', 10),
          iconBlock('rl16', 'target', 'l', '#1c7ed6', '#ffffff', 'center', 3),
          iconBlock('rl17', 'database', 'l', '#22b8cf', '#ffffff', 'center', 3),
          iconBlock('rl18', 'users', 'l', '#1c7ed6', '#ffffff', 'center', 3),
          iconBlock('rl19', 'globe', 'l', '#22b8cf', '#ffffff', 'center', 3),
          counter('rl20', 'Team members', 0, 7, {}, 3),
          counter('rl21', 'Active projects', 0, 5, {}, 3),
          counter('rl22', 'Tasks this quarter', 0, 24, {}, 3),
          counter('rl23', 'Avg. days to close a task', 0, 6, {}, 3),
          spacer('rl23s', 10),
          {
            id: 'rl24', type: 'livetable', span: 12,
            config: { title: 'Team directory', table: 'People', columns: ['Name', 'Title', 'Email'], pageSize: 8, searchable: true, sortable: true, defaultSort: null, highlights: [] },
          },
          button('rl25', 'Contact our research office', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
        ],
      },
      {
        id: 'tab-equipment', title: 'Equipment',
        hero: { title: 'Instruments & calibration', subtitle: 'Every instrument, who owns it, and when it is next due for calibration — before an audit asks.' },
        blocks: [
          { id: 'rl50', type: 'stat', span: 3, config: { table: 'Instruments', label: 'Instruments tracked', column: 'InstrumentID', agg: 'count', icon: 'sliders', format: {} } },
          { id: 'rl51', type: 'stat', span: 3, config: { table: 'Instruments', label: 'Due within 30 days', column: 'CalibrationDue', agg: 'sum', icon: 'calendar', format: {} } },
          { id: 'rl52', type: 'stat', span: 3, config: { table: 'Instruments', label: 'In compliance', column: 'Compliant', agg: 'sum', icon: 'shield', format: {} } },
          { id: 'rl53', type: 'stat', span: 3, config: { table: 'Instruments', label: 'Instrument hours', column: 'UtilisationHours', agg: 'sum', icon: 'pulse', format: { compact: true } } },
          { id: 'rl54', type: 'progress', span: 8, config: { title: 'Calibration compliance', mode: 'data', table: 'Instruments', valueColumn: 'Compliant', agg: 'sum', target: 14, suffix: ' instruments', color: '#1c7ed6' } },
          { id: 'rl55', type: 'breakdown', span: 4, config: { table: 'Instruments', title: 'By status', column: 'Status', limit: 6, display: 'chart', chartType: 'doughnut' } },
          {
            id: 'rl56', type: 'calendar', span: 12,
            config: { title: 'Calibration schedule', table: 'Instruments', dateColumn: 'NextCalibration', titleColumn: 'Name', detailColumns: ['InstrumentID', 'Location', 'ResponsibleStaff', 'Status'], colorBy: 'Status', draggable: true },
          },
          text('rl57', '', 'Drag an instrument to a new day to move its calibration date — on the published page that writes straight back to your Instruments table, so the schedule stays true both ways.'),
          spacer('rl57s', 10),
          {
            id: 'rl58', type: 'livetable', span: 12,
            config: {
              title: 'Instrument register', table: 'Instruments',
              columns: ['InstrumentID', 'Name', 'Location', 'ResponsibleStaff', 'Status', 'NextCalibration'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F14', color: '#ffe3e3' }],
            },
          },
          text('rl59', '', 'The highlighted column is <b>Next Calibration</b> — the quickest way to spot an instrument about to fall out of certification.'),
          { id: 'rl60', type: 'chart', span: 6, config: { table: 'Instruments', title: 'Instruments by location', chartType: 'column', dims: ['Location'], measures: ['InstrumentID'], agg: 'count', sortByValue: true } },
          { id: 'rl61', type: 'chart', span: 6, config: { table: 'Instruments', title: 'Hours logged by instrument', chartType: 'bar', dims: ['Name'], measures: ['UtilisationHours'], agg: 'sum', sortByValue: true, limit: 8 } },
          accordion('rl62', 'Maintenance & calibration SOPs', [
            { q: 'How often is each instrument calibrated?', a: 'Annually by default, and immediately after any repair or relocation. The Next Calibration column drives both the calendar above and the compliance bar.' },
            { q: 'What happens when an instrument goes out for repair?', a: 'Set its status to “Out for repair” — it drops out of the in-service count, and any samples queued on it get reassigned by the lab manager.' },
            { q: 'Who signs off a calibration?', a: 'The responsible staff member listed against the instrument, countersigned by the Lab Manager. Certificates are attached to the instrument record in Grist.' },
          ]),
        ],
      },
      {
        id: 'tab-inventory', title: 'Inventory',
        hero: { title: 'Reagents & supplies', subtitle: 'A running ledger, not a guess — every purchase and use, with the current balance computed automatically.' },
        blocks: [
          {
            id: 'rl26', type: 'livetable', span: 12,
            config: {
              title: 'Reagent activity', table: 'Reagents',
              columns: ['Category', 'Item', 'TransactionType', 'Quantity', 'RunningQuantity', 'StorageLocation', 'Supplier'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'E1:E20', color: '#fff3b0' }],
            },
          },
          text('rl26n', '', 'Column E, <b>Running Quantity</b>, is highlighted the same way — a quick way to eyeball anything close to running out.'),
          { id: 'rl27', type: 'breakdown', span: 5, config: { table: 'Reagents', title: 'Reagent categories', column: 'Category', limit: 12 } },
          {
            id: 'rl28', type: 'qrcode', span: 3,
            config: { text: 'https://anupress.com/lab/reagent/TT-001', level: 'M', fg: '#0b3d5c', bg: '#ffffff', size: 180, caption: 'Every reagent gets a label like this for instant mobile lookup' },
          },
          { id: 'rl28b', type: 'divider', span: 4, config: { style: 'solid', thickness: 1, color: null } },
          testimonials('rl29', 'What our collaborators say', [
            { name: 'Elena Ruiz, PhD', quote: 'The clearest, fastest-moving research partnership we\'ve had.', rating: 5, photoData: null },
            { name: 'Sam Okafor, PhD', quote: 'Their data practices make joint studies painless — I can see sample status without emailing anyone.', rating: 5, photoData: null },
          ]),
          {
            id: 'rl30', type: 'pricing', span: 12,
            config: {
              title: 'Core facility service rates', plans: [
                { name: 'Academic', price: '$45', period: '/sample', features: ['Standard turnaround (48 hrs)', 'Shared instrument queue', 'Digital results only'], highlighted: false, buttonLabel: 'Request access', buttonTarget: tabTarget('tab-overview') },
                { name: 'Priority', price: '$85', period: '/sample', features: ['Everything in Academic', 'Under 24-hour turnaround', 'Dedicated staff time'], highlighted: true, buttonLabel: 'Request access', buttonTarget: tabTarget('tab-overview') },
                { name: 'Industry', price: 'Custom', period: '', features: ['Volume pricing', 'Data use agreement included', 'Named point of contact'], highlighted: false, buttonLabel: 'Contact us', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          spacer('rl30s', 20),
          clockEmbed('rl31', 'Lab time'),
        ],
      },
    ],
  },
};

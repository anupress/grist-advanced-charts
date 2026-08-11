// Sports Facility Management template — bookings, members, classes and leagues in one place.
// Grist's own facility page is thin (it shows revenue tracking, a group-sales CRM and event
// budgets, and names only generic Budget/Payroll/CRM templates), so this is grounded in adjacent
// real docs instead:
//   • Sports League Standings — Wins = len(Game_Schedule.lookupRecords(Winner=$id)) and
//     Win_Rate = Wins/(Wins+Losses): a standings table entirely DERIVED from results, never typed.
//   • Rental Management — Income_and_Expenses tracked per space with Month = Date.strftime("%Y-%m")
//     and rolled up per unit, which is exactly revenue-and-utilisation per court.
//   • Class Enrollment — whose sample classes are literally "Gym Stars" and "Yoga Kids", with
//     Max_Students / Count / Spots_Left capacity rollups.
//
// The gap none of them fills: a facility manager runs bookings AND members AND classes AND leagues,
// and today that means four spreadsheets. Past the sources: a DRAGGABLE court calendar that writes
// rescheduled bookings back to Grist, and utilisation per facility — the number that actually
// decides pricing and whether you need another court.

import {
  text, accordion, counter, iconBlock, button, urlTarget, tabTarget,
  spacer, image, testimonials, clockEmbed, placeholderImage,
} from './_helpers.js';

const PINK = '#f06595';
const SKY = '#74c0fc';

export const TEMPLATE = {
  id: 'sports-facility',
  name: 'Sports Facility Management',
  tagline: 'Bookings, members, classes and leagues — one front desk',
  config: {
    version: 1,
    theme: { paletteId: 'candy', fontId: 'geometric', mode: 'light' },
    dataTable: 'Bookings',
    header: {
      logoData: null, title: 'Anupress Sports', slogan: 'Where every game finds its home',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Bookings', tab: 'tab-bookings' },
        { label: 'Facilities', tab: 'tab-facilities' }, { label: 'Membership', tab: 'tab-membership' },
        { label: 'Leagues', tab: 'tab-leagues' },
      ],
    },
    footer: { text: '© 2026 Anupress Sports.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Bookings', tab: 'tab-bookings' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Where every game finds its home 🏆', subtitle: 'Courts, members, classes and league tables — live from the booking sheet the front desk already works in.' },
        blocks: [
          { id: 'sf1', type: 'stat', span: 3, config: { table: 'Members', label: 'Active members', column: 'IsActive', agg: 'sum', icon: 'users', format: {} } },
          { id: 'sf2', type: 'stat', span: 3, config: { table: 'Bookings', label: 'Bookings', column: 'Date', agg: 'count', icon: 'calendar', format: {} } },
          { id: 'sf3', type: 'stat', span: 3, config: { table: 'Bookings', label: 'Booking revenue', column: 'Revenue', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'sf4', type: 'stat', span: 3, config: { table: 'Facilities', label: 'Avg. utilisation', column: 'UtilisationPct', agg: 'avg', icon: 'target', format: { percent: true, decimals: 0 } } },
          { id: 'sf5', type: 'chart', span: 8, config: { table: 'Facilities', title: 'Revenue by facility', chartType: 'bar', dims: ['Name'], measures: ['Revenue'], agg: 'sum', sortByValue: true } },
          { id: 'sf6', type: 'breakdown', span: 4, config: { table: 'Bookings', title: 'Who books the courts', column: 'Type', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'sf7', type: 'progress', span: 8, config: { title: 'Membership target this season', mode: 'data', table: 'Members', valueColumn: 'IsActive', agg: 'sum', target: 60, suffix: 'members', color: PINK } },
          { id: 'sf8', type: 'countdown', span: 4, config: { title: 'Season opener', targetDate: new Date(Date.now() + 19 * 86400000).toISOString(), expiredText: 'Season is under way — good luck out there.', color: PINK } },
          text('sf9', 'About our complex', 'From weekend leagues to championship tournaments, this page tracks how the facilities are actually used — every figure comes from the same booking, membership and results tables the staff work in, not a monthly report someone has to assemble.'),
          accordion('sf10', 'Frequently asked questions', [
            { q: 'How do I book a court or field?', a: 'Members can book online up to two weeks ahead; guest passes are available at the front desk. The Bookings page shows what is already taken.' },
            { q: 'What membership types do you offer?', a: 'Individual, family, team and student — see the Membership page for what each includes and when yours renews.' },
            { q: 'Do you host leagues and tournaments?', a: 'Yes. The Leagues page carries the current standings, worked out from the results rather than typed in by hand.' },
          ]),
        ],
      },
      {
        id: 'tab-bookings', title: 'Bookings',
        hero: { title: 'The booking sheet', subtitle: 'What is on which court, when, and who booked it.' },
        blocks: [
          {
            id: 'sf11', type: 'calendar', span: 12,
            config: { title: 'Court & field calendar', table: 'Bookings', dateColumn: 'Date', titleColumn: 'Facility', detailColumns: ['StartTime', 'BookedBy', 'Type', 'Hours'], colorBy: 'Type', draggable: true },
          },
          text('sf12', '', 'Drag a booking to a new day to move it — on the published page that writes straight back to your Bookings table, so the calendar the members see and the sheet the front desk works from can never disagree.'),
          spacer('sf12s', 10),
          { id: 'sf13', type: 'stat', span: 3, config: { table: 'Bookings', label: 'Hours booked', column: 'Hours', agg: 'sum', icon: 'countdown', format: { decimals: 0 } } },
          { id: 'sf14', type: 'stat', span: 3, config: { table: 'Bookings', label: 'Revenue', column: 'Revenue', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'sf15', type: 'stat', span: 3, config: { table: 'Bookings', label: 'Avg. booking length', column: 'Hours', agg: 'avg', icon: 'pulse', format: { decimals: 1 } } },
          { id: 'sf16', type: 'breakdown', span: 3, config: { table: 'Bookings', title: 'Status', column: 'Status', limit: 5 } },
          { id: 'sf17', type: 'chart', span: 6, config: { table: 'Bookings', title: 'Hours booked by facility', chartType: 'bar', dims: ['Facility'], measures: ['Hours'], agg: 'sum', sortByValue: true } },
          { id: 'sf18', type: 'chart', span: 6, config: { table: 'Bookings', title: 'Revenue by booking type', chartType: 'column', dims: ['Type'], measures: ['Revenue'], agg: 'sum', sortByValue: true } },
          {
            id: 'sf19', type: 'livetable', span: 12,
            config: {
              title: 'Booking log', table: 'Bookings',
              columns: ['Date', 'Facility', 'StartTime', 'Hours', 'BookedBy', 'Type', 'Revenue'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G70', color: '#ffe3e3' }],
            },
          },
        ],
      },
      {
        id: 'tab-facilities', title: 'Facilities',
        hero: { title: 'Courts, fields & studios', subtitle: 'What we have, how hard it works, and what it earns.' },
        blocks: [
          { id: 'sf20', type: 'map', span: 12, config: { table: 'Facilities', title: 'Around the complex', subtitle: '%count facilities mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'Type', popupColumns: ['Type', 'Capacity', 'UtilisationPct'] } },
          { id: 'sf21', type: 'breakdown', span: 4, config: { table: 'Facilities', title: 'By type', column: 'Type', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'sf22', type: 'chart', span: 8, config: { table: 'Facilities', title: 'Utilisation by facility', chartType: 'bar', dims: ['Name'], measures: ['UtilisationPct'], agg: 'avg', sortByValue: true } },
          {
            id: 'sf23', type: 'livetable', span: 12,
            config: {
              title: 'Facility register', table: 'Facilities',
              columns: ['Name', 'Type', 'Capacity', 'HourlyRate', 'BookedHours', 'UtilisationPct', 'Revenue'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F8', color: '#d3f9d8' }],
            },
          },
          text('sf24', '', '<b>Utilisation</b> is highlighted because it is the number that decides everything else — whether to raise the hourly rate, move a class to a quieter slot, or build another court. It is booked hours against sellable hours, the same per-space model Grist\'s rental template uses for income.'),
          { id: 'sf25', type: 'chart', span: 12, config: { table: 'Facilities', title: 'Booked vs available hours', chartType: 'column', dims: ['Name'], measures: ['BookedHours', 'AvailableHours'], agg: 'sum', stacked: true } },
        ],
      },
      {
        id: 'tab-membership', title: 'Membership',
        hero: { title: 'Members & classes', subtitle: 'Who belongs here, when they renew, and what they come for.' },
        blocks: [
          { id: 'sf26', type: 'stat', span: 3, config: { table: 'Members', label: 'Active members', column: 'IsActive', agg: 'sum', icon: 'users', format: {} } },
          { id: 'sf27', type: 'stat', span: 3, config: { table: 'Members', label: 'Monthly dues', column: 'MonthlyFee', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'sf28', type: 'stat', span: 3, config: { table: 'Members', label: 'Visits this month', column: 'VisitsThisMonth', agg: 'sum', icon: 'pulse', format: { compact: true } } },
          { id: 'sf29', type: 'stat', span: 3, config: { table: 'Classes', label: 'Classes full', column: 'IsFull', agg: 'sum', icon: 'target', format: {} } },
          { id: 'sf30', type: 'breakdown', span: 4, config: { table: 'Members', title: 'By membership type', column: 'Type', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'sf31', type: 'breakdown', span: 4, config: { table: 'Members', title: 'By status', column: 'Status', limit: 5 } },
          { id: 'sf32', type: 'chart', span: 4, config: { table: 'Members', title: 'Dues by membership type', chartType: 'bar', dims: ['Type'], measures: ['MonthlyFee'], agg: 'sum', sortByValue: true } },
          {
            id: 'sf33', type: 'livetable', span: 12,
            config: {
              title: 'Class timetable', table: 'Classes',
              columns: ['Name', 'Day', 'Time', 'Instructor', 'Enrolled', 'Capacity', 'SpotsLeft'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G10', color: '#d3f9d8' }],
            },
          },
          text('sf34', '', '<b>Spots left</b> is the column members actually scan. It is capacity minus confirmed enrolments — a rollup, exactly as Grist\'s class-enrolment template computes it, so a class can never quietly overfill.'),
          {
            id: 'sf35', type: 'livetable', span: 12,
            config: {
              title: 'Membership register', table: 'Members',
              columns: ['MemberID', 'Name', 'Type', 'Status', 'JoinDate', 'RenewalDate', 'VisitsThisMonth'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'F1:F48', color: '#e7f5ff' }],
            },
          },
          text('sf36', '', 'Renewal dates are highlighted — a lapsed member is far cheaper to win back the week before their renewal than the month after it.'),
        ],
      },
      {
        id: 'tab-leagues', title: 'Leagues',
        hero: { title: 'League standings', subtitle: 'Worked out from the results, not typed in by hand.' },
        blocks: [
          { id: 'sf37', type: 'breakdown', span: 4, config: { table: 'Standings', title: 'Teams by league', column: 'League', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'sf38', type: 'chart', span: 8, config: { table: 'Standings', title: 'Points by team', chartType: 'bar', dims: ['Team'], measures: ['Points'], agg: 'sum', sortByValue: true } },
          {
            id: 'sf39', type: 'livetable', span: 12,
            config: {
              title: 'Standings', table: 'Standings',
              columns: ['Team', 'League', 'Played', 'Won', 'Drawn', 'Lost', 'Points'],
              pageSize: 10, searchable: true, sortable: true, defaultSort: null,
              highlights: [{ ranges: 'G1:G10', color: '#ffe8cc' }],
            },
          },
          text('sf40', '', 'In your own document these columns should be formulas, not entries: Grist\'s league template derives wins as <code>len(Game_Schedule.lookupRecords(Winner=$id))</code> straight from the fixture list. Record the results once and the table can never disagree with them.'),
          { id: 'sf41', type: 'chart', span: 12, config: { table: 'Standings', title: 'Win rate by team', chartType: 'column', dims: ['Team'], measures: ['WinRate'], agg: 'avg', sortByValue: true } },
          spacer('sf41s', 10),
          iconBlock('sf42', 'target', 'l', PINK, '#ffffff', 'center', 3),
          iconBlock('sf43', 'users', 'l', SKY, '#ffffff', 'center', 3),
          iconBlock('sf44', 'layout', 'l', PINK, '#ffffff', 'center', 3),
          iconBlock('sf45', 'star', 'l', SKY, '#ffffff', 'center', 3),
          counter('sf46', 'Years operating', 0, 14, {}, 3),
          counter('sf47', 'Teams in our leagues', 0, 10, {}, 3),
          counter('sf48', 'Annual events hosted', 0, 180, { suffix: '+' }, 3),
          counter('sf49', 'Member satisfaction', 0, 94, { suffix: '%' }, 3),
          { id: 'sf50', type: 'timeline', span: 12, config: { title: 'How the complex grew', items: [
            { date: '2012', title: 'One hall, two courts', description: 'A single indoor hall, booked with a paper diary at the front desk.' },
            { date: '2016', title: 'Outdoor fields opened', description: 'Two full-size pitches, and the first adult leagues.' },
            { date: '2021', title: 'Pool and studios added', description: 'Swim school and fitness classes brought weekday mornings to life.' },
            { date: '2026', title: 'One shared schedule', description: 'Bookings, members, classes and standings in one place — this page.' },
          ] } },
          { id: 'sf51', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          image('sf52', placeholderImage(PINK, SKY), 'Indoor sports courts', 'The main indoor hall on a league night', 6),
          testimonials('sf53', 'What our members say', [
            { name: 'Coach Derek Snyder', quote: 'Best-maintained courts in the area — our league won\'t play anywhere else.', rating: 5, photoData: null },
            { name: 'Amy Torres', quote: 'Booking is effortless and the staff genuinely care about the community.', rating: 5, photoData: null },
          ], 6),
          {
            id: 'sf54', type: 'pricing', span: 12,
            config: {
              title: 'Membership', plans: [
                { name: 'Student', price: '$28', period: '/mo', features: ['Off-peak court access', 'Two classes a week', 'Valid student ID required'], highlighted: false, buttonLabel: 'Join', buttonTarget: tabTarget('tab-membership') },
                { name: 'Individual', price: '$45', period: '/mo', features: ['Full court access', 'Unlimited classes', 'Book two weeks ahead'], highlighted: true, buttonLabel: 'Join', buttonTarget: tabTarget('tab-membership') },
                { name: 'Team', price: '$160', period: '/mo', features: ['Weekly practice slot', 'League entry included', 'Priority tournament booking'], highlighted: false, buttonLabel: 'Enquire', buttonTarget: urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/') },
              ],
            },
          },
          button('sf55', 'Book a facility', 'primary', 'left', urlTarget('https://anupress.com/advanced-charts-grist-widget-guide/'), 4),
          spacer('sf55s', 20),
          clockEmbed('sf56', 'Game time'),
        ],
      },
    ],
  },
};

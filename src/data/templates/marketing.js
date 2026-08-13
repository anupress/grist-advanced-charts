// Marketing template — campaigns, content/SEO, the social calendar, events and NPS in one place.
//
// Grist's Marketing workspace holds eight real docs, and this is built from five of them:
//   • Net Promoter Score Results — All_Responses buckets each reply with
//     Type = if $NPS_Score <= 6: "Detractor", if >= 9: "Promoter" else "Passive".
//   • Internal Links Tracker for SEO — Site_Content.Orphaned_ = len(Links.lookupRecords(To=$id))<1
//     ("nothing links TO this page") and No_Internal_Links_ = len(...(From=$id))<1.
//   • Event Sponsors + Registrations — Registered_Attendees = len(All_Registrations.lookupRecords(
//     Event=$id)), Ticket_Revenue = SUM(person.Ticket_Value ...), Full_ = Registered/Capacity.
//   • Social Media Content Calendar — Social_Media_Posts with a real Publication_Time, a
//     Platforms ChoiceList and Drafted/Reviewed/Published flags.
//   • UTM Link Builder — Final_URL stitches utm_source/medium/campaign/term/content onto a URL.
//
// What none of them does, and this template does:
//   1. COMPUTE THE NPS. The official doc labels promoters and detractors but never works out
//      %promoters − %detractors. The Feedback table carries NpsPoints (+100 / 0 / −100) so a plain
//      average of that column IS the NPS score — no special-case block, and it stays correct as
//      responses come in.
//   2. Turn the UTM'd link into a QR code. The source builds the string; you still can't put a
//      string on a conference banner.
//   3. A DRAGGABLE content calendar — the source calendar is a table with a date column and no
//      dated view, so rescheduling means editing a cell.
//   4. Surface orphaned pages as a headline number and a highlighted column, not a hidden bool.
//   5. One funnel — spend → impressions → clicks → leads → revenue, per channel.

import {
  text, accordion, counter, iconBlock, button, tabTarget,
  spacer, image, testimonials, placeholderImage,
} from './_helpers.js';

const CORAL = '#ff6b6b';
const AMBER = '#ffa94d';

export const TEMPLATE = {
  id: 'marketing',
  name: 'Marketing',
  tagline: 'Campaigns, content, events and customer sentiment',
  config: {
    version: 1,
    theme: { paletteId: 'sunset', fontId: 'geometric', mode: 'auto' },
    dataTable: 'Campaigns',
    header: {
      logoData: null, title: 'Anupress Marketing', slogan: 'Every channel, one scoreboard',
      menu: [
        { label: 'Overview', tab: 'tab-overview' }, { label: 'Campaigns', tab: 'tab-campaigns' },
        { label: 'Content & SEO', tab: 'tab-content' }, { label: 'Social', tab: 'tab-social' },
        { label: 'Events', tab: 'tab-events' }, { label: 'Customers', tab: 'tab-nps' },
      ],
    },
    footer: {
      text: '© 2026 Anupress Marketing.',
      links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Campaigns', tab: 'tab-campaigns' }],
      showCredit: true,
    },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: {
          title: 'Every channel, one scoreboard 📣',
          subtitle: 'Spend, pipeline, content, events and what customers actually think — from the sheets the team already keeps.',
        },
        blocks: [
          { id: 'mk1', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Leads this period', column: 'Leads', agg: 'sum', icon: 'users', format: { compact: true } } },
          { id: 'mk2', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Attributed revenue', column: 'Revenue', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'mk3', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Blended ROAS', column: 'ROAS', agg: 'avg', icon: 'trending', format: { decimals: 1 } } },
          // The headline this whole template exists to produce. mean(NpsPoints) == %promoters −
          // %detractors, which is the NPS definition — see the file header.
          { id: 'mk4', type: 'stat', span: 3, config: { table: 'Feedback', label: 'Net Promoter Score', column: 'NpsPoints', agg: 'avg', icon: 'star', format: { decimals: 0 } } },
          { id: 'mk5', type: 'chart', span: 8, config: { table: 'Campaigns', title: 'Revenue by channel', chartType: 'bar', dims: ['Channel'], measures: ['Revenue'], agg: 'sum', sortByValue: true } },
          // A breakdown counts rows, so this is how many campaigns run per channel — NOT how much
          // each channel costs. Spend by channel is already in "Spend vs revenue" below; titling
          // this one "Where the budget goes" (as it first read) promised money and showed volume.
          { id: 'mk6', type: 'breakdown', span: 4, config: { table: 'Campaigns', title: 'Campaigns by channel', column: 'Channel', limit: 7, display: 'chart', chartType: 'doughnut' } },
          { id: 'mk7', type: 'chart', span: 6, config: { table: 'Campaigns', title: 'Cost per lead by channel', chartType: 'bar', dims: ['Channel'], measures: ['CostPerLead'], agg: 'avg', sortByValue: true } },
          { id: 'mk8', type: 'chart', span: 6, config: { table: 'Campaigns', title: 'Spend vs revenue', chartType: 'column', dims: ['Channel'], measures: ['Spend', 'Revenue'], agg: 'sum' } },
          { id: 'mk9', type: 'progress', span: 12, config: { title: 'Quarterly lead target', mode: 'data', table: 'Campaigns', valueColumn: 'Leads', agg: 'sum', target: 9000, suffix: 'leads', color: CORAL } },
          text('mk10', 'Why this page exists',
            'Every number here comes from the same records the team works in day to day — the campaign sheet, the content register, the post calendar, the event list and the survey responses. Nothing is retyped into a slide, so nothing goes stale between reviews.'),
        ],
      },
      {
        id: 'tab-campaigns', title: 'Campaigns',
        hero: { title: 'Campaigns', subtitle: 'What we spent, what it reached, and what came back.' },
        blocks: [
          { id: 'mk11', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Total spend', column: 'Spend', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'mk12', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Impressions', column: 'Impressions', agg: 'sum', icon: 'globe', format: { compact: true } } },
          { id: 'mk13', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'Avg. CTR', column: 'CTR', agg: 'avg', icon: 'target', format: { percent: true, decimals: 2 } } },
          { id: 'mk14', type: 'stat', span: 3, config: { table: 'Campaigns', label: 'New customers', column: 'Customers', agg: 'sum', icon: 'users', format: {} } },
          {
            id: 'mk15', type: 'livetable', span: 12,
            config: {
              title: 'Campaign register', table: 'Campaigns',
              columns: ['Name', 'Channel', 'Status', 'Spend', 'Leads', 'CostPerLead', 'ROAS', 'Revenue'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              // H = ROAS, the column a marketing lead scans first. NB the letter counts the
              // RENDERED order, which follows the table's own column order (render/livetable.js
              // filters allCols) — not the order of the `columns` array just above.
              highlights: [{ ranges: 'H1:H12', color: '#ffe3e3' }],
            },
          },
          { id: 'mk16', type: 'chart', span: 8, config: { table: 'Campaigns', title: 'Return on ad spend by campaign', chartType: 'bar', dims: ['Name'], measures: ['ROAS'], agg: 'avg', sortByValue: true } },
          { id: 'mk17', type: 'breakdown', span: 4, config: { table: 'Campaigns', title: 'Campaigns by status', column: 'Status', limit: 5, display: 'chart', chartType: 'doughnut' } },
          // The one chart that answers "is spending more actually returning more". Every other
          // chart here totals a channel or ranks a campaign; a scatter puts each campaign at its
          // own spend and its own revenue, so a campaign that costs a lot and returns little sits
          // visibly off the line instead of being averaged away inside its channel.
          // dims on a scatter is the COLOUR grouping, not the point identity — every row is already
          // a point. Naming the campaign column here would have produced twelve one-point series
          // and a twelve-entry legend; channel gives four readable groups over the same points.
          { id: 'mk17s', type: 'chart', span: 12, config: { table: 'Campaigns', title: 'Does spend drive revenue?', subtitle: 'One point per campaign, coloured by channel — spend across, revenue up', chartType: 'scatter', dims: ['Channel'], measures: ['Spend', 'Revenue'], agg: 'sum' } },
          { id: 'mk18', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          text('mk19', 'Tag the link, then print it',
            'A tagged campaign URL — <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> — is what makes a click traceable back to the campaign that earned it. It is also unusable on anything physical: nobody types ninety characters off a banner. This block turns the tagged link into a QR code you can drop straight into print or a slide, so offline collateral lands in the same attribution report as everything else.'),
          {
            id: 'mk20', type: 'qrcode', span: 4,
            config: { text: 'https://anupress.com/advanced-charts-grist-widget-guide/', level: 'M', fg: '#0b1020', bg: '#ffffff', size: 180, caption: 'Tagged campaign link — scan to test' },
          },
          accordion('mk21', 'How the funnel numbers are derived', [
            { q: 'Where does CTR come from?', a: 'Clicks divided by impressions, per campaign. It is stored as a column rather than computed in the chart so you can sort and filter on it like any other field.' },
            { q: 'What counts as a lead?', a: 'A click that turned into a contact record. The click-to-lead rate differs sharply by channel — email and partnerships convert several times better than display, which is why cost per lead is charted per channel rather than blended.' },
            { q: 'Is ROAS revenue or profit?', a: 'Revenue over spend, not margin. It is the fastest cross-channel comparison, but a high-ROAS channel can still be unprofitable once delivery cost is included.' },
          ], 8),
        ],
      },
      {
        id: 'tab-content', title: 'Content & SEO',
        hero: { title: 'Content & internal links', subtitle: 'What we have published, what it earns, and what nothing links to.' },
        blocks: [
          { id: 'mk22', type: 'stat', span: 3, config: { table: 'Content', label: 'Pages', column: 'Title', agg: 'count', icon: 'layout', format: {} } },
          { id: 'mk23', type: 'stat', span: 3, config: { table: 'Content', label: 'Pageviews (30d)', column: 'Pageviews', agg: 'sum', icon: 'trending', format: { compact: true } } },
          // The orphan count, promoted from a hidden bool in the source doc to a headline number.
          { id: 'mk24', type: 'stat', span: 3, config: { table: 'Content', label: 'Orphaned pages', column: 'Orphaned', agg: 'sum', icon: 'eye', format: {} } },
          { id: 'mk25', type: 'stat', span: 3, config: { table: 'Content', label: 'Avg. links in', column: 'InboundLinks', agg: 'avg', icon: 'arrowDown', format: { decimals: 1 } } },
          {
            id: 'mk26', type: 'livetable', span: 12,
            config: {
              title: 'Content register', table: 'Content',
              columns: ['Title', 'Section', 'Status', 'Author', 'Words', 'InboundLinks', 'Pageviews', 'Orphaned'],
              pageSize: 10, searchable: true, sortable: true, defaultSort: null,
              // H = Orphaned. Sort by it to get your whole to-do list in one click.
              highlights: [{ ranges: 'H1:H26', color: '#ffe8cc' }],
            },
          },
          { id: 'mk27', type: 'chart', span: 8, config: { table: 'Content', title: 'Pageviews by section', chartType: 'bar', dims: ['Section'], measures: ['Pageviews'], agg: 'sum', sortByValue: true } },
          { id: 'mk28', type: 'breakdown', span: 4, config: { table: 'Content', title: 'Pages by section', column: 'Section', limit: 6, display: 'chart', chartType: 'doughnut' } },
          text('mk29', 'The orphan problem',
            'An orphaned page is one no other page links to. Search engines struggle to find it, readers never stumble onto it, and it quietly earns nothing — which is why the register above flags it as a column you can sort on rather than burying it in a filter. The flag is derived rather than typed: a page counts as orphaned while nothing links to it, so the moment you add a link the row stops flagging itself, with nobody having to remember to clear it.'),
          { id: 'mk30', type: 'chart', span: 12, config: { table: 'Content', title: 'Inbound links vs pageviews', chartType: 'column', dims: ['Section'], measures: ['InboundLinks', 'Pageviews'], agg: 'avg' } },
        ],
      },
      {
        id: 'tab-social', title: 'Social',
        hero: { title: 'The content calendar', subtitle: 'What goes out, where, and when — drag a post to move it.' },
        blocks: [
          { id: 'mk31', type: 'stat', span: 3, config: { table: 'Posts', label: 'Posts scheduled', column: 'Topic', agg: 'count', icon: 'calendar', format: {} } },
          { id: 'mk32', type: 'stat', span: 3, config: { table: 'Posts', label: 'Engagements', column: 'Engagements', agg: 'sum', icon: 'sparkles', format: { compact: true } } },
          { id: 'mk33', type: 'stat', span: 3, config: { table: 'Posts', label: 'Avg. length', column: 'Characters', agg: 'avg', icon: 'type', format: { decimals: 0 } } },
          { id: 'mk34', type: 'stat', span: 3, config: { table: 'Posts', label: 'Platforms', column: 'Platform', agg: 'countd', icon: 'globe', format: {} } },
          // The draggable calendar. The source doc has a Publication_Time column but no dated
          // view, so moving a post there means editing a cell.
          {
            id: 'mk35', type: 'calendar', span: 12,
            config: {
              title: 'Publication calendar', table: 'Posts', dateColumn: 'Date', titleColumn: 'Topic',
              detailColumns: ['Platform', 'Campaign', 'Status', 'Author'], colorBy: 'Platform', draggable: true,
            },
          },
          { id: 'mk36', type: 'breakdown', span: 4, config: { table: 'Posts', title: 'By platform', column: 'Platform', limit: 6, display: 'chart', chartType: 'doughnut' } },
          { id: 'mk37', type: 'chart', span: 8, config: { table: 'Posts', title: 'Engagements by platform', chartType: 'bar', dims: ['Platform'], measures: ['Engagements'], agg: 'sum', sortByValue: true } },
          { id: 'mk38', type: 'breakdown', span: 4, config: { table: 'Posts', title: 'Pipeline status', column: 'Status', limit: 5, display: 'list' } },
          {
            id: 'mk39', type: 'livetable', span: 8,
            config: {
              title: 'Upcoming posts', table: 'Posts',
              columns: ['Date', 'Topic', 'Platform', 'Campaign', 'Status', 'Author'],
              pageSize: 6, searchable: true, sortable: true, defaultSort: null, highlights: [],
            },
          },
        ],
      },
      {
        id: 'tab-events', title: 'Events',
        hero: { title: 'Events & sponsorship', subtitle: 'Registrations, capacity and ticket revenue — without reconciling three lists.' },
        blocks: [
          { id: 'mk40', type: 'stat', span: 3, config: { table: 'Events', label: 'Events', column: 'Name', agg: 'count', icon: 'calendar', format: {} } },
          { id: 'mk41', type: 'stat', span: 3, config: { table: 'Events', label: 'Registered', column: 'Registered', agg: 'sum', icon: 'users', format: {} } },
          { id: 'mk42', type: 'stat', span: 3, config: { table: 'Events', label: 'Ticket revenue', column: 'TicketRevenue', agg: 'sum', icon: 'coins', format: { compact: true, currency: '$' } } },
          { id: 'mk43', type: 'stat', span: 3, config: { table: 'Events', label: 'Avg. capacity used', column: 'PctFull', agg: 'avg', icon: 'target', format: { percent: true, decimals: 0 } } },
          { id: 'mk44', type: 'map', span: 12, config: { table: 'Events', title: 'Where we show up', subtitle: '%count events mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: null, popupColumns: ['Location', 'Registered', 'PctFull'] } },
          {
            id: 'mk45', type: 'livetable', span: 12,
            config: {
              title: 'Event register', table: 'Events',
              columns: ['Name', 'StartDate', 'Location', 'Coordinator', 'Capacity', 'Registered', 'PctFull', 'TicketRevenue'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              // G = PctFull: how close each event is to selling out.
              highlights: [{ ranges: 'G1:G8', color: '#d3f9d8' }],
            },
          },
          { id: 'mk46', type: 'chart', span: 8, config: { table: 'Events', title: 'Ticket revenue by event', chartType: 'bar', dims: ['Name'], measures: ['TicketRevenue'], agg: 'sum', sortByValue: true } },
          // Marketing was the only template with no countdown, which is odd for the discipline
          // that runs on dates more than any other here — a launch, a conference, an end of
          // quarter. A team looking at this page wants to know how long is left before it.
          { id: 'mk46c', type: 'countdown', span: 4, config: { title: 'Doors open at the next event', targetDate: new Date(Date.now() + 23 * 86400000).toISOString(), expiredText: 'Live now — go and meet people.', color: CORAL } },
          { id: 'mk47', type: 'chart', span: 12, config: { table: 'Events', title: 'Capacity vs registered', chartType: 'column', dims: ['Name'], measures: ['Capacity', 'Registered'], agg: 'sum' } },
          text('mk48', 'No more reconciling lists',
            'Registrations and ticket revenue come from the registration records themselves — a count of who signed up and the sum of what they paid — rather than being typed into the event row. Because the numbers are computed rather than maintained by hand, the headcount on this page and the list at the door cannot drift apart.'),
        ],
      },
      {
        id: 'tab-nps', title: 'Customers',
        hero: { title: 'What customers actually think', subtitle: 'Net Promoter Score, and the reasons behind it.' },
        blocks: [
          { id: 'mk49', type: 'stat', span: 3, config: { table: 'Feedback', label: 'Net Promoter Score', column: 'NpsPoints', agg: 'avg', icon: 'star', format: { decimals: 0 } } },
          { id: 'mk50', type: 'stat', span: 3, config: { table: 'Feedback', label: 'Responses', column: 'Score', agg: 'count', icon: 'users', format: {} } },
          { id: 'mk51', type: 'stat', span: 3, config: { table: 'Feedback', label: 'Avg. score', column: 'Score', agg: 'avg', icon: 'target', format: { decimals: 1 } } },
          { id: 'mk52', type: 'stat', span: 3, config: { table: 'Feedback', label: 'Followed up', column: 'Contacted', agg: 'sum', icon: 'check', format: {} } },
          { id: 'mk53', type: 'breakdown', span: 4, config: { table: 'Feedback', title: 'Promoters, passives, detractors', column: 'Type', limit: 3, display: 'chart', chartType: 'doughnut' } },
          { id: 'mk54', type: 'chart', span: 8, config: { table: 'Feedback', title: 'Score distribution', chartType: 'column', dims: ['Score'], measures: ['Score'], agg: 'count' } },
          { id: 'mk55', type: 'chart', span: 12, config: { table: 'Feedback', title: 'NPS by customer segment', chartType: 'bar', dims: ['Segment'], measures: ['NpsPoints'], agg: 'avg', sortByValue: true } },
          text('mk56', 'How the score is worked out',
            'Anyone scoring 9 or 10 is a promoter, 7 or 8 is passive, 0 to 6 is a detractor. The score itself is the share of promoters minus the share of detractors, so it runs from −100 to +100 and passives deliberately count for nothing. Each response here stores +100, 0 or −100, which means a plain average of that column <em>is</em> the NPS, and it stays right as new responses arrive.'),
          {
            id: 'mk57', type: 'livetable', span: 12,
            config: {
              title: 'Recent responses', table: 'Feedback',
              columns: ['Submitted', 'Score', 'Type', 'Segment', 'Reason', 'Contacted'],
              pageSize: 8, searchable: true, sortable: true, defaultSort: null,
              // B = Score: the number you skim before reading the comment beside it.
              highlights: [{ ranges: 'B1:B64', color: '#e5dbff' }],
            },
          },
          { id: 'mk58', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          counter('mk59', 'Responses collected', 0, 64, {}, 3),
          counter('mk60', 'Promoters', 0, 33, { icon: 'star' }, 3),
          counter('mk61', 'Avg. reply time (hrs)', 0, 6, { icon: 'countdown' }, 3),
          counter('mk62', 'Segments surveyed', 0, 4, { icon: 'users' }, 3),
          spacer('mk63', 20),
          testimonials('mk64', 'In their own words', [
            { name: 'Chris Scott, Digital Marketing', quote: 'It appears simple, but it is very powerful — we replaced three tools and a monthly slide deck.', rating: 5, photoData: null },
            { name: 'Priya N., Head of Growth', quote: 'The orphan-page list alone paid for the migration. We had 40 pages nobody linked to.', rating: 5, photoData: null },
          ]),
          image('mk65', placeholderImage(CORAL, AMBER), 'The marketing team at work', 'Swap this for a photo of your team', 6),
          {
            id: 'mk66', type: 'timeline', span: 6,
            config: {
              title: 'How we got here', items: [
                { date: 'Q1', title: 'Five spreadsheets', description: 'Campaigns, content, posts, events and survey replies each lived in their own file, and nothing reconciled.' },
                { date: 'Q2', title: 'One document', description: 'Everything moved into a single relational doc, so a campaign could finally be linked to the posts and pages that carried it.' },
                { date: 'Q3', title: 'One scoreboard', description: 'This dashboard replaced the monthly deck. The numbers update themselves; the review is now about what to do next.' },
              ],
            },
          },
          { id: 'mk67', type: 'divider', span: 12, config: { style: 'solid', thickness: 1, color: null } },
          iconBlock('mk68', 'target', 'l', CORAL, '#ffffff', 'center', 3),
          iconBlock('mk69', 'trending', 'l', AMBER, '#ffffff', 'center', 3),
          iconBlock('mk70', 'users', 'l', CORAL, '#ffffff', 'center', 3),
          iconBlock('mk71', 'star', 'l', AMBER, '#ffffff', 'center', 3),
          button('mk72', 'Back to the overview', 'primary', 'center', tabTarget('tab-overview'), 12),
        ],
      },
    ],
  },
};

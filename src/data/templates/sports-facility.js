import {
  stat, chart, text, accordion, counter, iconBlock, button, urlTarget,
  spacer, progress, image, testimonials, breakdown, mapBlock, livetable, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'sports-facility',
  name: 'Sports Facility Management',
  tagline: 'Bookings, membership and facility use',
  config: {
    version: 1,
    theme: { paletteId: 'candy', fontId: 'geometric', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Anupress Sports', slogan: 'Where every game finds its home',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Facilities', tab: 'tab-facilities' }, { label: 'Book & Explore', tab: 'tab-book' }],
    },
    footer: { text: '© 2026 Anupress Sports.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Facilities', tab: 'tab-facilities' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Where every game finds its home 🏆', subtitle: 'A live look at bookings, membership and facility use.' },
        blocks: [
          stat('sf1', 'Active Members', 'Column', 'count', 'users', { compact: true }),
          stat('sf2', 'Courts & Fields', 'Column', 'count', 'layout', { compact: true }),
          stat('sf3', 'Events This Month', 'Column', 'count', 'pulse', { compact: true }),
          stat('sf4', 'Avg. Utilization', 'Column', 'avg', 'target', { decimals: 0, percent: true }),
          chart('sf5', 'Bookings over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('sf6', 'Bookings by facility', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('sf7', 'Membership by type', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('sf8', 'Utilization by day', 'bar', ['Category'], ['Value'], { agg: 'avg' }, 6),
          spacer('sf8s', 12),
          progress('sf8p', 'New members this season', 168, 250, { color: '#f06595' }, 12),
          text('sf9', 'About our complex', 'From weekend leagues to championship tournaments, this page tracks how our facilities are used — live, straight from our own booking records.'),
          accordion('sf10', 'Frequently asked questions', [
            { q: 'How do I book a court or field?', a: 'Members can book online up to two weeks in advance; guest passes are available at the front desk.' },
            { q: 'What membership types do you offer?', a: 'Individual, family and team memberships are all available — see the Facilities page for details.' },
            { q: 'Do you host tournaments?', a: 'Yes — we host regular leagues and tournaments throughout the year. Reach out to book a facility for your event.' },
          ]),
        ],
      },
      {
        id: 'tab-facilities', title: 'Facilities',
        hero: { title: 'Our facilities', subtitle: 'Built for athletes at every level.' },
        blocks: [
          iconBlock('sf11', 'target', 'l', '#f06595', '#ffffff', 'center', 3),
          iconBlock('sf12', 'users', 'l', '#74c0fc', '#ffffff', 'center', 3),
          iconBlock('sf13', 'layout', 'l', '#f06595', '#ffffff', 'center', 3),
          iconBlock('sf14', 'star', 'l', '#74c0fc', '#ffffff', 'center', 3),
          counter('sf15', 'Years operating', 0, 14, {}, 3),
          counter('sf16', 'Facilities available', 0, 26, {}, 3),
          counter('sf17', 'Annual events hosted', 0, 180, { suffix: '+' }, 3),
          counter('sf18', 'Member satisfaction', 0, 94, { suffix: '%' }, 3),
          spacer('sf18s', 30),
          text('sf19', 'Ready to play?', 'Book a facility for your next game, or join as a member for priority access and better rates.'),
          button('sf20', 'Book a facility', 'primary', 'left', urlTarget('https://example.com/book'), 4),
        ],
      },
      {
        id: 'tab-book', title: 'Book & Explore',
        hero: { title: 'Book your next game', subtitle: 'Everything you need to plan a visit.' },
        blocks: [
          image('sf21', placeholderImage('#f06595', '#74c0fc'), 'Indoor sports courts', 'Our main indoor court complex', 6),
          breakdown('sf22', 'Bookings by facility type', 4),
          mapBlock('sf23', 'Facility locations', 12),
          testimonials('sf24', 'What our members say', [
            { name: 'Coach Derek Snyder', quote: 'Best-maintained courts in the area — our league won\'t play anywhere else.', rating: 5, photoData: null },
            { name: 'Amy Torres', quote: 'Booking is effortless and the staff genuinely care about the community.', rating: 5, photoData: null },
          ]),
          livetable('sf25', 'Upcoming events', 12),
          spacer('sf25s', 30),
          clockEmbed('sf26', 'Game time'),
        ],
      },
    ],
  },
};

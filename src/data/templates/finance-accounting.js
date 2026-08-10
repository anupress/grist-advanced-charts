import {
  stat, chart, text, accordion, counter, iconBlock, button, urlTarget,
  spacer, progress, image, testimonials, breakdown, mapBlock, livetable, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'finance-accounting',
  name: 'Finance & Accounting',
  tagline: 'Portfolios, returns and client accounts',
  config: {
    version: 1,
    theme: { paletteId: 'corporate', fontId: 'system', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Anupress Financial', slogan: 'Clarity for every balance sheet',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Services', tab: 'tab-services' }, { label: 'Client Success', tab: 'tab-clients' }],
    },
    footer: { text: '© 2026 Anupress Financial.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Services', tab: 'tab-services' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Clarity for every balance sheet', subtitle: 'A live view of assets under management, performance and client accounts.' },
        blocks: [
          stat('fa1', 'Assets Under Management', 'Column', 'sum', 'coins', { compact: true, currency: '$' }),
          stat('fa2', 'Active Clients', 'Column', 'count', 'users', { compact: true }),
          stat('fa3', 'Avg. Annual Return', 'Column', 'avg', 'trending', { decimals: 1, percent: true }),
          stat('fa4', 'Years of Service', 'Column', 'count', 'star', { compact: true }),
          chart('fa5', 'AUM growth over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('fa6', 'Portfolio allocation', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('fa7', 'Returns by asset class', 'bar', ['Category'], ['Value'], { agg: 'avg', sortByValue: true }, 6),
          chart('fa8', 'Clients by service type', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          spacer('fa8s', 12),
          progress('fa8p', 'Annual net new assets goal', 12500000, 20000000, { suffix: '$', color: '#0b6bcb' }, 12),
          text('fa9', 'Our fiduciary commitment', 'We\'re held to a fiduciary standard — your interests come first, always. This dashboard reflects the same data our own advisors track.'),
          accordion('fa10', 'Frequently asked questions', [
            { q: 'What are your fees?', a: 'We charge a transparent, asset-based fee with no hidden commissions — full details are provided before you sign anything.' },
            { q: 'Is there a minimum to get started?', a: 'Our standard advisory service has a minimum; we also offer a lighter-touch plan for newer investors. Ask us for specifics.' },
            { q: 'How is my money protected?', a: 'Client assets are held at an independent, regulated custodian — we never take direct custody of your funds.' },
          ]),
        ],
      },
      {
        id: 'tab-services', title: 'Services',
        hero: { title: 'How we help', subtitle: 'Planning, investing and peace of mind.' },
        blocks: [
          iconBlock('fa11', 'coins', 'l', '#0b6bcb', '#ffffff', 'center', 3),
          iconBlock('fa12', 'trending', 'l', '#0891b2', '#ffffff', 'center', 3),
          iconBlock('fa13', 'shield', 'l', '#0b6bcb', '#ffffff', 'center', 3),
          iconBlock('fa14', 'users', 'l', '#0891b2', '#ffffff', 'center', 3),
          counter('fa15', 'Years serving clients', 0, 22, {}, 3),
          counter('fa16', 'Certified advisors', 0, 18, {}, 3),
          counter('fa17', 'Client satisfaction', 0, 97, { suffix: '%' }, 3),
          counter('fa18', 'Assets managed', 0, 480, { prefix: '$', suffix: 'M+' }, 3),
          spacer('fa18s', 30),
          text('fa19', 'Start with a conversation', 'A free introductory call is the best way to see if we\'re the right fit for your goals.'),
          button('fa20', 'Schedule a consultation', 'primary', 'left', urlTarget('https://example.com/contact'), 4),
        ],
      },
      {
        id: 'tab-clients', title: 'Client Success',
        hero: { title: 'Client success stories', subtitle: 'Real outcomes for real households and businesses.' },
        blocks: [
          image('fa21', placeholderImage('#0b6bcb', '#0891b2'), 'Advisory office meeting room', 'Where we meet with clients to plan ahead', 6),
          breakdown('fa22', 'Holdings by asset class', 4),
          mapBlock('fa23', 'Our office locations', 12),
          testimonials('fa24', 'What our clients say', [
            { name: 'George Whitman', quote: 'They finally made retirement planning make sense to me.', rating: 5, photoData: null },
            { name: 'Linda Park', quote: 'Transparent fees, honest advice — exactly what I needed.', rating: 5, photoData: null },
          ]),
          livetable('fa25', 'Sample client holdings', 12),
          spacer('fa25s', 30),
          clockEmbed('fa26', 'Market time'),
        ],
      },
    ],
  },
};

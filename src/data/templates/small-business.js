import {
  stat, chart, text, accordion, counter, iconBlock, button, urlTarget,
  spacer, progress, image, testimonials, breakdown, mapBlock, livetable, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'small-business',
  name: 'Small Business',
  tagline: 'Sales, customers and everyday operations',
  config: {
    version: 1,
    theme: { paletteId: 'warmclay', fontId: 'humanist', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Anupress Market', slogan: 'Locally loved since day one',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'About Us', tab: 'tab-about' }, { label: 'Visit Us', tab: 'tab-visit' }],
    },
    footer: { text: '© 2026 Anupress Market.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'About Us', tab: 'tab-about' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Locally loved since day one 🛍️', subtitle: 'A friendly, live look at how business has been going.' },
        blocks: [
          stat('sb1', 'Orders This Month', 'Column', 'count', 'cart', { compact: true }),
          stat('sb2', 'Happy Customers', 'Column', 'count', 'users', { compact: true }),
          stat('sb3', 'Products in Store', 'Column', 'count', 'database', { compact: true }),
          stat('sb4', 'Years in Business', 'Column', 'count', 'star', { compact: true }),
          chart('sb5', 'Sales over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('sb6', 'Sales by category', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('sb7', 'Orders by channel', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('sb8', 'Customer satisfaction by category', 'bar', ['Category'], ['Value'], { agg: 'avg' }, 6),
          spacer('sb8s', 12),
          progress('sb8p', 'This month\'s sales goal', 14200, 20000, { suffix: '$', color: '#c2410c' }, 12),
          text('sb9', 'Our story', 'We started as a single storefront and grew one happy customer at a time. This page tracks how we\'re doing, straight from our own records — no spreadsheets required.'),
          accordion('sb10', 'Frequently asked questions', [
            { q: 'Do you ship nationwide?', a: 'Yes — most orders ship within two business days, anywhere in the country.' },
            { q: 'What\'s your return policy?', a: 'Unused items can be returned within 30 days for a full refund, no questions asked.' },
            { q: 'What are your store hours?', a: 'We\'re open seven days a week — see the Visit Us page for exact hours and directions.' },
          ]),
        ],
      },
      {
        id: 'tab-about', title: 'About Us',
        hero: { title: 'Part of the neighborhood', subtitle: 'Thank you for supporting a local business.' },
        blocks: [
          iconBlock('sb11', 'star', 'l', '#c2410c', '#ffffff', 'center', 3),
          iconBlock('sb12', 'users', 'l', '#d97706', '#ffffff', 'center', 3),
          iconBlock('sb13', 'cart', 'l', '#c2410c', '#ffffff', 'center', 3),
          iconBlock('sb14', 'globe', 'l', '#d97706', '#ffffff', 'center', 3),
          counter('sb15', 'Years serving the community', 0, 11, {}, 3),
          counter('sb16', 'Products sold', 0, 48000, { suffix: '+' }, 3),
          counter('sb17', 'Five-star reviews', 0, 640, { suffix: '+' }, 3),
          counter('sb18', 'Local partners', 0, 22, {}, 3),
          spacer('sb18s', 30),
          text('sb19', 'Come say hello', 'Stop by in person or shop online — either way, we\'re glad you\'re here.'),
          button('sb20', 'Visit our shop', 'primary', 'left', urlTarget('https://example.com'), 4),
        ],
      },
      {
        id: 'tab-visit', title: 'Visit Us',
        hero: { title: 'Come visit', subtitle: 'In the neighborhood or shopping from home — we\'ve got you covered.' },
        blocks: [
          image('sb21', placeholderImage('#c2410c', '#d97706'), 'Storefront exterior', 'Our storefront on Main Street', 6),
          breakdown('sb22', 'Sales by category', 4),
          mapBlock('sb23', 'Find our store', 12),
          testimonials('sb24', 'What our customers say', [
            { name: 'Karen Lopez', quote: 'Feels like the owners actually know their customers — because they do!', rating: 5, photoData: null },
            { name: 'Mike Chen', quote: 'Great products, faster shipping than the big chains.', rating: 5, photoData: null },
          ]),
          livetable('sb25', 'What\'s in stock', 12),
          spacer('sb25s', 30),
          clockEmbed('sb26', 'Store time'),
        ],
      },
    ],
  },
};

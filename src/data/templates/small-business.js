import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'small-business',
  name: 'Small Business',
  tagline: 'Sales, customers and everyday operations',
  config: {
    version: 1,
    theme: { paletteId: 'warmclay', fontId: 'humanist', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Maple & Co. General Store', slogan: 'Locally loved since day one',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'About Us', tab: 'tab-about' }],
    },
    footer: { text: '© 2026 Maple & Co. General Store.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'About Us', tab: 'tab-about' }], showCredit: true },
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
          text('sb9', 'Our story', 'We started as a single storefront and grew one happy customer at a time. This page tracks how we\'re doing, straight from our own records — no spreadsheets required.'),
          accordion('sb10', 'Frequently asked questions', [
            { q: 'Do you ship nationwide?', a: 'Yes — most orders ship within two business days, anywhere in the country.' },
            { q: 'What\'s your return policy?', a: 'Unused items can be returned within 30 days for a full refund, no questions asked.' },
            { q: 'What are your store hours?', a: 'We\'re open seven days a week — see the About Us page for exact hours and directions.' },
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
          text('sb19', 'Come say hello', 'Stop by in person or shop online — either way, we\'re glad you\'re here.'),
          button('sb20', 'Visit our shop', 'primary', 'left', urlTarget('https://example.com'), 4),
        ],
      },
    ],
  },
};

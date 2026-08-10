import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'nonprofits',
  name: 'Nonprofits',
  tagline: 'Donations, programs and impact, transparently',
  config: {
    version: 1,
    theme: { paletteId: 'forest', fontId: 'humanist', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Riverside Community Fund', slogan: 'Making a measurable difference, together',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Our Impact', tab: 'tab-impact' }],
    },
    footer: { text: '© 2026 Riverside Community Fund. A registered nonprofit.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Our Impact', tab: 'tab-impact' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Making a measurable difference, together 🌱', subtitle: 'A live, transparent look at our donations, programs and community impact.' },
        blocks: [
          stat('np1', 'Donors This Year', 'Column', 'count', 'users', { compact: true }),
          stat('np2', 'Funds Raised', 'Column', 'sum', 'coins', { compact: true, currency: '$' }),
          stat('np3', 'Volunteer Hours', 'Column', 'sum', 'pulse', { compact: true }),
          stat('np4', 'Active Programs', 'Column', 'count', 'target', { compact: true }),
          chart('np5', 'Donations over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('np6', 'Funds by program', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('np7', 'Volunteers by region', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('np8', 'Impact by category', 'bar', ['Category'], ['Value'], { sortByValue: true }, 6),
          text('np9', 'Where your donation goes', 'We publish our finances openly. This page reads directly from our own Grist records — the same numbers our board sees — so you always know exactly how donations are used before you give.'),
          accordion('np10', 'Frequently asked questions', [
            { q: 'Is my donation tax-deductible?', a: 'Yes — we\'re a registered 501(c)(3) nonprofit and every donor receives a receipt for tax purposes.' },
            { q: 'How much goes directly to programs?', a: 'We publish our full breakdown on this page — most of every dollar goes straight to program delivery, not overhead.' },
            { q: 'Can I volunteer instead of donating?', a: 'Absolutely — see the Our Impact page for ways to get involved, or reach out directly.' },
          ]),
        ],
      },
      {
        id: 'tab-impact', title: 'Our Impact',
        hero: { title: 'Our impact so far', subtitle: 'None of this happens without our donors, volunteers and partners.' },
        blocks: [
          iconBlock('np11', 'users', 'l', '#2f9e44', '#ffffff', 'center', 3),
          iconBlock('np12', 'globe', 'l', '#94d82d', '#ffffff', 'center', 3),
          iconBlock('np13', 'star', 'l', '#2f9e44', '#ffffff', 'center', 3),
          iconBlock('np14', 'target', 'l', '#94d82d', '#ffffff', 'center', 3),
          counter('np15', 'People served', 0, 12400, { suffix: '+' }, 3),
          counter('np16', 'Volunteer hours logged', 0, 8600, { suffix: '+' }, 3),
          counter('np17', 'Communities reached', 0, 24, {}, 3),
          counter('np18', 'Years of service', 0, 15, {}, 3),
          text('np19', 'Get involved', 'Whether it\'s a one-time gift, a monthly pledge or your time as a volunteer, every contribution moves our mission forward.'),
          button('np20', 'Donate now', 'primary', 'left', urlTarget('https://example.com/donate'), 4),
        ],
      },
    ],
  },
};

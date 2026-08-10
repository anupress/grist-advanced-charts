import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'marketing',
  name: 'Marketing',
  tagline: 'Campaigns, reach and conversions',
  config: {
    version: 1,
    theme: { paletteId: 'sunset', fontId: 'geometric', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Bright Spark Marketing', slogan: 'Campaigns that actually convert',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Our Work', tab: 'tab-work' }],
    },
    footer: { text: '© 2026 Bright Spark Marketing.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Our Work', tab: 'tab-work' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Campaigns that actually convert 🚀', subtitle: 'A live view of every campaign\'s reach, engagement and return.' },
        blocks: [
          stat('mk1', 'Active Campaigns', 'Column', 'count', 'target', { compact: true }),
          stat('mk2', 'Total Reach', 'Column', 'sum', 'globe', { compact: true }),
          stat('mk3', 'Avg. Conversion Rate', 'Column', 'avg', 'trending', { decimals: 1, percent: true }),
          stat('mk4', 'Client Retention', 'Column', 'avg', 'users', { decimals: 0, percent: true }),
          chart('mk5', 'Campaign performance over time', 'line', ['Category'], ['Value'], { smooth: true }, 8),
          chart('mk6', 'Reach by channel', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('mk7', 'Conversions by campaign type', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('mk8', 'ROI by client', 'bar', ['Category'], ['Value'], { agg: 'avg', sortByValue: true }, 6),
          text('mk9', 'How we work', 'We report the same numbers to you that we track internally — no vanity metrics. This page pulls straight from our own campaign records.'),
          accordion('mk10', 'Frequently asked questions', [
            { q: 'What\'s your onboarding process?', a: 'We start with a strategy call to understand your goals, then propose a plan within a week — no long contracts required upfront.' },
            { q: 'How do you report results?', a: 'You get a live dashboard like this one, updated continuously, plus a monthly strategy review.' },
            { q: 'Do you require long-term contracts?', a: 'No — we work month-to-month by default. We\'d rather earn your business every month than lock you in.' },
          ]),
        ],
      },
      {
        id: 'tab-work', title: 'Our Work',
        hero: { title: 'Results we\'re proud of', subtitle: 'A track record built one campaign at a time.' },
        blocks: [
          iconBlock('mk11', 'target', 'l', '#ff6b6b', '#ffffff', 'center', 3),
          iconBlock('mk12', 'trending', 'l', '#ffa94d', '#ffffff', 'center', 3),
          iconBlock('mk13', 'users', 'l', '#ff6b6b', '#ffffff', 'center', 3),
          iconBlock('mk14', 'star', 'l', '#ffa94d', '#ffffff', 'center', 3),
          counter('mk15', 'Campaigns launched', 0, 620, { suffix: '+' }, 3),
          counter('mk16', 'Average ROI', 0, 340, { suffix: '%' }, 3),
          counter('mk17', 'Happy clients', 0, 128, {}, 3),
          counter('mk18', 'Industry awards', 0, 9, {}, 3),
          text('mk19', 'Let\'s talk growth', 'Tell us about your goals and we\'ll show you exactly how we\'d approach them — no obligation.'),
          button('mk20', 'Book a strategy call', 'primary', 'left', urlTarget('https://example.com/contact'), 4),
        ],
      },
    ],
  },
};

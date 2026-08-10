import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'developers',
  name: 'Developers',
  tagline: 'API usage, uptime and adoption — dark by default',
  config: {
    version: 1,
    theme: { paletteId: 'midnight', fontId: 'mono', mode: 'dark' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Voidstack Labs', slogan: 'APIs and tools developers actually enjoy',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Product', tab: 'tab-product' }],
    },
    footer: { text: '© 2026 Voidstack Labs.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Product', tab: 'tab-product' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Built for developers, not decks', subtitle: 'Live API usage, uptime and adoption — the numbers we actually watch.' },
        blocks: [
          stat('dv1', 'API Requests Today', 'Column', 'sum', 'code', { compact: true }),
          stat('dv2', 'Uptime', 'Column', 'avg', 'pulse', { decimals: 2, percent: true }),
          stat('dv3', 'Active Integrations', 'Column', 'count', 'database', { compact: true }),
          stat('dv4', 'GitHub Stars', 'Column', 'sum', 'star', { compact: true }),
          chart('dv5', 'Request volume over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('dv6', 'Requests by endpoint', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('dv7', 'Error rate by service', 'bar', ['Category'], ['Value'], { agg: 'avg', sortByValue: true }, 6),
          chart('dv8', 'Latency by region', 'column', ['Category'], ['Value'], { agg: 'avg' }, 6),
          text('dv9', 'Status, not marketing', 'This page reads straight from our own metrics table — the same one our on-call engineers watch. No spin, just numbers.'),
          accordion('dv10', 'Frequently asked questions', [
            { q: 'What are the rate limits?', a: 'Free tier is capped per minute per key; paid tiers scale with usage. Full limits are documented in our API reference.' },
            { q: 'How does authentication work?', a: 'Bearer tokens over HTTPS — generate a key from your dashboard, no OAuth dance required for server-to-server calls.' },
            { q: 'Where do I report an issue?', a: 'Open an issue on our GitHub repo or reach the team directly — most bugs get a first response within a day.' },
          ]),
        ],
      },
      {
        id: 'tab-product', title: 'Product',
        hero: { title: 'Why teams choose us', subtitle: 'Fast, documented, and built to not surprise you.' },
        blocks: [
          iconBlock('dv11', 'code', 'l', '#7c83ff', '#ffffff', 'center', 3),
          iconBlock('dv12', 'database', 'l', '#22d3ee', '#ffffff', 'center', 3),
          iconBlock('dv13', 'globe', 'l', '#7c83ff', '#ffffff', 'center', 3),
          iconBlock('dv14', 'target', 'l', '#22d3ee', '#ffffff', 'center', 3),
          counter('dv15', 'Years in production', 0, 7, {}, 3),
          counter('dv16', 'Developers building with us', 0, 54000, { suffix: '+' }, 3),
          counter('dv17', 'GitHub stars', 0, 9200, { suffix: '+' }, 3),
          counter('dv18', 'Countries', 0, 61, {}, 3),
          text('dv19', 'Start building', 'Get an API key and make your first call in under five minutes — no sales call required.'),
          button('dv20', 'Read the docs', 'primary', 'left', urlTarget('https://example.com/docs'), 4),
        ],
      },
    ],
  },
};

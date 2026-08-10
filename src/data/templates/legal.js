import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'legal',
  name: 'Legal',
  tagline: 'Caseload, outcomes and practice areas',
  config: {
    version: 1,
    theme: { paletteId: 'mono', fontId: 'serifmix', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Ashcroft & Wells LLP', slogan: 'Trusted counsel, clear results',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Practice Areas', tab: 'tab-practice' }],
    },
    footer: { text: '© 2026 Ashcroft & Wells LLP. Attorney advertising.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Practice Areas', tab: 'tab-practice' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Trusted counsel, clear results', subtitle: 'An internal, live view of our caseload, outcomes and client base.' },
        blocks: [
          stat('lg1', 'Active Cases', 'Column', 'count', 'database', { compact: true }),
          stat('lg2', 'Clients Served', 'Column', 'count', 'users', { compact: true }),
          stat('lg3', 'Practice Areas', 'Column', 'count', 'layout', { compact: true }),
          stat('lg4', 'Years Established', 'Column', 'count', 'star', { compact: true }),
          chart('lg5', 'Case volume over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('lg6', 'Cases by practice area', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('lg7', 'Cases by outcome', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('lg8', 'Client satisfaction by matter type', 'bar', ['Category'], ['Value'], { agg: 'avg' }, 6),
          text('lg9', 'Our approach', 'We believe clients deserve clarity, not jargon. This dashboard is for internal tracking — click <b>Edit</b> to connect it to your firm\'s own case management data in Grist.'),
          accordion('lg10', 'Frequently asked questions', [
            { q: 'How do I schedule a consultation?', a: 'Use the contact button on the Practice Areas page, or call our office directly — most consultations are scheduled within a week.' },
            { q: 'What are your fees?', a: 'Fee structures vary by practice area; we discuss this openly during your initial consultation before any engagement begins.' },
            { q: 'Is my information confidential?', a: 'Yes — everything you share is protected by attorney-client privilege from the moment we speak.' },
          ]),
        ],
      },
      {
        id: 'tab-practice', title: 'Practice Areas',
        hero: { title: 'Practice areas', subtitle: 'Where our attorneys focus their expertise.' },
        blocks: [
          iconBlock('lg11', 'database', 'l', '#495057', '#ffffff', 'center', 3),
          iconBlock('lg12', 'users', 'l', '#868e96', '#ffffff', 'center', 3),
          iconBlock('lg13', 'layout', 'l', '#495057', '#ffffff', 'center', 3),
          iconBlock('lg14', 'shield', 'l', '#868e96', '#ffffff', 'center', 3),
          counter('lg15', 'Cases won', 0, 480, { suffix: '+' }, 3),
          counter('lg16', 'Years combined experience', 0, 65, { suffix: '+' }, 3),
          counter('lg17', 'Attorneys', 0, 14, {}, 3),
          counter('lg18', 'Client retention rate', 0, 96, { suffix: '%' }, 3),
          text('lg19', 'Speak with an attorney', 'Every matter starts with a conversation. Reach out to discuss your case in confidence — there\'s no obligation.'),
          button('lg20', 'Schedule a consultation', 'primary', 'left', urlTarget('https://example.com/contact'), 4),
        ],
      },
    ],
  },
};

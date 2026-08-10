import { stat, chart, text, accordion, counter, iconBlock, button, urlTarget } from './_helpers.js';

export const TEMPLATE = {
  id: 'higher-education',
  name: 'Higher Education',
  tagline: 'Enrollment, programs and outcomes',
  config: {
    version: 1,
    theme: { paletteId: 'berry', fontId: 'serifmix', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Fairmont State University', slogan: "Educating tomorrow's leaders",
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Academics', tab: 'tab-academics' }],
    },
    footer: { text: '© 2026 Fairmont State University.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Academics', tab: 'tab-academics' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: "Educating tomorrow's leaders 🎓", subtitle: 'A live look at enrollment, programs and student outcomes across our campus.' },
        blocks: [
          stat('he1', 'Enrolled Students', 'Column', 'count', 'users', { compact: true }),
          stat('he2', 'Graduation Rate', 'Column', 'avg', 'trending', { decimals: 0, percent: true }),
          stat('he3', 'Faculty Members', 'Column', 'count', 'star', { compact: true }),
          stat('he4', 'Degree Programs', 'Column', 'count', 'layout', { compact: true }),
          chart('he5', 'Enrollment over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('he6', 'Enrollment by department', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('he7', 'Student satisfaction by program', 'column', ['Category'], ['Value'], { agg: 'avg', sortByValue: true }, 6),
          chart('he8', 'Graduates by year', 'bar', ['Category'], ['Value'], {}, 6),
          text('he9', 'Our mission', 'We\'re committed to accessible, rigorous education that prepares students for meaningful careers. This page tracks our progress live, straight from our own records.'),
          accordion('he10', 'Frequently asked questions', [
            { q: 'How do I apply?', a: 'Applications open every fall — visit the Academics page for deadlines and requirements, or request information directly.' },
            { q: 'Is financial aid available?', a: 'Yes — most of our students receive some form of financial aid. Our admissions office can walk you through your options.' },
            { q: 'Can I visit campus?', a: 'Campus tours run year-round — reach out to schedule one, virtual or in person.' },
          ]),
        ],
      },
      {
        id: 'tab-academics', title: 'Academics',
        hero: { title: 'Academics & campus life', subtitle: 'A community built around discovery and growth.' },
        blocks: [
          iconBlock('he11', 'star', 'l', '#ae3ec9', '#ffffff', 'center', 3),
          iconBlock('he12', 'globe', 'l', '#e64980', '#ffffff', 'center', 3),
          iconBlock('he13', 'users', 'l', '#ae3ec9', '#ffffff', 'center', 3),
          iconBlock('he14', 'database', 'l', '#e64980', '#ffffff', 'center', 3),
          counter('he15', 'Years of excellence', 0, 87, {}, 3),
          counter('he16', 'Alumni network', 0, 42000, { suffix: '+' }, 3),
          counter('he17', 'Countries represented', 0, 38, {}, 3),
          counter('he18', 'Active research grants', 0, 96, {}, 3),
          text('he19', 'Ready to apply?', 'Take the next step toward your degree — our admissions team is here to help at every stage.'),
          button('he20', 'Request information', 'primary', 'left', urlTarget('https://example.com/apply'), 4),
        ],
      },
    ],
  },
};

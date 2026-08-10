import {
  stat, chart, text, accordion, counter, iconBlock, button, urlTarget,
  spacer, progress, image, testimonials, breakdown, mapBlock, livetable, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'higher-education',
  name: 'Higher Education',
  tagline: 'Enrollment, programs and outcomes',
  config: {
    version: 1,
    theme: { paletteId: 'berry', fontId: 'serifmix', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Anupress University', slogan: "Educating tomorrow's leaders",
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Academics', tab: 'tab-academics' }, { label: 'Campus Life', tab: 'tab-campus' }],
    },
    footer: { text: '© 2026 Anupress University.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Academics', tab: 'tab-academics' }], showCredit: true },
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
          spacer('he8s', 12),
          progress('he8p', 'Fall enrollment target', 4200, 5000, { color: '#ae3ec9' }, 12),
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
          spacer('he18s', 30),
          text('he19', 'Ready to apply?', 'Take the next step toward your degree — our admissions team is here to help at every stage.'),
          button('he20', 'Request information', 'primary', 'left', urlTarget('https://example.com/apply'), 4),
        ],
      },
      {
        id: 'tab-campus', title: 'Campus Life',
        hero: { title: 'Life on campus', subtitle: 'A closer look at where and how our students learn.' },
        blocks: [
          image('he21', placeholderImage('#ae3ec9', '#e64980'), 'University campus quad', 'Our main quad on a fall afternoon', 6),
          breakdown('he22', 'Enrollment by major', 4),
          mapBlock('he23', 'Campus locations', 12),
          testimonials('he24', 'What our students say', [
            { name: 'Aisha Bello', quote: 'Small classes, real mentorship — I never felt like a number here.', rating: 5, photoData: null },
            { name: 'Daniel Kim', quote: 'The research opportunities as an undergrad changed my career path.', rating: 5, photoData: null },
          ]),
          livetable('he25', 'Course offerings', 12),
          spacer('he25s', 30),
          clockEmbed('he26', 'Campus time'),
        ],
      },
    ],
  },
};

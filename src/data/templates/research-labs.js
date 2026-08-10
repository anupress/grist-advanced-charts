import {
  stat, chart, text, accordion, counter, iconBlock, button, urlTarget,
  spacer, progress, image, testimonials, breakdown, mapBlock, livetable, clockEmbed, placeholderImage,
} from './_helpers.js';

export const TEMPLATE = {
  id: 'research-labs',
  name: 'Research Labs',
  tagline: 'Studies, samples and results at a glance',
  config: {
    version: 1,
    theme: { paletteId: 'ocean', fontId: 'humanist', mode: 'light' },
    dataTable: 'Data',
    header: {
      logoData: null, title: 'Anupress Lab', slogan: 'Advancing science, one study at a time',
      menu: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Research', tab: 'tab-research' }, { label: 'Data & Resources', tab: 'tab-data' }],
    },
    footer: { text: '© 2026 Anupress Lab.', links: [{ label: 'Overview', tab: 'tab-overview' }, { label: 'Research', tab: 'tab-research' }], showCredit: true },
    tabs: [
      {
        id: 'tab-overview', title: 'Overview',
        hero: { title: 'Advancing science, one study at a time 🔬', subtitle: 'A live look at our active studies, sample throughput and published results.' },
        blocks: [
          stat('rl1', 'Active Studies', 'Column', 'count', 'pulse', { compact: true }),
          stat('rl2', 'Samples Processed', 'Column', 'sum', 'database', { compact: true }),
          stat('rl3', 'Publications', 'Column', 'count', 'star', { compact: true }),
          stat('rl4', 'Grant Funding', 'Column', 'sum', 'coins', { compact: true, currency: '$' }),
          chart('rl5', 'Samples processed over time', 'area', ['Category'], ['Value'], { smooth: true }, 8),
          chart('rl6', 'Studies by phase', 'doughnut', ['Category'], ['Value'], {}, 4),
          chart('rl7', 'Results by research area', 'column', ['Category'], ['Value'], { sortByValue: true }, 6),
          chart('rl8', 'Funding by source', 'pie', ['Category'], ['Value'], {}, 6),
          spacer('rl8s', 12),
          progress('rl8p', 'Annual grant funding goal', 340000, 500000, { suffix: '$', color: '#1c7ed6' }, 12),
          text('rl9', 'About this dashboard', 'This page tracks our lab\'s studies, sample pipeline and publications live from our own records. Click <b>Edit</b> to connect it to your lab\'s Grist tables — every card here reconfigures to your columns in a couple of clicks.'),
          accordion('rl10', 'Frequently asked questions', [
            { q: 'How is participant data protected?', a: 'All identifiable data stays inside our own Grist document — this dashboard reads it directly in your browser and never sends it to a third-party server.' },
            { q: 'How often is this updated?', a: 'As soon as a record changes in the underlying table, republishing this page reflects it immediately.' },
            { q: 'Can I share this with collaborators?', a: 'Yes — publish it and share the link. Viewers see a live, read-only dashboard; only lab members with edit access can change it.' },
          ]),
        ],
      },
      {
        id: 'tab-research', title: 'Research',
        hero: { title: 'Our research areas', subtitle: 'Where we focus our time, funding and collaborations.' },
        blocks: [
          iconBlock('rl11', 'target', 'l', '#1c7ed6', '#ffffff', 'center', 3),
          iconBlock('rl12', 'globe', 'l', '#22b8cf', '#ffffff', 'center', 3),
          iconBlock('rl13', 'database', 'l', '#1c7ed6', '#ffffff', 'center', 3),
          iconBlock('rl14', 'users', 'l', '#22b8cf', '#ffffff', 'center', 3),
          counter('rl15', 'Years of research', 0, 18, { suffix: '+' }, 3),
          counter('rl16', 'Peer-reviewed papers', 0, 142, { suffix: '+' }, 3),
          counter('rl17', 'Active collaborators', 0, 36, {}, 3),
          counter('rl18', 'Countries represented', 0, 12, {}, 3),
          spacer('rl18s', 30),
          text('rl19', 'Partner with us', 'We collaborate with universities, hospitals and industry partners on funded studies. Reach out if you\'d like to discuss a joint research proposal.'),
          button('rl20', 'Contact our research office', 'primary', 'left', urlTarget('https://example.com/contact'), 4),
        ],
      },
      {
        id: 'tab-data', title: 'Data & Resources',
        hero: { title: 'Explore our data', subtitle: 'A closer look at how our studies and sites break down.' },
        blocks: [
          image('rl21', placeholderImage('#1c7ed6', '#22b8cf'), 'Lab bench with research equipment', 'Our main wet-lab facility', 6),
          breakdown('rl22', 'Studies by category', 4),
          mapBlock('rl23', 'Research sites', 12),
          testimonials('rl24', 'What our collaborators say', [
            { name: 'Elena Ruiz, PhD', quote: 'The clearest, fastest-moving research partnership we\'ve had.', rating: 5, photoData: null },
            { name: 'Sam Okafor, PhD', quote: 'Their data practices make joint studies painless.', rating: 5, photoData: null },
          ]),
          livetable('rl25', 'Recent samples', 12),
          spacer('rl25s', 30),
          clockEmbed('rl26', 'Lab time'),
        ],
      },
    ],
  },
};

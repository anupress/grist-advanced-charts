// The prebuilt demo site (this is "what we built previously"). It references the bundled
// Sales table. When a real user starts editing, this is also the sensible starting template
// before they remap blocks onto their own tables/columns.

export const SITE_VERSION = 1;

// Lightweight gradient "photo" used only to demo the hero slider (no bundled image files).
const demoSlide = (c1, c2) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="420" fill="url(#g)"/><circle cx="1010" cy="70" r="240" fill="#fff" opacity="0.08"/><circle cx="160" cy="380" r="190" fill="#fff" opacity="0.06"/></svg>`);

const stat = (id, label, column, agg, icon, fmt, span = 3) =>
  ({ id, type: 'stat', span, config: { table: 'Sales', label, column, agg, icon, format: fmt, deltaBy: 'Month' } });

const chart = (id, title, chartType, dims, measures, extra = {}, span = 6) =>
  ({ id, type: 'chart', span, config: { table: 'Sales', title, chartType, dims, measures, agg: 'sum', ...extra } });

export const DEFAULT_SITE = {
  version: SITE_VERSION,
  theme: { paletteId: 'aurora', fontId: 'system', mode: 'light' },
  dataTable: 'Sales',
  header: {
    logoData: null, // null => ANUPRESS brand mark
    title: 'Anupress Analytics',
    slogan: "Let's build something amazing",
    menu: [
      { label: 'Overview', tab: 'tab-overview' },
      { label: 'Trends', tab: 'tab-trends' },
      { label: 'Breakdown', tab: 'tab-breakdown' },
      { label: 'Team', tab: 'tab-team' },
    ],
  },
  footer: {
    text: '© 2026 Anupress Analytics.',
    links: [ { label: 'Overview', tab: 'tab-overview' }, { label: 'Trends', tab: 'tab-trends' } ],
    showCredit: true,
  },
  tabs: [
    {
      id: 'tab-overview', title: 'Overview',
      hero: { title: 'Welcome back 👋', subtitle: 'A clear, friendly snapshot of how the business is performing this year.' },
      blocks: [
        stat('s1', 'Total Revenue', 'Revenue', 'sum', 'coins', { compact: true, currency: '$' }),
        stat('s2', 'Units Sold', 'Units', 'sum', 'cart', { compact: true }),
        stat('s3', 'Total Profit', 'Profit', 'sum', 'trending', { compact: true, currency: '$' }),
        stat('s4', 'Avg Satisfaction', 'Satisfaction', 'avg', 'star', { decimals: 1 }),
        chart('c1', 'Revenue over time', 'area', ['Month'], ['Revenue'], { smooth: true }, 8),
        chart('c2', 'Revenue by category', 'doughnut', ['Category'], ['Revenue'], {}, 4),
        chart('c3', 'Profit by region', 'column', ['Region'], ['Profit'], { sortByValue: true }, 6),
        chart('c4', 'Units by channel', 'column', ['Channel'], ['Units'], {}, 6),
      ],
    },
    {
      id: 'tab-trends', title: 'Trends',
      hero: { title: 'Trends & momentum', subtitle: 'Track how revenue, profit and satisfaction move through the year.' },
      blocks: [
        chart('t1', 'Revenue & profit by month', 'line', ['Month'], ['Revenue', 'Profit'], { smooth: true }, 12),
        chart('t2', 'Revenue by category & region', 'column', ['Category', 'Region'], ['Revenue'], { stacked: true }, 6),
        chart('t3', 'Satisfaction by category', 'radar', ['Category'], ['Satisfaction'], { agg: 'avg' }, 6),
      ],
    },
    {
      id: 'tab-breakdown', title: 'Breakdown',
      hero: { title: 'The full breakdown', subtitle: 'Slice the numbers by product, channel and margin.' },
      blocks: [
        chart('b1', 'Revenue share by channel', 'pie', ['Channel'], ['Revenue'], {}, 4),
        chart('b2', 'Revenue by product', 'treemap', ['Product'], ['Revenue'], {}, 8),
        chart('b3', 'Units vs revenue', 'scatter', ['Category'], ['Units', 'Revenue'], {}, 6),
        chart('b4', 'Average margin by category', 'bar', ['Category'], ['Margin'], { agg: 'avg', sortByValue: true }, 6),
        { id: 'b5', type: 'text', span: 12, config: { heading: 'About this report',
          html: 'These figures are illustrative demo data. Click <b>Edit</b> to connect your own Grist table, choose any columns, pick chart types and colors, and publish your own version — your data never leaves your browser.' } },
      ],
    },
    {
      id: 'tab-team', title: 'Team',
      hero: {
        title: 'Meet the team', subtitle: 'People, not revenue', align: 'left', vAlign: 'bottom', size: 'xl',
        autoplay: true, interval: 5,
        slides: [
          { image: demoSlide('#6d5efc', '#16c4a6'), title: 'Meet the team', subtitle: 'People, not revenue' },
          { image: demoSlide('#16c4a6', '#ff8a5b'), title: 'Any table works', subtitle: 'Text, choice, date, number, yes/no' },
          { image: demoSlide('#7048e8', '#e64980'), title: 'Map your data', subtitle: 'Plot lat / long with clustering' },
        ],
      },
      blocks: [
        { id: 'm1', type: 'stat', span: 3, config: { table: 'People', label: 'Headcount', column: 'Name', agg: 'count', icon: 'users', format: {} } },
        { id: 'm2', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Age', column: 'Age', agg: 'avg', icon: 'pulse', format: { decimals: 0 } } },
        { id: 'm3', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Salary', column: 'Salary', agg: 'avg', icon: 'coins', format: { compact: true, currency: '$' } } },
        { id: 'm4', type: 'stat', span: 3, config: { table: 'People', label: 'Avg Performance', column: 'Rating', agg: 'avg', icon: 'star', format: { decimals: 1 } } },
        { id: 'm5', type: 'chart', span: 6, config: { table: 'People', title: 'Headcount by department', chartType: 'column', dims: ['Department'], measures: ['Name'], agg: 'count', sortByValue: true } },
        { id: 'm6', type: 'chart', span: 6, config: { table: 'People', title: 'Gender split', chartType: 'doughnut', dims: ['Gender'], measures: ['Name'], agg: 'count' } },
        { id: 'm7', type: 'chart', span: 6, config: { table: 'People', title: 'Average salary by department', chartType: 'bar', dims: ['Department'], measures: ['Salary'], agg: 'avg', sortByValue: true } },
        { id: 'm8', type: 'chart', span: 6, config: { table: 'People', title: 'Performance by role', chartType: 'column', dims: ['Role'], measures: ['Rating'], agg: 'avg' } },
        { id: 'm10', type: 'breakdown', span: 4, config: { table: 'People', title: 'Department', column: 'Department', limit: 12, subtitle: '%groups departments' } },
        { id: 'm11', type: 'breakdown', span: 4, config: { table: 'People', title: 'City', column: 'City', limit: 12 } },
        { id: 'm12', type: 'breakdown', span: 4, config: { table: 'People', title: 'Gender', column: 'Gender', limit: 12, display: 'chart', chartType: 'doughnut' } },
        { id: 'm13', type: 'map', span: 12, config: { table: 'People', title: 'Where the team is', subtitle: '%count team members mapped · %missing without coordinates', latColumn: 'Latitude', lonColumn: 'Longitude', labelColumn: 'Name', colorBy: 'Department', popupColumns: ['Role', 'City', 'Salary'] } },
        { id: 'm9', type: 'chart', span: 12, config: { table: 'People', title: 'Age vs salary by department', chartType: 'scatter', dims: ['Department'], measures: ['Age', 'Salary'], agg: 'avg' } },
      ],
    },
  ],
};

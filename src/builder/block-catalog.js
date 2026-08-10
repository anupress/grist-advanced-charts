// Pure data describing every block type offered in the "Add Element" chooser, grouped into
// categories a non-technical user can scan quickly. chooser.js reads this list generically —
// new block types (later phases) are added here only, nothing in chooser.js needs to change.

export const CATEGORIES = [
  { id: 'data', label: 'Data & Metrics' },
  { id: 'content', label: 'Content' },
  { id: 'basic', label: 'Basic Elements' },
  { id: 'advanced', label: 'Advanced' },
];

export const BLOCK_CATALOG = [
  {
    type: 'stat', category: 'data', icon: 'trending', title: 'Stat card',
    desc: 'A single KPI number with trend',
    info: 'Shows one big number calculated from your data — like total revenue or signups — with an optional comparison to a previous period (e.g. "↑ 12% vs last month").',
  },
  {
    type: 'chart', category: 'data', icon: 'barchart', title: 'Chart',
    desc: 'Bar, line, pie, scatter and more',
    info: 'Visualizes your data as a bar, line, pie, doughnut, scatter, radar, funnel, treemap or gauge. Pick your columns and ANUPRESS recommends the best chart type.',
  },
  {
    type: 'breakdown', category: 'data', icon: 'database', title: 'Breakdown',
    desc: 'Group-wise counts with % and colored dots',
    info: 'Lists each group in a column (e.g. every Region or Category) with its count, share of the total, and a colored dot — like a simple leaderboard.',
  },
  {
    type: 'map', category: 'data', icon: 'globe', title: 'Map',
    desc: 'Plot lat/long points on a map',
    info: 'Plots each row as a point on a map using latitude/longitude columns from your table — handy for store locations, event sites or any geographic data.',
  },
  {
    type: 'text', category: 'content', icon: 'type', title: 'Text',
    desc: 'A heading and rich text',
    info: 'A heading plus a block of formatted text — for introductions, explanations or any freeform writing.',
  },
];

export function blockCatalogEntry(type) { return BLOCK_CATALOG.find((b) => b.type === type) || null; }

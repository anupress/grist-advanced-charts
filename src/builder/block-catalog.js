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
    type: 'progress', category: 'data', icon: 'progress', title: 'Progress bar',
    desc: 'A fill bar toward a goal',
    info: 'Shows a value moving toward a target as a filled bar — e.g. "$45,000 of $50,000 raised". The value can be typed in or calculated from your data.',
  },
  {
    type: 'text', category: 'content', icon: 'type', title: 'Text',
    desc: 'A heading and rich text',
    info: 'A heading plus a block of formatted text — for introductions, explanations or any freeform writing.',
  },
  {
    type: 'image', category: 'content', icon: 'image', title: 'Image',
    desc: 'A photo, from an upload or your data',
    info: 'Add an image by uploading it yourself, or — if a table has a Grist Attachments column — pull a specific photo straight from your data (e.g. each row\'s headshot or product photo).',
  },
  {
    type: 'counter', category: 'content', icon: 'counter', title: 'Counter',
    desc: 'A number that counts up on scroll',
    info: 'A start and end number you set yourself (not calculated from data) that animates upward once it scrolls into view — a classic "1,250+ happy customers" effect.',
  },
  {
    type: 'accordion', category: 'content', icon: 'accordion', title: 'Accordion',
    desc: 'Expandable question & answer list',
    info: 'A list of questions that expand to reveal an answer when clicked — perfect for an FAQ section.',
  },
  {
    type: 'button', category: 'basic', icon: 'buttonEl', title: 'Button',
    desc: 'A clickable call-to-action',
    info: 'A button that links to another page on your site or an external URL — e.g. "Learn more" or "Visit our shop".',
  },
  {
    type: 'icon', category: 'basic', icon: 'sparkles', title: 'Icon',
    desc: 'A single decorative or linked icon',
    info: 'A standalone icon in a colored badge — purely decorative, or optionally clickable like a button.',
  },
  {
    type: 'spacer', category: 'basic', icon: 'spacer', title: 'Spacer',
    desc: 'Blank vertical space',
    info: 'Adds empty vertical space between other elements — invisible on the page, just adjusts the gap.',
  },
];

export function blockCatalogEntry(type) { return BLOCK_CATALOG.find((b) => b.type === type) || null; }

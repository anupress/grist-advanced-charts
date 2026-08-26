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
    type: 'stat', star: true, category: 'data', icon: 'trending', title: 'Stat card',
    desc: 'A single KPI number with trend',
    info: 'Shows one big number calculated from your data — like total revenue or signups — with an optional comparison to a previous period (e.g. "↑ 12% vs last month").',
  },
  {
    type: 'chart', star: true, category: 'data', icon: 'barchart', title: 'Chart',
    desc: 'Bar, line, pie, scatter and more',
    info: 'Visualizes your data as a bar, line, pie, doughnut, scatter, radar, funnel, treemap or gauge. Pick your columns and ANUPRESS recommends the best chart type.',
  },
  {
    type: 'breakdown', star: true, category: 'data', icon: 'database', title: 'Breakdown',
    desc: 'Group-wise counts with % and colored dots',
    info: 'Lists each group in a column (e.g. every Region or Category) with its count, share of the total, and a colored dot — like a simple leaderboard.',
  },
  {
    type: 'map', star: true, category: 'data', icon: 'globe', title: 'Map',
    desc: 'Plot lat/long points on a map',
    info: 'Plots each row as a point on a map using latitude/longitude columns from your table — handy for store locations, event sites or any geographic data.',
  },
  {
    type: 'progress', category: 'data', icon: 'progress', title: 'Progress bar',
    desc: 'A fill bar toward a goal',
    info: 'Shows a value moving toward a target as a filled bar — e.g. "$45,000 of $50,000 raised". The value can be typed in or calculated from your data.',
  },
  {
    type: 'livetable', star: true, category: 'data', icon: 'layout', title: 'Data table',
    desc: 'A searchable, sortable table of rows',
    info: 'Shows the raw rows of a table, with search, click-to-sort columns and paging — handy for browsing a full list rather than a summary.',
  },
  {
    type: 'invoice', star: true, category: 'data', icon: 'download', title: 'Invoice',
    desc: 'Turn a row into a document you can send',
    info: 'Pick an invoice from your table and this renders it as a finished document — your details, the client\'s, the lines and the totals — ready to print or save as PDF. Works with a single Amount column, or itemises properly if you keep line items in their own table.',
  },
  {
    type: 'calendar', star: true, category: 'data', icon: 'calendar', title: 'Calendar',
    desc: 'A month view of rows by date, drag to reschedule',
    info: 'Plots a table\'s rows on a month calendar by a date column. On a live page, dragging an event to a new day writes the new date back to your Grist table — and picks up edits made directly in Grist on its own, without needing a page refresh.',
  },
  {
    type: 'text', star: true, category: 'content', icon: 'type', title: 'Text',
    desc: 'A heading and rich text',
    info: 'A heading plus a block of formatted text — for introductions, explanations or any freeform writing.',
  },
  {
    type: 'image', star: true, category: 'content', icon: 'image', title: 'Image',
    desc: 'A photo, from an upload or your data',
    info: 'Add an image by uploading it yourself, or — if a table has a Grist Attachments column — pull a specific photo straight from your data (e.g. each row\'s headshot or product photo).',
  },
  {
    type: 'counter', category: 'content', icon: 'counter', title: 'Counter',
    desc: 'A number that counts up on scroll',
    info: 'A start and end number you set yourself (not calculated from data) that animates upward once it scrolls into view — a classic "1,250+ happy customers" effect.',
  },
  {
    type: 'testimonials', category: 'content', icon: 'users', title: 'Testimonials',
    desc: 'A grid of quotes and star ratings',
    info: 'A wall of quotes with names, star ratings and photos — type them in yourself, or pull them straight from a table of reviews/feedback.',
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
  {
    type: 'divider', category: 'basic', icon: 'divider', title: 'Divider',
    desc: 'A thin line to separate sections',
    info: 'A simple horizontal rule to visually separate content — choose solid, dashed or dotted, and pick a color and thickness.',
  },
  {
    type: 'countdown', category: 'basic', icon: 'countdown', title: 'Countdown timer',
    desc: 'A live countdown to a date & time',
    info: 'Counts down to a date and time you set — days, hours, minutes and seconds tick live in the visitor\'s browser. Good for deadlines, launches or offer end-dates.',
  },
  {
    type: 'qrcode', category: 'basic', icon: 'qrcode', title: 'QR code',
    desc: 'A scannable code for a link or text',
    info: 'Generates a QR code for a link or any text, entirely in the visitor\'s browser — nothing is sent anywhere to create it, matching this widget\'s zero-third-party-calls design.',
  },
  {
    type: 'barcode', category: 'basic', icon: 'barcode', title: 'Barcode',
    desc: 'Code 128, EAN-13, EAN-8 or UPC-A',
    info: 'Generates a scannable barcode at a real physical size, in the browser. Code 128 takes any text and suits asset tags and internal references; EAN and UPC take the digits printed on retail packaging. Sized in millimetres rather than pixels, because a linear barcode that gets scaled no longer scans.',
  },
  {
    type: 'timeline', category: 'content', icon: 'timeline', title: 'Timeline',
    desc: 'A vertical list of dated milestones',
    info: 'A vertical list of milestones, each with a date, title and short description — good for a history, roadmap or process overview.',
  },
  {
    type: 'pricing', category: 'content', icon: 'pricing', title: 'Pricing table',
    desc: 'Side-by-side plans with features & a CTA',
    info: 'Side-by-side plan cards, each with a price, a list of features and its own call-to-action button — optionally highlight one as the recommended plan.',
  },
  {
    type: 'embed', category: 'advanced', icon: 'code', title: 'HTML/CSS/JS',
    desc: 'Your own custom code, sandboxed',
    info: 'For advanced users: write your own HTML, CSS and JavaScript, rendered in a sandboxed frame that cannot access your Grist data or this widget\'s settings.',
  },
];

export function blockCatalogEntry(type) { return BLOCK_CATALOG.find((b) => b.type === type) || null; }

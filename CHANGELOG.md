# Changelog

All notable changes to Advanced Charts (Grist widget by ANUPRESS).
This project uses [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

## [3.2.0] — 2026-09-05

The block that turns a dashboard someone looks at into one they can ask a
question of. Asked for on the community thread as "something closer to a BI
tool".

### Added

- **Slicer block.** A row of chips or a menu built from one column. Pick a value
  and every other block on the page narrows to match — the KPI cards and their
  trend deltas, the charts, the table, the map, the calendar. Twenty-four block
  types now.

  Deciding *which* blocks a slicer should reach was the hard part, and the rules
  are the ones the request itself proposed, composed: a block is filtered if it
  reads the slicer's table, or a table with a column of the same name, or a
  table joined to it by a reference column in either direction — Grist's own
  "select by", which the reference work in 3.1.0 made possible. Anything else is
  left whole. The editor shows the answer live ("Filters 9 blocks on this page:
  …") before a reader ever asks, and the author can name the blocks explicitly
  instead.

  Several slicers AND together; values within one OR. Selections are session
  state — a reader's exploration is never written into the design. No block
  renderer changed: every block already reads through one provider call, and a
  slicer hands each block a provider that returns fewer rows.
- **The demo checks its own coverage.** A test now fails if any block type in the
  catalog is missing from the demo site, or if the pricing card's "All N block
  types" disagrees with the catalog. It happened once by hand; not again.

## [3.1.0] — 2026-08-26

Barcodes, printing onto label stock, and a long-standing bug in how reference
columns were displayed — which turned out to affect every block that groups or
labels by a column.

### Added

- **Barcode block** — Code 128, EAN-13, EAN-8 and UPC-A, bringing the library to
  23 block types. Encoded in the browser like the QR code beside it, and **sized
  in millimetres rather than pixels**: a linear barcode is read by timing bar
  widths against the narrowest one, so a symbol the browser scaled to fit is a
  symbol that no longer scans. It overflows visibly instead. EAN and UPC compute
  the check digit, so a number pastes in with or without it.
- **Any page size for Print/PDF.** Four office sizes, four label stocks (business
  card, shipping, address, small), a size you type, and an adjustable margin.
  Label stock defaults to no margin, because a die-cut label has no waste edge.
- **Repeat a printout once per record.** Pick a table and the selected blocks
  repeat per row, 1 to 6 across or one per page — a sheet of labels, or every
  unpaid invoice in one run. Blocks that mean something for a single row are
  rebound (an Invoice is told which row it is, a barcode or QR interpolates
  `%Column`); a chart of a whole table is left alone.
- **A test suite in the repository**, run in CI before every deploy: 117
  assertions across barcodes, references, the data editor's view logic, and the
  integrity of all ten shipped designs.

### Fixed

- **Reference columns showed the row id instead of what they point at.** A client
  called Meridian Biotech read as "2", a Reference List as "L,1,2", and a chart
  grouped by a reference drew one bar per number. Now resolved through the
  document's own visible column, in tables, charts, breakdowns, calendars and
  maps. One whole-table fetch per referenced table, never one per row.
- **ChoiceList was never handled at all** — a multi-select tag column rendered as
  "L,Urgent,Billable". Attachments shared the fault and now show a file count.
- **The data editor could write a broken cell.** Reference, Reference List,
  ChoiceList and Attachments columns were editable as free text, so editing one
  sent Grist a string where it expected a row id or a list. They are read-only
  now, alongside formula columns, and say which reason applies.
- **Search, filters and sorting agree with what is on screen.** Searching a
  client's name could not match the id in the cell, and clicking a column heading
  sorted by insertion order.
- **Printed pages could be narrower than the paper.** The sheet carried a fixed
  12mm inset while its contents were sized to the full page width, so on an 85mm
  card every block hung 24mm off the edge.
- **Page counts were wrong for side-by-side blocks.** Pagination added every
  item's height in sequence, but two half-width blocks occupy one row of paper
  between them.
- **The block width control** sat below the block it changed and was destroyed by
  its own click. It sits above it now, holds open while you try sizes, and has
  Keep and Cancel.

## [3.0.0] — 2026-08-13

The release that turns the widget from a chart tool into a page builder. v2 could
draw your data; v3 can publish it — 22 block types, nine industry starter designs
that install their own tables, printable layouts, and a demo site that teaches
the whole thing before you connect a document.

### Added

- **Seventeen new block types**, bringing the library to 22.
  *Live Data Table* (search, sort, paginate, cell highlighting), *Calendar* with
  two-way Grist sync, *Invoice* (turns one row into a document you can send, in
  four styles), *Image* (upload or Grist attachment column), *Testimonials*,
  *Progress bar*, *Counter*, *Accordion*, *Timeline*, *Pricing table*,
  *Countdown*, *QR code*, *Button*, *Icon*, *Divider*, *Spacer*, and a sandboxed
  *HTML/CSS/JS Embed* that is deliberately given no access to your document.
- **Nine industry starter templates** — Research Labs, Nonprofits, Legal, Higher
  Education, Marketing, Finance & Accounting, Developers, Small Business, Sports
  Facility. Each is a complete multi-page design, not a layout sketch: it ships
  realistic sample data, and applying it to a live document **creates the tables
  it needs** and maps its blocks onto tables you already have where the names
  match. Two carry explicit privacy rules — student rows are anonymised for
  FERPA, donor rows are shown as initials — because publishing is the point.
- **The demo dashboard is itself a template.** The design the widget opens with is
  on the list, so you can get back to it, and it is the one that covers every
  block type and all 11 chart types on a page where each makes sense.
- **Start from scratch.** A genuinely blank design, which never touches your own
  tables or data — only the demo tables the widget created.
- **A 509-icon library** across 28 categories, with search, 227 aliases, and a
  full-window grid browser for when you would rather look than type.
- **Printable layouts.** Collect blocks while browsing, arrange them by span,
  and print — on white, with real page margins, tables unpaginated so a 200-row
  ledger prints as 200 rows rather than one screenful.
- **Editing data from the block**, not just its settings, with a full-screen mode,
  search, multi-select filters and sorting for large tables.
- **A Settings menu** gathering theme, design, pages, header and templates behind
  one button, and warning before a template overwrites work you have done.
- **Six more palettes and two more font pairings** (16 and 7), every one of them
  checked to 4.5:1 contrast in both light and dark.
- **A Refresh button** that is a real re-read of the document.

### Changed

- **The demo site was rebuilt to teach.** Six pages that explain each capability
  where it is used, rather than showing off in the abstract.
- **Every control is keyboard-operable**, decorative markup is no longer announced
  to screen readers, sortable table headers are real buttons carrying `aria-sort`.
- **Dates are read and written in the column's own timezone**, not the browser's.
- Charts pick the shape the question needs: funnels can be built from staged
  measures, categories are never silently dropped, and axis labels rotate rather
  than overlap.

### Fixed

- **Critical: the built widget overwrote Leaflet.** The obfuscator hoists its
  string-array helpers to the top level of the program, outside esbuild's IIFE,
  and named one of them `L` — Leaflet's global. Maps then threw from inside a
  forEach, which aborted the whole render and could leave a template install
  frozen partway through. The output is wrapped, generated names are prefixed,
  and Leaflet is captured before anything can take it.
- **One failing block no longer takes the page with it.** Mount steps and
  individual maps are isolated, and a design naming tables this document does not
  have is skipped with one warning instead of a stream of sandbox errors.
- **Security: the Text block no longer executes markup from the config table.**
- **Highlighted cells addressed the wrong columns** in four shipped templates —
  spreadsheet letters index the table's column order, not the block's.
- Saving no longer blanks the page; applying a template no longer flips your
  theme or hijacks the data table; the same template installed twice says so.
- Config is resolved from whichever of the two stores is newer, so a design no
  longer appears to revert.
- The Edit button silently failed on GitHub Pages until `.nojekyll` was added.
- Print output: margins on every page, maps and numbers where a reader expects
  them, invoices on white with branding inherited from the site.

### Performance

- The calendar only polls while it is actually on screen.
- Bookkeeping writes read the config table once instead of twice, and opening the
  editor no longer refetches every table in the document.

## [2.0.0] — 2026

### Fixed
- **Critical: "Add a block" crashed silently on self-hosted Grist.**
  The obfuscator's `transformObjectKeys` option was mangling object literal keys
  (`{ class:'…', onClick:fn }`), which broke the reflective `el()` helper in the
  built widget. Clicks fired, but the follow-up drawer never opened. Removed the
  risky obfuscation options (`transformObjectKeys`, `controlFlowFlattening`,
  `deadCodeInjection`) and hardened `el()` so any future name-mangling can no
  longer crash a whole render.
- **"Add a block" chooser text now stacks correctly.**
  Title and description are on their own lines regardless of flex support.

### Added
- **Guided chart wizard — "Not sure? Let me help".**
  New top item in the block chooser. Opens a 3-step wizard in plain language:
  1. Which table? 2. What do you want to compare? (X) 3. What number do you want
  to see? (Y — leave blank to just count entries). Then it suggests the best chart
  type for your columns, shows a live preview, and adds the finished chart to the
  page. Built for people who don't know statistics.

### Performance
- **Grist schema fetches cached for the session.**
  `_grist_Tables` and `_grist_Tables_column` are now fetched once and reused
  across every `getColumns()` call — cuts a 9-table doc from 18 metadata
  round-trips down to 2 on load.

## [1.0.0] — 2026

Initial public release. Features included at launch:

- Website-style shell: header (logo, title, slogan), tabbed body, footer with
  always-on "Built with ANUPRESS" credit.
- **Stat cards** with KPI + trend delta + sparkline, custom icon uploads.
- **Charts** (Apache ECharts): column, bar, line, area, pie, doughnut, treemap,
  funnel, radar, scatter, gauge — with column-type recommendations and a live
  preview in the editor.
- **Breakdown** blocks: group-wise counts with coloured dots + %, or shown as a
  donut / pie / bar / column chart.
- **Map** block: Leaflet with marker clustering, lat/long auto-detection, up to
  4 tooltip fields, Street/Satellite/Terrain layers.
- **Text** blocks with heading + rich text.
- **Hero / image slider** per page, fully designable (align, size, font, colour,
  vertical position, on/off).
- **Dynamic subtitles** with live placeholders (`%count`, `%total`, `%groups`…).
- **Pages & menu**: multi-page dashboards with URL-only menu items.
- **Theme**: 10 palettes, custom primary/accent, font pairs, light/dark toggle.
- **Global Design panel**: corners, density, content width, shadows, text size.
- **Privacy**: everything runs in the browser; design saves into a single
  `ANUPRESS_Config` table in the user's own document; no ANUPRESS server.

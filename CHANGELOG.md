# Changelog

All notable changes to Advanced Charts (Grist widget by ANUPRESS).
This project uses [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

## [3.7.0] — 2026-09-07

### Added

- **Several dashboards in one document.** Every widget instance used to read
  the one design row, so two widgets in a document could only mirror each
  other (asked for on the community forum: Operations and Finance wanted
  their own). A dashboard is now a key in the same config table — the
  default keeps `site`, the key it always had; others are `site:<id>` with
  chunks under `site:<id>~…` — and each widget instance remembers which one
  it shows in its own widget options, which Grist keeps per instance, so a
  viewer with plain read access still lands on the right one. Settings →
  Dashboards lists them, makes a new one as a copy of the current design or
  as a blank page, points this widget at another, renames, and deletes with
  a two-click confirmation; the main dashboard cannot be deleted. Switching
  keeps the design being left (published on a live document, remembered
  for the session in the demo), reloads the target's tables, and starts a
  fresh undo history. A widget pointed at a dashboard that no longer exists
  falls back to the main one. Existing documents read exactly as before.

## [3.6.0] — 2026-09-07

### Added

- **Layout & style on every block.** A collapsible section at the foot of all
  twenty-six editors: margin and padding per side, a minimum height, row span
  on the page (column span, row span and alignment inside a Grid cell), order,
  background, border, corner radius, shadow, hide on phones / tablets /
  desktops, a CSS id and classes, and a z-index. It edits a small `style`
  object beside the block's `config`, so no block's own settings or behaviour
  change; a block from before this existed reads exactly as it did. While
  editing, a block hidden on the current screen stays visible, faded and
  labelled, so it can still be reached. Reset clears the lot; undo brings it
  back.
- **Widget block: another custom widget inside this page.** Paste any Grist
  custom widget's URL, the one you would give Grist. A message host carries
  its plugin API calls to the document and back with request ids kept clear
  of this widget's own, so Grist still sees one widget. Three things are
  answered in the widget rather than forwarded, because Grist keeps one of
  each per frame: `ready`, the column request (`grist.ready({ columns })`),
  and widget options, which get their own key per block instead of landing
  in this widget's store. The editor lists the columns the nested widget asks
  for, learned from its own `ready` call in the live preview, with a picker
  each; the block reads the table you choose or follows the table this
  dashboard is linked to in Grist, change notifications included. A small
  example widget ships in `examples/nested-widget.html` and appears on the
  demo's Page elements page. Twenty-six block types now.
- **HTML/CSS/JS with Grist access.** A switch on the embed editor loads the
  plugin API ahead of the author's code, so an inline block can be a custom
  widget written in place, with the same table choice and column mapping as
  the Widget block. Off by default; the sandbox is unchanged either way.

- **Adding to a printout is a visible moment.** The block gives a short
  press, a token flies from it to the tray in the corner, and the count bumps
  when it lands, so nobody wonders where the block went. The tray slides in
  the first time something is added, and its count is read out by screen
  readers. Under reduced motion the token is skipped; the outline and the
  count still change.

### Fixed

- **Full document access is asked for once, when the URL is pasted.** The
  widget used to ask Grist for read access at load and for full access from
  the Edit flow, but the plugin API ignores every `ready()` after the first,
  so that second request never reached Grist: the prompt on pasting said
  "needs to read the current table", and full access could only be set by
  hand in the widget panel. Now the one request asks for full access, the
  level Grist actually grants is read back from its settings message, and a
  widget still without it gets a plain instruction naming the dropdown to
  change instead of a silent failure.

### Changed

- **Embed height up to 4000 px** (was 1200), so a whole form or page embedded
  as a widget shows at its real height instead of scrolling inside a frame
  inside the page.
- **Block width inside a section.** In a Grid cell the cell sets the width, so
  the Block width row is shown disabled there, with the reason and a pointer
  to Column span under Layout & style. On the page it is unchanged.
- **Nested widgets see references as what they point at.** A block reading a
  table of its own hands a nested widget the referenced table's visible column
  (a client's name, not its row id), lists included, as Grist's own
  `fetchSelectedTable` does by default; `cellFormat: 'typed'` keeps the ids.
- **Nested widgets follow the page's theme outside Grist.** Before Grist has
  sent a theme (and in the demo, where it never will), a nested widget is
  given this page's own colours in Grist's theme shape, and again whenever
  the light/dark switch is used.
- **Widget block frames load when their page is shown**, the way charts mount,
  rather than every nested widget on every page loading at once.

## [3.5.0] — 2026-09-06

### Added

- **Add Section.** The tile at the end of every page now says Add Section and
  opens with a row of layouts: 1×2 (a slicer above a chart), 2×1, 2×2, 3×2,
  3×3, 4×2, or custom. Pick one and the grid lands on the page with the chooser
  already open for its first cell, so "a slicer over a chart" is three clicks.
  The single-element list sits right below, unchanged, for the one-block case.
  Inside a cell the chooser is titled "Add to this cell" and offers no grid.
- **Undo, redo and a history panel.** Two arrows in the edit bar and Ctrl+Z /
  Ctrl+Y (Ctrl+Shift+Z), which stay out of text fields. Every change the editor
  makes was already reported through one function; each now becomes a step with
  a plain-language label — "Added slicer to a cell", "Changed theme",
  "Reordered pages". A burst of marks from one gesture, typing a title or
  dragging a slider, collapses into one step. The History button lists the
  steps newest first, marks the current one and the last saved one, and
  clicking any step restores it; the later steps stay until a new change
  replaces them. The list lives while the editor is open and clears when Done
  closes it. Going back to the saved step clears the unsaved flag, so Done
  does not republish a design that was undone back to what was published.

## [3.4.0] — 2026-09-06

### Added

- **Grid block: a panel with its own rows and columns.** Choose one to four
  columns and one to four rows and put a block in each cell — four small stat
  cards in one panel, a chart beside its notes, a 3×3 of icons. Cells can stay
  empty, a title turns the grid into a card, and the gap between cells is
  compact, normal or roomy. Twenty-five block types now.

  A block in a cell is the block it would be on the page: same editor, same
  hover controls, same chart mount, and the same slicer narrowing, because
  every cell hands its block its own provider. Every walk over a page's blocks
  now goes through one helper that also sees inside grids, so a slicer reaches
  a chart in a cell, a live document primes the table a stat in a cell reads,
  a nested block can be collected for a printout on its own, and the editor
  finds it by id. One level only: a grid does not offer a grid, and dragging
  stays a page-level affair (blocks in cells have no drag handle).

  Shrinking a grid keeps each block in its row and column where both still
  exist, moves the displaced ones into free cells, and says in the editor how
  many would be removed before it happens. The demo's Page elements page now
  keeps its eight icons and counters in one 4×2 grid, and the "Block types"
  counter there is checked against the catalog by the test suite, having sat
  at 21 through three additions.

## [3.3.1] — 2026-09-06

The table snapshot now fills the whole space beside the drawer, from the left
edge to the drawer and from under the edit bar to the bottom, and shows as many
rows and columns as that space holds instead of six by eight. A card in the
corner read as a tooltip; the question is "what is in this table?", and the
answer is as much of it as fits. Also fixed: a table whose rows all fit printed
the word "null" under itself, a null child handed to replaceChildren.

## [3.3.0] — 2026-09-06

### Added

- **A look at the table while choosing it.** Every "Data table" chooser in the
  block editors, the guided wizard's first step and the template table setup
  now show a snapshot on the left of the page for the table under the mouse
  or the keyboard: its columns with their types, the first six rows with
  references resolved to names, and a line saying how much is not shown. It is
  a look, not a control: the panel takes no clicks, so the mouse can pass over
  it on the way to anything else.

  The chooser itself is no longer a native select. A native select's open list
  belongs to the browser and reports nothing until a choice is made, so it
  cannot say which entry the mouse is over. The replacement keeps arrow keys,
  Home and End, Escape, and closing on a click outside, and it lands on the
  current table when it opens, so the first snapshot shown is the one already
  chosen. On a live document a table not yet read says "Loading rows…" and
  fills in when they arrive. Asked for after choosing between Members, People
  and Contacts by name alone, twice, and guessing wrong once.

## [3.2.5] — 2026-09-06

Three faults in the block editors' column pickers, found while a reader tried
to choose columns for a Data table.

### Fixed

- **Column pills did not show their own state.** Clicking "+" on a column
  added it to the block (the preview further down changed) but the pill kept
  its "+", so the column looked unselectable. The data table editor was the
  worst case because it never rebuilt the list. Pills now repaint on click and
  carry `aria-pressed`.
- **Invoice address lines could not be chosen.** The "Address lines" picker's
  handler expected one id and an on/off flag while the picker reports the whole
  selection, so every click was a no-op.
- **"Edit the data in …" kept naming the table the editor opened with** after
  the table dropdown was changed. The button already opened the right table;
  only the label lagged. It follows the picker now.

## [3.2.4] — 2026-09-06

The widget now says which build it is. After 3.2.3 went live, a reader's
browser kept serving the previous bundle from cache (GitHub Pages allows ten
minutes), and nothing on screen or in the console could settle whether the fix
had arrived. Now the boot line in the console reads
`[ANUPRESS] Advanced Charts v3.2.4 · live document`, the Settings panel ends
with the same version, `index.html` carries it in a meta tag, and the bundle is
loaded as `app.js?v=3.2.4`, so a fresh index can never pair with a stale bundle
from the build before it.

## [3.2.3] — 2026-09-06

Picking **Slicer** in the Add Element chooser opened "Add chart". Reported on the
community thread within a day of 3.2.0.

The builder's per-type starting shapes were a hand-maintained chain of branches
ending in the chart fallback, and neither the slicer nor the barcode had been
given one, so both new types fell through to it. Editing an existing slicer was
fine, which is why the demo (whose slicer is part of the design) never showed
it. The defaults now live in their own module with a branch for every catalog
entry, an unknown type throws instead of quietly becoming a chart, and a test
holds the defaults against the catalog: a block type can no longer be added to
the chooser without a starting shape. A new slicer starts on a Choice column
where the table has one, then a reference column, then the first text-like
column, so its chips appear the moment the editor opens.

## [3.2.2] — 2026-09-05

Embedded in a web page's iframe without `?demo`, the widget stayed blank.
`connect()` took `grist.ready()` resolving as proof of a Grist host, but
`ready()` returns nothing: it posts "ready" to whatever the parent window is
and returns at once, so inside any iframe the app went live and its first real
request waited for a host that was never there. The handshake is now what a
Grist host actually does on ready, at every access level: it answers with a
message. No answer within four seconds means no Grist, and the demo is drawn.
`?demo=1` still skips the wait and remains the right flag for an embed. The
timed wrapper also clears its timer now, which stops the test process idling
for two minutes after its last assertion.

## [3.2.1] — 2026-09-05

A widget list for self-hosted Grist. `manifest.json` now follows the schema of
Grist's own gallery and lists both ANUPRESS widgets, Advanced Charts and
Invoice Studio, with absolute URLs. A Grist started with `GRIST_WIDGET_LIST_URL`
pointing at `https://anupress.github.io/grist-advanced-charts/manifest.json`
offers both in its Custom widget picker with nothing to paste. The previous
file had a relative URL and a key Grist does not read, so it listed nothing
anywhere.

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

# Changelog

All notable changes to Advanced Charts (Grist widget by ANUPRESS).
This project uses [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`.

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

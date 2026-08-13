# Advanced Charts — a custom widget for Grist (by ANUPRESS)

[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-0F1B2D.svg)](CHANGELOG.md)
[![Live demo](https://img.shields.io/badge/live_demo-try_it-16a34a.svg)](https://anupress.github.io/grist-advanced-charts/?demo=1)

Turn any Grist table into a website-style dashboard: pages of KPI cards, charts, searchable data
tables, invoices, calendars and maps, edited in place like a page builder. 22 block types, 10
one-click industry templates, printable report layouts — and no server anywhere. Everything runs
in the viewer's browser, and your data never leaves your Grist document.

Paste this into Grist (**Add widget → Custom → Enter Custom URL**):

```
https://anupress.github.io/grist-advanced-charts/
```

[![The Advanced Charts demo dashboard](https://anupress.com/wp-content/uploads/2026/08/grist-dashboard-widget-demo.webp)](https://anupress.github.io/grist-advanced-charts/?demo=1)

## Try it without Grist

The full editor runs in a plain browser tab against bundled sample data — nothing is saved anywhere:

- **[Live demo](https://anupress.github.io/grist-advanced-charts/?demo=1)** — the six-page guided tour
- **[Auto-cycling demo](https://anupress.github.io/grist-advanced-charts/?demo=1&tour=7)** — the same, switching pages by itself
- **Any template, directly:** add `&template=<id>` to the demo URL, e.g.
  [`finance-accounting`](https://anupress.github.io/grist-advanced-charts/?demo=1&template=finance-accounting),
  [`research-labs`](https://anupress.github.io/grist-advanced-charts/?demo=1&template=research-labs),
  [`developers`](https://anupress.github.io/grist-advanced-charts/?demo=1&template=developers)

## What's inside

**22 block types**, grouped the way the Add Element panel groups them:

| Group | Blocks |
|---|---|
| Data & Metrics | Stat card (KPI + trend + sparkline) · Chart (11 types via Apache ECharts) · Breakdown · Map (Leaflet, clustering) · Progress bar · Data table (search/sort/paging/highlight ranges) · Invoice (a row rendered as a printable document) · Calendar (drag to reschedule, writes back to Grist) |
| Content | Text · Image (upload or Grist attachment) · Counter · Testimonials · Accordion · Timeline · Pricing table |
| Basic | Button · Icon (509-icon library) · Spacer · Divider · Countdown timer · QR code (generated locally) |
| Advanced | HTML/CSS/JS embed, sandboxed so it can never read your data |

**10 starter templates** install a complete multi-page dashboard plus sample tables, each table
either created with sample data or mapped onto one of your own (read-only, with column matching):
Research Labs, Nonprofits, Legal, Higher Education, Marketing, Finance & Accounting, Developers,
Small Business, Sports Facility, and the demo dashboard itself. Switching templates offers to clean
up the tables the widget created earlier — never yours.

**And around the blocks:** a guided chart wizard for people who don't know statistics, printable
layouts (collect blocks from any page, arrange on A4/US Letter, print or save as PDF), an in-page
data editor (fix a value or add a row without leaving the dashboard, one undoable step), 16 colour
palettes and 7 font pairings, dark mode, full keyboard operation, and dates that respect each
column's own timezone.

## Use it in Grist

1. In your document, add a widget and choose **Custom**.
2. Paste the widget URL (above) into **Enter Custom URL**.
3. Explore the demo that loads — nothing has touched your document yet.
4. Click **Edit** → read and **Accept** the consent screen → grant **full access** when Grist asks.
   Full access is what lets blocks read any table and lets your design be saved.
5. Install a template from **Settings → Templates**, or add blocks yourself, then **Save & Publish**.

Your design is stored inside your own document: in the widget's options, mirrored in a small
`ANUPRESS_Config` table (the newer of the two wins, so older documents keep working). To reset,
use **Settings → Templates → Start from scratch**.

## Privacy, stated plainly

ANUPRESS has no server. The widget is a static page; every chart, table, invoice and QR code is
computed in the viewer's browser, and nothing is ever transmitted to us or anyone else. The one
exception: a **Map** block loads its background tiles from a public tile provider (OpenStreetMap /
Esri / OpenTopo), so that provider sees the viewer's IP and the viewed area — never any table data.
The HTML embed block runs in a sandboxed frame that cannot reach your document. The first time you
click **Edit**, a consent screen states all of this before anything happens.

## Documentation

- **[The complete guide](https://anupress.com/advanced-charts-grist-widget-guide/)** — setup, every feature, theming, printing, publishing, FAQ
- **[The template library, toured](https://anupress.com/grist-dashboard-templates/)** — what each of the 10 templates includes and who it's for
- **[The blocks tutorial](https://anupress.com/grist-tutorial-dashboard-blocks/)** — all 22 blocks, setting by setting, for beginners
- **[Changelog](CHANGELOG.md)**

## Host it yourself

Any static host works — the widget is plain files with no backend. Fork this repo and enable
GitHub Pages (the bundled [workflow](.github/workflows/deploy.yml) builds `dist/` and deploys it),
or serve the built output from your own web server, then paste **your** URL into Grist instead.
Self-hosted Grist works the same as hosted Grist.

## Local development

No build step and no dependencies — `index.html` loads `src/` directly as native ES modules, and
all third-party libraries are vendored in [`vendor/`](vendor/). You only need a static file server:

```powershell
# Windows — dependency-free server bundled with the repo (honors the PORT env var):
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
# then open http://127.0.0.1:4178/?demo=1
```

Or any static server: `npx serve`, `python -m http.server`, VS Code Live Server, …

Useful while developing:

- `?demo=1` — force demo mode (skip the Grist handshake) so the editor runs in a plain tab
- `?demo=1&template=<id>` — boot straight into a template with its sample data
- `?tour=<seconds>` — auto-cycle the pages
- Maps offline show a grid instead of tiles; everything else works without internet

The production build (`node build.mjs`: esbuild bundle + minify + obfuscation into `dist/`) runs in
CI on every push — you never need it locally.

Repo map: `src/` widget code (entry: `main.js`) · `src/data/templates/` the 10 templates and their
sample data · `src/render/` block renderers · `src/builder/` the editor · `vendor/` vendored libs ·
`scripts/serve.ps1` dev server · `examples/` a CSV to import for testing with real tables.

## Feedback & feature requests

Open a [GitHub issue](https://github.com/anupress/grist-advanced-charts/issues), or use the
[feature request form](https://anupress.com/advanced-charts-grist-widget-guide/#feedback) on the
guide — the wizard, the templates and the print layouts all started as user requests.

## License

[MIT](LICENSE) © 2026 ANUPRESS · Bundled libraries keep their own licenses — see
[THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES.md).

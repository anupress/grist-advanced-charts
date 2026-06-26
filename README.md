# Advanced Charts — a custom widget for Grist (by ANUPRESS)

Turn any Grist table into a polished, website-style dashboard — a **header**, a **footer**, and a
**tabbed body** of KPI cards, every chart type, group breakdowns and maps — edited in place,
drag‑and‑drop style, like a page builder. Your design is saved into a table inside your own Grist
document, so it is yours, portable, and reloads automatically.

📖 **Full guide:** [anupress.com/advanced-charts-grist-widget-guide](https://anupress.com/advanced-charts-grist-widget-guide/)

> **Privacy first.** ANUPRESS has no server. Everything runs in your browser. ANUPRESS never
> receives, stores, or transmits your data — your data stays inside your Grist document. The first
> time you click **Edit**, you’ll see a consent screen that states exactly this and names the one
> table it will create.

---

## What it does

- **Header** — your logo (upload your own or use the ANUPRESS mark), site title, slogan, and an
  in‑page tab menu that switches sections with **no page reload**. An **Edit** button sits on the right.
- **Hero** — a gradient banner with your headline, or a **full‑width image slider** (captions +
  auto‑play, capped at 340px tall).
- **Body** — one or more **tabs**, each holding a grid of **blocks**:
  - **Stat cards** — a KPI number, trend vs. the previous period, and a sparkline. Use a built‑in
    icon or **upload your own**.
  - **Charts** — powered by Apache ECharts: column, bar, line, area, pie, doughnut, treemap,
    funnel, radar, scatter and gauge. Works with **any** data — sales, people/bio, inventory,
    anything. Pick any columns; the editor enables the chart types that fit those column types and
    shows a **live preview** as you choose.
  - **Text** — a heading and rich text.
- **Footer** — your text and in‑page links, with the “Built with ANUPRESS” credit on the right.
- **Theme** — ready‑made color palettes, custom primary/accent colors, font pairings and dark mode.

## Use it in Grist

1. In your Grist document, add a widget and choose **Custom**.
2. Paste the widget URL into **Enter Custom URL**.
3. The widget loads and shows a **demo** built from bundled sample data (a Sales dataset and a
   People dataset, to show it works with any kind of table).
4. Click **Edit** → read and **Accept** the ANUPRESS consent screen → grant **full access** when
   Grist asks. ANUPRESS creates an `ANUPRESS_Config` table in your document and lets you build your
   site against your real tables and columns.
5. Click **Save & Publish**. Your design is stored in `ANUPRESS_Config`; it reloads next time.

Want to try with real data first? Import the example table in [`examples/`](examples/)
(`ANUPRESS_DummyData.csv`).

## Local development

You only need a static file server (no Node/Python required).

```powershell
# Windows — dependency-free PowerShell server bundled with the repo:
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
# then open http://127.0.0.1:4178/?demo=1
```

Or any static server (`npx serve`, `python -m http.server`, VS Code Live Server, …).

**Heads-up on maps offline:** the Map block fetches tiles from public servers
(OpenStreetMap / Esri / OpenTopo). Without internet, the map controls, markers
and popups still render, but you'll see a light grid background instead of tiles.
No widget data is ever sent — only the requested map view.

## How your design is stored

- `ANUPRESS_Config` — one row (`Key = "site"`) whose `Value` is the JSON describing your whole site
  (theme, header, footer, hero/slides, tabs and blocks, your logo and any uploaded icons). It is
  mirrored into the widget’s options for fast reloads.

It lives in **your** document. Delete it and the widget falls back to the demo.

## License

MIT © ANUPRESS

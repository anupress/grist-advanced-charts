// Guided chart wizard — for people who don't know statistics.
// Three plain-language steps, then a preview with the recommended chart.
// Uses the same recommend engine as the chart editor, so the "best fit" is consistent.

import { el, clone, uid, debounce } from '../util.js';
import { icon, chartIcon } from '../assets/icons.js';
import { openDrawer, closeDrawer, primaryBtn, ghostBtn, subhead, divider } from './ui.js';
import { evaluateTypes, isMeasure, isTemporal, isDimension } from '../charts/recommend.js';
import { getChartType, CHART_TYPES } from '../charts/catalog.js';
import { renderChart } from '../charts/echarts-adapter.js';

// A single wizard state, held in closure.
export function openGuidedWizard({ provider, onCreate }) {
  const state = {
    step: 1,               // 1..4
    table: provider.defaultTable(),
    xCol: null,            // dimension (or temporal) column id
    yCol: null,            // measure column id (null → just count rows)
    chartType: null,       // set on step 4, editable
  };
  render();

  function render() {
    openDrawer({
      title: 'Not sure what to build? — I\'ll help',
      body: [stepIndicator(), stepBody()],
      footer: stepFooter(),
    });
  }

  function stepIndicator() {
    return el('div', { class: 'ap-wiz-steps' }, [1, 2, 3, 4].map((i) =>
      el('span', { class: 'ap-wiz-step' + (i === state.step ? ' is-current' : (i < state.step ? ' is-done' : '')) },
        [String(i)])));
  }

  function stepFooter() {
    const isLast = state.step === 4;
    const canNext = { 1: !!state.table, 2: !!state.xCol, 3: true, 4: !!state.chartType }[state.step];
    const nextLabel = isLast ? 'Add to page' : 'Next';
    const nextIcon = isLast ? 'check' : 'chevron';
    return [
      state.step > 1 ? ghostBtn('Back', () => { state.step--; render(); }) : ghostBtn('Cancel', () => closeDrawer()),
      el('button', { class: 'ap-btn ap-btn--primary' + (canNext ? '' : ' is-disabled'),
        disabled: !canNext,
        onClick: () => canNext && (isLast ? finish() : (state.step++, prepareStep(), render())) },
        [icon(nextIcon), nextLabel]),
    ];
  }

  function prepareStep() {
    if (state.step === 4 && !state.chartType) recomputeRecommendation();
  }

  function stepBody() {
    if (state.step === 1) return step1_pickTable();
    if (state.step === 2) return step2_pickX();
    if (state.step === 3) return step3_pickY();
    return step4_previewAndPick();
  }

  // ---------------- Step 1 — pick a table ----------------
  function step1_pickTable() {
    const tables = provider.tables();
    return el('div', {}, [
      el('h3', { class: 'ap-wiz-q', text: 'Which data do you want to show?' }),
      el('p', { class: 'ap-wiz-hint', text: 'Pick the table that has the numbers or entries you want to display.' }),
      el('div', { class: 'ap-wiz-list' }, tables.map((t) => {
        const cols = provider.columns(t.id);
        return el('button', { class: 'ap-wiz-item' + (state.table === t.id ? ' is-selected' : ''),
          onClick: () => { state.table = t.id; state.xCol = null; state.yCol = null; state.chartType = null; render(); } }, [
          el('span', { class: 'ap-wiz-item__title', text: t.label || t.id }),
          el('span', { class: 'ap-wiz-item__meta', text: `${cols.length} column${cols.length === 1 ? '' : 's'}` }),
        ]);
      })),
    ]);
  }

  // ---------------- Step 2 — pick X ----------------
  function step2_pickX() {
    const cols = provider.columns(state.table);
    const groups = [
      { title: 'By time (great for trends)', cols: cols.filter(isTemporal) },
      { title: 'By category', cols: cols.filter((c) => isDimension(c) && !isTemporal(c)) },
    ].filter((g) => g.cols.length);
    return el('div', {}, [
      el('h3', { class: 'ap-wiz-q', text: 'What do you want to compare?' }),
      el('p', { class: 'ap-wiz-hint', html: 'This becomes the groups along the bottom (or side) of your chart — e.g. <b>Region</b>, <b>Month</b>, <b>Category</b>.' }),
      ...groups.flatMap((g) => [
        subhead(g.title),
        el('div', { class: 'ap-wiz-list ap-wiz-list--compact' }, g.cols.map((c) =>
          el('button', { class: 'ap-wiz-item' + (state.xCol === c.id ? ' is-selected' : ''),
            onClick: () => { state.xCol = c.id; state.chartType = null; render(); } }, [
            el('span', { class: 'ap-wiz-item__title', text: c.label || c.id }),
            el('span', { class: 'ap-wiz-item__type', text: friendlyType(c) }),
          ]))),
      ]),
      groups.length === 0 ? el('p', { class: 'ap-muted', text: 'No category columns found. Try a different table.' }) : null,
    ]);
  }

  // ---------------- Step 3 — pick Y ----------------
  function step3_pickY() {
    const cols = provider.columns(state.table);
    const measures = cols.filter(isMeasure);
    return el('div', {}, [
      el('h3', { class: 'ap-wiz-q', text: 'What number do you want to see?' }),
      el('p', { class: 'ap-wiz-hint', html: 'Sum, average or count of this column — for each group in step 2. <b>Not sure?</b> Leave it blank and we\'ll just count how many entries per group.' }),
      el('button', { class: 'ap-wiz-item' + (!state.yCol ? ' is-selected' : ''),
        onClick: () => { state.yCol = null; state.chartType = null; render(); } }, [
        el('span', { class: 'ap-wiz-item__title', text: 'Just count entries' }),
        el('span', { class: 'ap-wiz-item__type', text: 'no maths needed' }),
      ]),
      subhead('Or pick a number column'),
      el('div', { class: 'ap-wiz-list ap-wiz-list--compact' }, measures.length ? measures.map((c) =>
        el('button', { class: 'ap-wiz-item' + (state.yCol === c.id ? ' is-selected' : ''),
          onClick: () => { state.yCol = c.id; state.chartType = null; render(); } }, [
          el('span', { class: 'ap-wiz-item__title', text: c.label || c.id }),
          el('span', { class: 'ap-wiz-item__type', text: friendlyType(c) }),
        ])) : [el('div', { class: 'ap-muted', style: { padding: '6px 2px' }, text: 'No number columns in this table — that\'s fine, "count entries" works too.' })]),
    ]);
  }

  // ---------------- Step 4 — recommendation + preview ----------------
  function step4_previewAndPick() {
    if (!state.chartType) recomputeRecommendation();
    const cols = provider.columns(state.table);
    const evals = evaluateTypes(cols, currentSelection());
    const evMap = Object.fromEntries(evals.map((e) => [e.id, e]));

    const summary = el('div', { class: 'ap-wiz-summary' }, [
      summaryChip(icon('database'), 'Table', provider.tables().find((t) => t.id === state.table)?.label || state.table),
      summaryChip(icon('layout'), 'Compare by', colLabelOf(state.xCol) || '—'),
      summaryChip(icon('barchart'), 'Show', state.yCol ? ('Sum of ' + colLabelOf(state.yCol)) : 'Count of entries'),
    ]);

    const grid = el('div', { class: 'ap-wiz-typegrid' });
    for (const t of CHART_TYPES) {
      const ev = evMap[t.id] || {};
      const cell = el('button', { class: 'ap-typecell' + (state.chartType === t.id ? ' is-active' : ''),
        disabled: !ev.enabled, title: t.label },
        [chartIcon(t.icon), el('span', { text: t.label })]);
      if (ev.recommended) cell.append(el('span', { class: 'ap-rec-star', text: '★', title: 'Best fit' }));
      cell.addEventListener('click', () => { state.chartType = t.id; refreshPreview(); highlightActive(); });
      grid.append(cell);
    }
    function highlightActive() { grid.querySelectorAll('.ap-typecell').forEach((c) => c.classList.toggle('is-active', c.title === getChartType(state.chartType).label)); }

    const previewChart = el('div', { class: 'ap-preview__chart' });
    const preview = el('div', { class: 'ap-preview' }, [previewChart]);
    const refreshPreview = debounce(() => {
      const rows = provider.records(state.table);
      const block = { config: buildBlockConfig() };
      renderChart(previewChart, block, { rows, columns: cols, table: state.table });
    }, 80);
    setTimeout(refreshPreview, 0);

    return el('div', {}, [
      el('h3', { class: 'ap-wiz-q', text: 'Here\'s your chart' }),
      summary, divider(),
      subhead('Recommended chart types (★ best fit for your columns)'),
      grid, divider(),
      subhead('Preview'),
      preview,
    ]);
  }

  function summaryChip(iconEl, label, value) {
    return el('div', { class: 'ap-wiz-chip' }, [iconEl, el('span', {}, [el('b', { text: label + ': ' }), value])]);
  }

  function recomputeRecommendation() {
    const cols = provider.columns(state.table);
    const evals = evaluateTypes(cols, currentSelection());
    const enabled = evals.filter((e) => e.enabled);
    const best = enabled.sort((a, b) => b.score - a.score)[0];
    state.chartType = best ? best.id : (evals[0]?.id || 'column');
  }

  function currentSelection() {
    return { dims: state.xCol ? [state.xCol] : [], measures: state.yCol ? [state.yCol] : [] };
  }

  function buildBlockConfig() {
    const cols = provider.columns(state.table);
    const yIsNumber = state.yCol && !!cols.find((c) => c.id === state.yCol && isMeasure(c));
    const agg = yIsNumber ? 'sum' : 'count';
    const measures = state.yCol ? [state.yCol] : [];
    return {
      table: state.table,
      title: colLabelOf(state.xCol) ? `${state.yCol ? colLabelOf(state.yCol) + ' by ' : 'Entries by '}${colLabelOf(state.xCol)}` : 'Chart',
      chartType: state.chartType,
      dims: state.xCol ? [state.xCol] : [],
      measures,
      agg,
    };
  }

  function colLabelOf(id) {
    if (!id) return null;
    const c = provider.columns(state.table).find((x) => x.id === id);
    return c ? (c.label || c.id) : id;
  }

  function friendlyType(c) {
    if (isTemporal(c)) return 'date';
    if (isMeasure(c)) return 'number';
    return 'text';
  }

  function finish() {
    const config = buildBlockConfig();
    onCreate({ id: uid('blk'), type: 'chart', span: 6, config });
    closeDrawer();
  }
}

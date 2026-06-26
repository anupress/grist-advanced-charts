// Registry of supported chart types and the column "shape" each one needs.
// `fits(shape)` decides whether a type is selectable for the chosen columns;
// `score(shape)` ranks how well it suits them (drives the ★ recommended marker).
//
// shape = { dims, measures, temporal }  (counts of each column role currently selected)

export const CHART_TYPES = [
  { id: 'column',   label: 'Column',   icon: 'column',   group: 'Comparison',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.dims === 1 && s.measures >= 1 ? 9 : 6) },
  { id: 'bar',      label: 'Bar',      icon: 'bar',      group: 'Comparison',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.dims === 1 && s.measures >= 1 ? 8 : 6) },
  { id: 'line',     label: 'Line',     icon: 'line',     group: 'Trend',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.temporal >= 1 ? 10 : 5) },
  { id: 'area',     label: 'Area',     icon: 'area',     group: 'Trend',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.temporal >= 1 ? 9 : 4) },
  { id: 'pie',      label: 'Pie',      icon: 'pie',      group: 'Composition',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.dims === 1 && s.measures === 1 ? 8 : 3) },
  { id: 'doughnut', label: 'Doughnut', icon: 'doughnut', group: 'Composition',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.dims === 1 && s.measures === 1 ? 8 : 3) },
  { id: 'treemap',  label: 'Treemap',  icon: 'treemap',  group: 'Composition',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.dims >= 1 ? 6 : 2) },
  { id: 'funnel',   label: 'Funnel',   icon: 'funnel',   group: 'Composition',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => 4 },
  { id: 'radar',    label: 'Radar',    icon: 'radar',    group: 'Distribution',
    fits: (s) => s.dims >= 1 && s.measures >= 1, score: (s) => (s.measures >= 3 || s.dims >= 3 ? 7 : 3) },
  { id: 'scatter',  label: 'Scatter',  icon: 'scatter',  group: 'Correlation',
    fits: (s) => s.measures >= 2, score: (s) => (s.measures >= 2 ? 9 : 0) },
  { id: 'gauge',    label: 'Gauge',    icon: 'gauge',    group: 'KPI',
    fits: (s) => s.measures >= 1, score: (s) => (s.measures === 1 && s.dims === 0 ? 6 : 2) },
];

export const getChartType = (id) => CHART_TYPES.find((c) => c.id === id) || CHART_TYPES[0];

// Types that read a category dimension + measures the "grouped" way.
export const CARTESIAN = new Set(['column', 'bar', 'line', 'area']);
export const SINGLE_SERIES = new Set(['pie', 'doughnut', 'treemap', 'funnel']);

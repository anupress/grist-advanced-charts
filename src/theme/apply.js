// Applies a theme (palette + font pair + light/dark) onto CSS custom properties.

import { getPalette, getFontPair } from './palettes.js';

export function applyTheme(theme = {}, rootEl) {
  const root = rootEl || document.getElementById('anupress-root') || document.documentElement;
  const style = document.documentElement.style;

  const pal = theme.palette && theme.palette.series ? theme.palette : getPalette(theme.paletteId);
  const fonts = theme.fonts && theme.fonts.head ? theme.fonts : getFontPair(theme.fontId);
  const mode = theme.mode || pal.mode || 'light';

  set(style, '--ap-primary', theme.primary || pal.primary);
  set(style, '--ap-accent', theme.accent || pal.accent);
  (pal.series || []).forEach((c, i) => set(style, `--ap-series-${i + 1}`, c));
  if (theme.primary) set(style, '--ap-series-1', theme.primary);
  if (theme.accent) set(style, '--ap-series-2', theme.accent);
  set(style, '--ap-font-head', fonts.head);
  set(style, '--ap-font-body', fonts.body);

  root.setAttribute('data-mode', mode);
  // expose the active series list for the chart engine
  root._apSeries = pal.series || [];
}

function set(style, k, v) { if (v) style.setProperty(k, v); }

export function currentSeriesColors(rootEl) {
  const root = rootEl || document.getElementById('anupress-root');
  if (root && root._apSeries && root._apSeries.length) return root._apSeries.slice();
  const cs = getComputedStyle(document.documentElement);
  const out = [];
  for (let i = 1; i <= 8; i++) { const c = cs.getPropertyValue(`--ap-series-${i}`).trim(); if (c) out.push(c); }
  return out.length ? out : ['#6d5efc', '#16c4a6', '#ff8a5b', '#ffd166', '#ef476f', '#4cc9f0'];
}

export function readVar(name) {
  const root = document.getElementById('anupress-root') || document.documentElement;
  return getComputedStyle(root).getPropertyValue(name).trim();
}

// Site-wide "design" controls (corners, density, width, shadows, text size). Applied as inline
// vars on the .ap-root element so they win in BOTH light and dark themes. Only set what's chosen.
const DESIGN_SHADOWS = {
  flat: ['0 1px 1px rgba(20,22,40,.05)', '0 2px 5px rgba(20,22,40,.07)', '0 10px 26px rgba(20,22,40,.14)'],
  soft: ['0 1px 2px rgba(20,22,40,.06), 0 1px 1px rgba(20,22,40,.04)', '0 8px 24px rgba(31,34,51,.08), 0 2px 6px rgba(31,34,51,.05)', '0 24px 60px rgba(31,34,51,.16), 0 8px 20px rgba(31,34,51,.08)'],
  bold: ['0 2px 4px rgba(20,22,40,.12)', '0 14px 32px rgba(31,34,51,.18), 0 4px 10px rgba(31,34,51,.10)', '0 30px 70px rgba(31,34,51,.30), 0 12px 28px rgba(31,34,51,.18)'],
};
const FS_KEYS = ['--ap-fs-xs', '--ap-fs-sm', '--ap-fs-md', '--ap-fs-lg', '--ap-fs-xl', '--ap-fs-2xl', '--ap-fs-3xl'];
const FS_BASE = [12, 13, 15, 18, 24, 34, 46];

export function applyDesign(design = {}, rootEl) {
  const root = rootEl || document.getElementById('anupress-root') || document.documentElement;
  const s = root.style;
  if (design.radius != null) {
    s.setProperty('--ap-radius', design.radius + 'px');
    s.setProperty('--ap-radius-sm', Math.max(4, design.radius - 6) + 'px');
    s.setProperty('--ap-radius-lg', (Number(design.radius) + 8) + 'px');
  } else { ['--ap-radius', '--ap-radius-sm', '--ap-radius-lg'].forEach((k) => s.removeProperty(k)); }
  if (design.gap != null) { s.setProperty('--ap-gap', design.gap + 'px'); s.setProperty('--ap-pad', (Number(design.gap) + 4) + 'px'); }
  else { s.removeProperty('--ap-gap'); s.removeProperty('--ap-pad'); }
  if (design.maxw) s.setProperty('--ap-maxw', design.maxw === 'full' ? '100%' : design.maxw + 'px'); else s.removeProperty('--ap-maxw');
  if (design.shadow && DESIGN_SHADOWS[design.shadow]) {
    const [sm, md, lg] = DESIGN_SHADOWS[design.shadow];
    s.setProperty('--ap-shadow-sm', sm); s.setProperty('--ap-shadow', md); s.setProperty('--ap-shadow-lg', lg);
  } else { ['--ap-shadow-sm', '--ap-shadow', '--ap-shadow-lg'].forEach((k) => s.removeProperty(k)); }
  if (design.fontScale && Number(design.fontScale) !== 1) {
    FS_KEYS.forEach((k, i) => s.setProperty(k, Math.round(FS_BASE[i] * design.fontScale) + 'px'));
  } else { FS_KEYS.forEach((k) => s.removeProperty(k)); }
}

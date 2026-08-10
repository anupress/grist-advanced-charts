// Shared block constructors for the industry template library — same shapes as
// data/default-site.js's local stat()/chart() helpers, generalized for reuse across templates.
//
// Every stat/chart's table/column/dims/measures below is a placeholder: applying a template
// always runs adaptConfigToTable() (data/provider.js) first, which overwrites every stat and
// chart block's table/column/dims/measures to point at the user's actual table and columns.
// That remap does NOT touch breakdown or map blocks (their column/latColumn/lonColumn refs
// aren't remapped) — so templates deliberately stick to stat/chart plus the fully-static block
// types for everything else, so every template looks right immediately, before any manual
// reconfiguration, regardless of what the user's real table looks like.

export const stat = (id, label, column, agg, icon, fmt, span = 3) =>
  ({ id, type: 'stat', span, config: { table: 'Data', label, column, agg, icon, format: fmt || {} } });

export const chart = (id, title, chartType, dims, measures, extra = {}, span = 6) =>
  ({ id, type: 'chart', span, config: { table: 'Data', title, chartType, dims, measures, agg: 'sum', ...extra } });

export const text = (id, heading, html, span = 12) =>
  ({ id, type: 'text', span, config: { heading, html } });

export const spacer = (id, height = 40) => ({ id, type: 'spacer', span: 12, config: { height } });

export const accordion = (id, title, items, span = 12, openFirst = true) =>
  ({ id, type: 'accordion', span, config: { title, items, openFirst } });

export const counter = (id, label, start, end, opts = {}, span = 3) =>
  ({ id, type: 'counter', span, config: { label, start, end, duration: 1400, prefix: opts.prefix || '', suffix: opts.suffix || '', decimals: opts.decimals || 0, icon: opts.icon || 'sparkles', iconData: null } });

export const button = (id, label, style, align, target, span = 3) =>
  ({ id, type: 'button', span, config: { label, style, align, target } });

export const iconBlock = (id, iconName, size, bg, color, align, span = 3) =>
  ({ id, type: 'icon', span, config: { icon: iconName, iconData: null, size, color, bg, align, target: { kind: null, tab: null, url: null, newTab: true } } });

export const progress = (id, title, value, target, opts = {}, span = 4) =>
  ({ id, type: 'progress', span, config: { title, mode: 'manual', value, target, table: 'Data', valueColumn: null, agg: 'sum', suffix: opts.suffix || '', color: opts.color || null } });

// A no-op target for buttons/icons that just look clickable in the preview (no real page to
// link to yet, since templates don't know the final tab ids the user will keep/rename).
export const noTarget = { kind: null, tab: null, url: null, newTab: true };
export const urlTarget = (url) => ({ kind: 'url', tab: null, url, newTab: true });
export const tabTarget = (tab) => ({ kind: 'tab', tab, url: null, newTab: true });

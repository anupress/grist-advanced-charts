// The demo dashboard, offered as a starting point like any other.
//
// This is the six-page site the widget opens with — the one people actually explore before they
// decide to use it. It was reachable only as the un-chosen default: once someone applied an
// industry template or started from scratch, the design they had just spent five minutes learning
// was gone, with no way back short of clearing the config by hand.
//
// It earns a place on the list on its own merits. It is the widest design shipped here — all 23
// block types and all 11 chart types, each on a page where it makes sense — so as a starting point
// it is the "everything, then delete what you don't need" option, which is how a lot of people
// prefer to work. It is also the only template whose sample tables cover several shapes at once
// (a Sales fact table, a People directory, a Tasks list, and a three-table invoicing set), so it
// doubles as the way to get realistic multi-table data into an empty document.
//
// The config is DEFAULT_SITE itself rather than a copy. One design, one place to fix it: a copy
// would drift the moment either side was edited, and the demo is also the block library's coverage
// net (see data/default-site.js), so a stale duplicate would quietly stop covering anything.

import { DEFAULT_SITE } from '../default-site.js';

export const TEMPLATE = {
  id: 'demo-dashboard',
  name: 'Demo dashboard',
  tagline: 'The six-page tour this widget opens with — every block and chart type, ready to cut down',
  config: DEFAULT_SITE,
};

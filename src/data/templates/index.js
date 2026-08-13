import { TEMPLATE as demoDashboard } from './demo-dashboard.js';
import { TEMPLATE as researchLabs } from './research-labs.js';
import { TEMPLATE as nonprofits } from './nonprofits.js';
import { TEMPLATE as legal } from './legal.js';
import { TEMPLATE as higherEducation } from './higher-education.js';
import { TEMPLATE as marketing } from './marketing.js';
import { TEMPLATE as financeAccounting } from './finance-accounting.js';
import { TEMPLATE as developers } from './developers.js';
import { TEMPLATE as smallBusiness } from './small-business.js';
import { TEMPLATE as sportsFacility } from './sports-facility.js';

// The industry templates cover the sectors that keep their operational data in a table and then
// have to show it to somebody else. The demo dashboard leads the list because it is the design
// everyone has already seen: it is the one entry a returning user looks for by name, and without
// it there was no way back to the site the widget opens with.
export const TEMPLATES = [
  demoDashboard,
  researchLabs,
  nonprofits,
  legal,
  higherEducation,
  marketing,
  financeAccounting,
  developers,
  smallBusiness,
  sportsFacility,
];

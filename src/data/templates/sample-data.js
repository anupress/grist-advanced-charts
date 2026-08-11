// One small bundled sample dataset per industry template, used only to preview a template
// before it's applied (see builder/template-picker.js) — so what you see before committing to a
// template already looks like real data for that industry, instead of generic Sales numbers with
// different labels. Every template's stat/chart blocks get remapped onto whichever real table the
// user is actually adapting the template to (adaptConfigToTable, data/provider.js) at apply time;
// this data never reaches a real site. Breakdown and map blocks are never remapped (a documented,
// accepted limitation — see templates/_helpers.js), so every dataset here deliberately includes
// literal "Category"/"Latitude"/"Longitude" columns, matching what every template's breakdown()/
// mapBlock() calls already reference, so those blocks also preview correctly.

import { mulberry32 } from '../dummy-data.js';

function buildRows(seed, { categories, sites, valueRange, count = 24 }) {
  const rnd = mulberry32(seed);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(rnd() * categories.length)];
    const site = sites[Math.floor(rnd() * sites.length)];
    const [lat, lon] = site.coords;
    rows.push({
      id: i + 1,
      Category: category,
      Site: site.name,
      Latitude: Math.round((lat + (rnd() - 0.5) * 0.3) * 10000) / 10000,
      Longitude: Math.round((lon + (rnd() - 0.5) * 0.3) * 10000) / 10000,
      Value: Math.round(valueRange[0] + rnd() * (valueRange[1] - valueRange[0])),
    });
  }
  return rows;
}

// Order matters here, not just for display: adaptConfigToTable() (data/provider.js) picks a
// stat/chart's measure as the *first* numeric-typed column, so Value must precede the
// Latitude/Longitude pair — otherwise every remapped chart/stat would summarize coordinates.
const COLUMNS = [
  { id: 'Category', label: 'Category', type: 'Choice' },
  { id: 'Site', label: 'Site', type: 'Text' },
  { id: 'Value', label: 'Value', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' },
  { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];

const site = (name, lat, lon) => ({ name, coords: [lat, lon] });

function dataset(seed, spec) {
  return { defaultTable: 'Data', tables: { Data: { id: 'Data', label: 'Sample data', columns: COLUMNS, records: buildRows(seed, spec) } } };
}

export const TEMPLATE_SAMPLE_DATA = {
  'research-labs': dataset(4001, {
    categories: ['Genomics', 'Immunology', 'Neuroscience', 'Oncology', 'Public Health'],
    sites: [site('Boston Campus', 42.36, -71.06), site('SF Bay Lab', 37.77, -122.42), site('London Institute', 51.51, -0.13), site('Berlin Centre', 52.52, 13.40), site('Singapore Lab', 1.35, 103.82)],
    valueRange: [5000, 120000],
  }),
  nonprofits: dataset(4002, {
    categories: ['Education', 'Healthcare', 'Housing', 'Environment', 'Food Security'],
    sites: [site('Nairobi Office', -1.29, 36.82), site('São Paulo Hub', -23.55, -46.63), site('Mumbai Chapter', 19.08, 72.88), site('London HQ', 51.51, -0.13), site('Toronto Office', 43.65, -79.38)],
    valueRange: [500, 45000],
  }),
  legal: dataset(4003, {
    categories: ['Litigation', 'Corporate', 'Intellectual Property', 'Family Law', 'Real Estate'],
    sites: [site('New York Office', 40.71, -74.01), site('London Office', 51.51, -0.13), site('Chicago Office', 41.88, -87.63), site('Toronto Office', 43.65, -79.38), site('Singapore Office', 1.35, 103.82)],
    valueRange: [5, 85],
  }),
  'higher-education': dataset(4004, {
    categories: ['Computer Science', 'Business', 'Biology', 'Psychology', 'Engineering'],
    sites: [site('North Campus', 42.36, -71.06), site('Riverside Campus', 30.27, -97.74), site('Lakeside Campus', 43.65, -79.38), site('Old Town Campus', 52.52, 13.40), site('Harbor Campus', -33.87, 151.21)],
    valueRange: [20, 450],
  }),
  marketing: dataset(4005, {
    categories: ['Retail', 'Healthcare', 'Technology', 'Finance', 'Hospitality'],
    sites: [site('New York Studio', 40.71, -74.01), site('London Studio', 51.51, -0.13), site('Singapore Studio', 1.35, 103.82), site('São Paulo Studio', -23.55, -46.63), site('Sydney Studio', -33.87, 151.21)],
    valueRange: [2000, 60000],
  }),
  'finance-accounting': dataset(4006, {
    categories: ['Equities', 'Fixed Income', 'Real Estate', 'Cash & Equivalents', 'Alternatives'],
    sites: [site('New York Office', 40.71, -74.01), site('London Office', 51.51, -0.13), site('Singapore Office', 1.35, 103.82), site('Toronto Office', 43.65, -79.38), site('Chicago Office', 41.88, -87.63)],
    valueRange: [10000, 500000],
  }),
  developers: dataset(4007, {
    categories: ['JavaScript', 'Python', 'iOS', 'Android', 'Java'],
    sites: [site('SF Bay Area', 37.77, -122.42), site('Berlin', 52.52, 13.40), site('Singapore', 1.35, 103.82), site('Austin', 30.27, -97.74), site('Dublin', 53.35, -6.26)],
    valueRange: [500, 25000],
  }),
  'small-business': dataset(4008, {
    categories: ['Coffee & Drinks', 'Pastries', 'Merchandise', 'Catering', 'Gift Cards'],
    sites: [site('Downtown Shop', 30.27, -97.74), site('Uptown Shop', 47.61, -122.33), site('Riverside Shop', 41.88, -87.63), site('Market Street Shop', 43.65, -79.38), site('High Street Shop', 53.35, -6.26)],
    valueRange: [8, 65],
  }),
  'sports-facility': dataset(4009, {
    categories: ['Tennis Courts', 'Swimming Pool', 'Gym Floor', 'Basketball Court', 'Group Studio'],
    sites: [site('Central Facility', 41.88, -87.63), site('Westside Facility', 30.27, -97.74), site('North Facility', 47.61, -122.33), site('Lakeside Facility', 43.65, -79.38), site('Harbor Facility', -33.87, 151.21)],
    valueRange: [1, 40],
  }),
};

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

// ---- Research Labs: a bespoke, 4-table dataset ----
// Every other template below shares one generic {Category, Site, Value, Latitude, Longitude}
// shape — enough since their blocks are all remapped onto a single table on apply anyway. Research
// Labs is deliberately different (see data/templates/research-labs.js's file header): it names
// four *real* tables — Samples, Reagents, Tasks, People — modeled directly on Grist's own three
// official lab templates plus a real case study, and adaptConfigToTable() now preserves a block's
// table when it already matches a real table here, instead of collapsing everything onto one.

const SAMPLE_PROFILES = [
  { type: 'Blood', storage: 'Freezer -20°C', staff: 'John Doe', notes: 'CBC performed, Blood Group done',
    desc: 'Patient bloodwork', qty: [3, 8], sites: [['Hospital Lab', 40.71, -74.01]] },
  { type: 'Water', storage: 'Refrigerator 4°C', staff: 'Sarah Wilson', notes: 'pH and conductivity measured',
    desc: 'Water sample', qty: [20, 200], sites: [['River Site', 41.88, -87.63], ['Lake Site', 47.61, -122.33], ['Coastal Site', 25.76, -80.19], ['Well Site', 30.27, -97.74]] },
  { type: 'Soil', storage: 'Room Temperature', staff: 'David Lee', notes: 'Nutrient analysis conducted',
    desc: 'Soil sample', qty: [50, 100], sites: [['Research Garden', 42.36, -71.06], ['Farm Plot', 39.95, -75.16], ['City Park', 34.05, -118.24]] },
  { type: 'Plant Tissue', storage: 'Freezer -80°C', staff: 'Emily Johnson', notes: 'DNA extracted, PCR completed',
    desc: 'Plant tissue', qty: [20, 40], sites: [['Greenhouse', 42.36, -71.06], ['Orchard', 44.98, -93.27], ['Field Trial Site', 41.26, -95.94]] },
  { type: 'Chemical', storage: 'Chemical Cabinet', staff: 'Michael Brown', notes: 'Spectroscopy performed',
    desc: 'Solvent sample', qty: [12, 25], sites: [['Lab Stock', 42.36, -71.06]] },
  { type: 'Microorganism', storage: 'Incubator 37°C', staff: 'Amanda Taylor', notes: 'Antibiotic sensitivity tested',
    desc: 'Culture sample', qty: [3, 6], sites: [['Lab Culture', 42.36, -71.06]] },
];
const SAMPLES_COLUMNS = [
  { id: 'SampleID', label: 'Sample ID', type: 'Text' }, { id: 'SampleType', label: 'Sample Type', type: 'Choice' },
  { id: 'Description', label: 'Description', type: 'Text' }, { id: 'Source', label: 'Source', type: 'Text' },
  { id: 'Quantity', label: 'Quantity', type: 'Numeric' }, { id: 'Staff', label: 'Staff', type: 'Text' },
  { id: 'StorageLocation', label: 'Storage Location', type: 'Text' }, { id: 'ReceivedAt', label: 'Received At', type: 'Date' },
  { id: 'AnalyzedAt', label: 'Analyzed At', type: 'Date' }, { id: 'ExportedAt', label: 'Exported At', type: 'Date' },
  { id: 'TurnaroundHours', label: 'Turnaround (hrs)', type: 'Numeric' }, { id: 'Latitude', label: 'Latitude', type: 'Numeric' },
  { id: 'Longitude', label: 'Longitude', type: 'Numeric' }, { id: 'Notes', label: 'Notes', type: 'Text' },
];
function buildSamples() {
  const rnd = mulberry32(5001);
  const start = new Date(); start.setDate(start.getDate() - 70); // spread across the last ~10 weeks
  const rows = [];
  for (let i = 0; i < 24; i++) {
    const p = SAMPLE_PROFILES[i % SAMPLE_PROFILES.length];
    const [siteName, lat, lon] = p.sites[Math.floor(rnd() * p.sites.length)];
    const received = new Date(start.getTime() + (i * 2.9 + rnd() * 2) * 86400000);
    const turnaround = Math.round((18 + rnd() * 30) * 10) / 10; // 18-48h — matches the tight, consistent SLA researched
    const analyzed = new Date(received.getTime() + turnaround * 0.5 * 3600000);
    const exported = new Date(received.getTime() + turnaround * 3600000);
    rows.push({
      id: i + 1, SampleID: 'S' + String(i + 1).padStart(3, '0'), SampleType: p.type, Description: p.desc, Source: siteName,
      Quantity: Math.round(p.qty[0] + rnd() * (p.qty[1] - p.qty[0])), Staff: p.staff, StorageLocation: p.storage,
      ReceivedAt: received.toISOString().slice(0, 10), AnalyzedAt: analyzed.toISOString().slice(0, 10), ExportedAt: exported.toISOString().slice(0, 10),
      TurnaroundHours: turnaround,
      Latitude: Math.round((lat + (rnd() - 0.5) * 0.4) * 10000) / 10000, Longitude: Math.round((lon + (rnd() - 0.5) * 0.4) * 10000) / 10000,
      Notes: p.notes,
    });
  }
  return rows;
}

const REAGENT_ITEMS = [
  { category: 'Glassware', item: 'Test Tubes', unit: 'pcs', code: 'TT-001', price: 0.60, supplier: 'Thermo Fisher', storage: 'Shelf A' },
  { category: 'Consumables', item: 'Pipette Tips', unit: 'pcs', code: 'PT-002', price: 0.48, supplier: 'Sigma-Aldrich', storage: 'Shelf B' },
  { category: 'Chemicals', item: 'Tris-HCl Buffer', unit: 'L', code: 'THB-019', price: 30, supplier: 'BD Biosciences', storage: 'Chemical Shelf' },
  { category: 'Glassware', item: 'Glass Slides', unit: 'pcs', code: 'GS-009', price: 0.15, supplier: 'Lonza', storage: 'Drawer D' },
  { category: 'Plasticware', item: 'Microcentrifuge Tubes', unit: 'pcs', code: 'MT-003', price: 1.50, supplier: 'Corning', storage: 'Freezer' },
  { category: 'Reagents', item: 'Antibodies', unit: 'µg', code: 'AB-012', price: 100, supplier: 'Abcam', storage: 'Fridge' },
  { category: 'Consumables', item: 'Agar Plates', unit: 'pcs', code: 'AP-005', price: 0.30, supplier: 'Fisher Scientific', storage: 'Freezer' },
  { category: 'Equipment', item: 'pH Meter', unit: 'pcs', code: 'PHM-006', price: 200, supplier: 'Bio-Rad', storage: 'Lab Bench 1' },
  { category: 'Consumables', item: 'DNA Extraction Kit', unit: 'pcs', code: 'DEK-008', price: 100, supplier: 'Qiagen', storage: 'Drawer C' },
  { category: 'Chemicals', item: 'Ethanol', unit: 'L', code: 'ET-004', price: 50, supplier: 'Merck', storage: 'Chemical Shelf' },
];
const REAGENTS_COLUMNS = [
  { id: 'Category', label: 'Category', type: 'Choice' }, { id: 'Item', label: 'Item', type: 'Text' }, { id: 'Unit', label: 'Unit', type: 'Text' },
  { id: 'Quantity', label: 'Quantity', type: 'Numeric' }, { id: 'TransactionType', label: 'Transaction Type', type: 'Choice' },
  { id: 'RunningQuantity', label: 'Running Quantity', type: 'Numeric' }, { id: 'ItemCode', label: 'Item Code', type: 'Text' },
  { id: 'CreatedAt', label: 'Created At', type: 'Date' }, { id: 'CreatedBy', label: 'Created By', type: 'Text' },
  { id: 'StorageLocation', label: 'Storage Location', type: 'Text' }, { id: 'Supplier', label: 'Supplier', type: 'Text' },
  { id: 'UnitPrice', label: 'Unit Price', type: 'Numeric' }, { id: 'TotalValue', label: 'Total Value', type: 'Numeric' },
];
function buildReagents() {
  const rnd = mulberry32(5002);
  const start = new Date(); start.setDate(start.getDate() - 90);
  const running = {};
  const creators = ['Alice B.', 'Carol D.', 'David Lee'];
  const rows = [];
  for (let i = 0; i < 26; i++) {
    const item = REAGENT_ITEMS[Math.floor(rnd() * REAGENT_ITEMS.length)];
    const isPurchase = running[item.code] == null || rnd() < 0.4;
    const qty = isPurchase ? Math.round(50 + rnd() * 200) : Math.round(10 + rnd() * Math.min(80, running[item.code] || 50));
    running[item.code] = (running[item.code] || 0) + (isPurchase ? qty : -qty);
    if (running[item.code] < 0) running[item.code] = qty; // never show negative stock in the demo
    const created = new Date(start.getTime() + i * 3.3 * 86400000);
    rows.push({
      id: i + 1, Category: item.category, Item: item.item, Unit: item.unit, Quantity: qty,
      TransactionType: isPurchase ? 'Purchase' : 'Use', RunningQuantity: running[item.code], ItemCode: item.code,
      CreatedAt: created.toISOString().slice(0, 10), CreatedBy: creators[Math.floor(rnd() * creators.length)],
      StorageLocation: item.storage, Supplier: item.supplier,
      UnitPrice: isPurchase ? item.price : null, TotalValue: isPurchase ? Math.round(qty * item.price * 100) / 100 : null,
    });
  }
  return rows;
}

const TASK_TEMPLATES = [
  { task: 'Administer anesthesia to test subjects', project: 'Animal Testing', priority: 'Medium' },
  { task: 'Prepare sequencing report', project: 'DNA Sequencing', priority: 'Medium' },
  { task: 'Review and optimize sequencing protocols', project: 'DNA Sequencing', priority: 'High' },
  { task: 'Perform data cleaning and pre-processing', project: 'Data Analysis', priority: 'Low' },
  { task: 'Organize literature references', project: 'Literature Review', priority: 'Medium' },
  { task: 'Perform Western blot analysis', project: 'Cell Culturing', priority: 'High' },
  { task: 'Calibrate pH meter', project: 'Equipment Maintenance', priority: 'Low' },
  { task: 'Order replacement reagents', project: 'Equipment Maintenance', priority: 'Medium' },
  { task: 'Draft grant progress report', project: 'Literature Review', priority: 'High' },
  { task: 'Run PCR amplification batch', project: 'Cell Culturing', priority: 'Medium' },
  { task: 'Review IRB renewal paperwork', project: 'Animal Testing', priority: 'High' },
  { task: 'Analyze behavioral data', project: 'Data Analysis', priority: 'Low' },
];
const TASKS_COLUMNS = [
  { id: 'Task', label: 'Task', type: 'Text' }, { id: 'Priority', label: 'Priority', type: 'Choice' },
  { id: 'Project', label: 'Project', type: 'Text' }, { id: 'AssignedTo', label: 'Assigned To', type: 'Text' },
  { id: 'DueDate', label: 'Due Date', type: 'Date' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'Outcome', label: 'Outcome', type: 'Text' },
];
function buildTasks() {
  const rnd = mulberry32(5003);
  const assignees = ['Jane Smith', 'David Lee', 'Emily Johnson', 'John Doe', 'Michael Brown', 'Sarah Wilson', 'Amanda Taylor'];
  const rows = [];
  // Spread -10..+30 days from *today* (not a fixed seed date) so the calendar has visible events
  // on its default (current-month) view without navigating away first.
  for (let i = 0; i < 18; i++) {
    const t = TASK_TEMPLATES[i % TASK_TEMPLATES.length];
    const dayOffset = Math.round(-10 + rnd() * 40);
    const due = new Date(); due.setDate(due.getDate() + dayOffset); due.setHours(0, 0, 0, 0);
    const status = dayOffset < -2 ? (rnd() < 0.7 ? 'Done' : 'In Progress') : ['Not Started', 'Pending', 'In Progress'][Math.floor(rnd() * 3)];
    rows.push({
      id: i + 1, Task: t.task, Priority: t.priority, Project: t.project, AssignedTo: assignees[Math.floor(rnd() * assignees.length)],
      DueDate: due.toISOString().slice(0, 10), Status: status,
      Outcome: status === 'Done' ? 'Completed on schedule.' : status === 'In Progress' ? `Progress: ${Math.floor(30 + rnd() * 60)}% complete` : '',
    });
  }
  return rows;
}

const PEOPLE_ROWS = [
  { id: 1, Name: 'Dr. Jane Smith', Title: 'Principal Investigator', Email: 'jane.smith@anupresslab.org', Phone: '+1 (555) 010-1001' },
  { id: 2, Name: 'David Lee', Title: 'Lab Manager', Email: 'david.lee@anupresslab.org', Phone: '+1 (555) 010-1002' },
  { id: 3, Name: 'Emily Johnson', Title: 'Data Scientist', Email: 'emily.johnson@anupresslab.org', Phone: '+1 (555) 010-1003' },
  { id: 4, Name: 'John Doe', Title: 'Cell Biologist', Email: 'john.doe@anupresslab.org', Phone: '+1 (555) 010-1004' },
  { id: 5, Name: 'Michael Brown', Title: 'Biochemist', Email: 'michael.brown@anupresslab.org', Phone: '+1 (555) 010-1005' },
  { id: 6, Name: 'Sarah Wilson', Title: 'Environmental Scientist', Email: 'sarah.wilson@anupresslab.org', Phone: '+1 (555) 010-1006' },
  { id: 7, Name: 'Amanda Taylor', Title: 'Microbiologist', Email: 'amanda.taylor@anupresslab.org', Phone: '+1 (555) 010-1007' },
];
const PEOPLE_COLUMNS = [
  { id: 'Name', label: 'Name', type: 'Text' }, { id: 'Title', label: 'Title', type: 'Text' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'Phone', label: 'Phone', type: 'Text' },
];

function buildResearchLabsData() {
  return {
    defaultTable: 'Samples',
    tables: {
      Samples: { id: 'Samples', label: 'Samples', columns: SAMPLES_COLUMNS, records: buildSamples() },
      Reagents: { id: 'Reagents', label: 'Reagent inventory', columns: REAGENTS_COLUMNS, records: buildReagents() },
      Tasks: { id: 'Tasks', label: 'Tasks', columns: TASKS_COLUMNS, records: buildTasks() },
      People: { id: 'People', label: 'People', columns: PEOPLE_COLUMNS, records: PEOPLE_ROWS },
    },
  };
}

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
  'research-labs': buildResearchLabsData(),
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

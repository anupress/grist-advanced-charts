// One small bundled sample dataset per industry template, used only to preview a template
// before it's applied (see builder/template-picker.js) — so what you see before committing to a
// template already looks like real data for that industry, instead of generic Sales numbers with
// different labels. Every dataset here is keyed by the same table name(s) its template's blocks
// already reference, so adaptTemplateToTable (data/provider.js) treats it as a genuine match at
// preview time and repairs every table-bound block type's columns to fit — this data never
// reaches a real site, it's preview-only.

import { mulberry32, DUMMY_DATA } from '../dummy-data.js';

// ---- Research Labs: a bespoke, 4-table dataset ----
// Every other template below shares one generic {Category, Site, Value, Latitude, Longitude}
// shape keyed to the 'Data' placeholder table — enough since those templates' blocks are all
// authored against 'Data' too. Research Labs is deliberately different (see
// data/templates/research-labs.js's file header): it names four *real* tables — Samples,
// Reagents, Tasks, People — modeled directly on Grist's own three official lab templates plus a
// real case study, matched here by using those same table names.

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
  { category: 'Glassware', item: 'Test Tubes', unit: 'pcs', code: 'TT-001', price: 0.60, supplier: 'Northvale Scientific', storage: 'Shelf A' },
  { category: 'Consumables', item: 'Pipette Tips', unit: 'pcs', code: 'PT-002', price: 0.48, supplier: 'Calder Reagents', storage: 'Shelf B' },
  { category: 'Chemicals', item: 'Tris-HCl Buffer', unit: 'L', code: 'THB-019', price: 30, supplier: 'Halden Biosystems', storage: 'Chemical Shelf' },
  { category: 'Glassware', item: 'Glass Slides', unit: 'pcs', code: 'GS-009', price: 0.15, supplier: 'Lonza', storage: 'Drawer D' },
  { category: 'Plasticware', item: 'Microcentrifuge Tubes', unit: 'pcs', code: 'MT-003', price: 1.50, supplier: 'Glasswell Scientific', storage: 'Freezer' },
  { category: 'Reagents', item: 'Antibodies', unit: 'µg', code: 'AB-012', price: 100, supplier: 'Larkfield Antibodies', storage: 'Fridge' },
  { category: 'Consumables', item: 'Agar Plates', unit: 'pcs', code: 'AP-005', price: 0.30, supplier: 'Corvus Labware', storage: 'Freezer' },
  { category: 'Equipment', item: 'pH Meter', unit: 'pcs', code: 'PHM-006', price: 200, supplier: 'Ashgrove Instruments', storage: 'Lab Bench 1' },
  { category: 'Consumables', item: 'DNA Extraction Kit', unit: 'pcs', code: 'DEK-008', price: 100, supplier: 'Solvane Diagnostics', storage: 'Drawer C' },
  { category: 'Chemicals', item: 'Ethanol', unit: 'L', code: 'ET-004', price: 50, supplier: 'Brookmere Chemicals', storage: 'Chemical Shelf' },
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
  { id: 1, Name: 'Dr. Jane Smith', Title: 'Principal Investigator', Email: 'jane.smith@example.org', Phone: '+1 (212) 555-0101' },
  { id: 2, Name: 'David Lee', Title: 'Lab Manager', Email: 'david.lee@example.org', Phone: '+1 (212) 555-0102' },
  { id: 3, Name: 'Emily Johnson', Title: 'Data Scientist', Email: 'emily.johnson@example.org', Phone: '+1 (212) 555-0103' },
  { id: 4, Name: 'John Doe', Title: 'Cell Biologist', Email: 'john.doe@example.org', Phone: '+1 (212) 555-0104' },
  { id: 5, Name: 'Michael Brown', Title: 'Biochemist', Email: 'michael.brown@example.org', Phone: '+1 (212) 555-0105' },
  { id: 6, Name: 'Sarah Wilson', Title: 'Environmental Scientist', Email: 'sarah.wilson@example.org', Phone: '+1 (212) 555-0106' },
  { id: 7, Name: 'Amanda Taylor', Title: 'Microbiologist', Email: 'amanda.taylor@example.org', Phone: '+1 (212) 555-0107' },
];
const PEOPLE_COLUMNS = [
  { id: 'Name', label: 'Name', type: 'Text' }, { id: 'Title', label: 'Title', type: 'Text' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'Phone', label: 'Phone', type: 'Text' },
];

// Instruments — the one lab function the first pass didn't model. Real labs run a calibration /
// maintenance register (and the Jozef Stefan case study specifically integrates instrument data),
// so this carries a NextCalibration date the Equipment page plots on a draggable calendar and
// highlights when it slips. CalibrationDue/Compliant are pre-split 1/0 helper columns because a
// stat block can only SUM a column — it can't filter by status (same trick as Finance's Invoices).
const INSTRUMENTS = [
  ['Mass Spectrometer', 'Northvale Scientific', 'Lab A', 'Dr. Jane Smith'],
  ['HPLC System', 'Meridian Analytical', 'Lab A', 'Michael Brown'],
  ['PCR Thermocycler', 'Ashgrove Instruments', 'Molecular Lab', 'Emily Johnson'],
  ['Refrigerated Centrifuge', 'Tessaro Labware', 'Prep Room', 'David Lee'],
  ['Microplate Reader', 'Verity Instruments', 'Assay Room', 'Amanda Taylor'],
  ['-80°C Freezer', 'Northvale Scientific', 'Cold Room', 'David Lee'],
  ['Autoclave', 'Tuttnauer', 'Sterilization', 'John Doe'],
  ['Fluorescence Microscope', 'Zeiss', 'Imaging Suite', 'Emily Johnson'],
  ['UV-Vis Spectrophotometer', 'Shimadzu', 'Lab B', 'Michael Brown'],
  ['CO₂ Incubator', 'Panasonic', 'Cell Culture', 'John Doe'],
  ['Flow Cytometer', 'Halden Biosystems', 'Imaging Suite', 'Amanda Taylor'],
  ['Water Purification System', 'Milli-Q', 'Lab B', 'Sarah Wilson'],
  ['Analytical Balance', 'Mettler Toledo', 'Prep Room', 'Sarah Wilson'],
  ['Gas Chromatograph', 'Meridian Analytical', 'Lab A', 'Dr. Jane Smith'],
];
const INSTRUMENTS_COLUMNS = [
  { id: 'InstrumentID', label: 'Asset ID', type: 'Text' }, { id: 'Name', label: 'Instrument', type: 'Text' },
  { id: 'Location', label: 'Location', type: 'Text' }, { id: 'ResponsibleStaff', label: 'Responsible', type: 'Text' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'NextCalibration', label: 'Next Calibration', type: 'Date' },
  { id: 'Manufacturer', label: 'Manufacturer', type: 'Text' }, { id: 'LastCalibration', label: 'Last Calibration', type: 'Date' },
  { id: 'UtilisationHours', label: 'Hours Logged', type: 'Numeric' },
  { id: 'CalibrationDue', label: 'Due Within 30d', type: 'Numeric' }, { id: 'Compliant', label: 'In Compliance', type: 'Numeric' },
];
function buildInstruments() {
  const rnd = mulberry32(5004);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return INSTRUMENTS.map(([name, mfr, loc, staff], i) => {
    // Two regimes, so the page reads like a well-run lab rather than a negligent one: most
    // instruments sit on a near-term schedule (-12..+45 days — this is what fills the calendar's
    // current month and the "due soon" count, with only the occasional genuinely overdue one),
    // the rest are calibrated and not due again for months.
    const nearTerm = rnd() < 0.62;
    const offset = nearTerm ? Math.round(-12 + rnd() * 57) : Math.round(60 + rnd() * 240);
    const next = new Date(today); next.setDate(next.getDate() + offset);
    const last = new Date(next); last.setDate(last.getDate() - 365);
    const overdue = offset < 0;
    const status = overdue ? 'Due calibration' : (rnd() < 0.12 ? 'Out for repair' : 'In service');
    return {
      id: i + 1, InstrumentID: 'INS-' + String(i + 1).padStart(3, '0'), Name: name, Location: loc,
      ResponsibleStaff: staff, Status: status, NextCalibration: iso(next), Manufacturer: mfr,
      LastCalibration: iso(last), UtilisationHours: Math.round(80 + rnd() * 900),
      CalibrationDue: offset <= 30 ? 1 : 0, Compliant: overdue ? 0 : 1,
    };
  });
}

function buildResearchLabsData() {
  return {
    defaultTable: 'Samples',
    tables: {
      Samples: { id: 'Samples', label: 'Samples', columns: SAMPLES_COLUMNS, records: buildSamples() },
      Reagents: { id: 'Reagents', label: 'Reagent inventory', columns: REAGENTS_COLUMNS, records: buildReagents() },
      Tasks: { id: 'Tasks', label: 'Tasks', columns: TASKS_COLUMNS, records: buildTasks() },
      People: { id: 'People', label: 'People', columns: PEOPLE_COLUMNS, records: PEOPLE_ROWS },
      Instruments: { id: 'Instruments', label: 'Instruments', columns: INSTRUMENTS_COLUMNS, records: buildInstruments() },
    },
  };
}

// ---- Finance & Accounting: a unified money-in / money-out cockpit ----
// Modeled on Grist's own three finance templates (Invoicing, Payroll, Expense Tracking) but
// unified the way a small business actually runs its books, and extended past what those separate
// docs track: invoices carry a Status + PaidDate (so AR aging, overdue emphasis and a due-date
// calendar are possible — the base invoicing template has none of that), expenses have an
// approval Status, and a CashFlow summary ties money in vs out by month.

const FIN_CLIENTS = [
  ['Physically Fit', 'Dana Cole', 'Austin', 'TX', 30.27, -97.74],
  ['Bluewave Media', 'Marcus Lin', 'San Francisco', 'CA', 37.77, -122.42],
  ['Northwind Traders', 'Priya Nair', 'Chicago', 'IL', 41.88, -87.63],
  ['Summit Analytics', 'Erik Olsen', 'Denver', 'CO', 39.74, -104.99],
  ['Harbor & Vale', 'Sofia Rossi', 'Boston', 'MA', 42.36, -71.06],
  ['Cedar Foods Co.', 'Tom Becker', 'Portland', 'OR', 45.52, -122.68],
  ['Vertex Robotics', 'Aisha Khan', 'Seattle', 'WA', 47.61, -122.33],
  ['Maple & Third', 'Liu Wei', 'New York', 'NY', 40.71, -74.01],
  ['Orchard Health', 'Grace Kim', 'Atlanta', 'GA', 33.75, -84.39],
  ['Pioneer Freight', 'Sam Duarte', 'Miami', 'FL', 25.76, -80.19],
];
const FIN_EMPLOYEES = [
  ['Ava Bennett', 'Account Executive', 'Sales', 55],
  ['Diego Alvarez', 'Designer', 'Marketing', 48],
  ['Nadia Petrov', 'Accountant', 'Finance', 60],
  ['Owen Clarke', 'Operations Lead', 'Operations', 52],
  ['Mei Tanaka', 'Developer', 'Engineering', 68],
  ['Jamal Wright', 'Support Specialist', 'Support', 38],
  ['Elena Novak', 'Marketing Manager', 'Marketing', 58],
];
const EXPENSE_CATS = [ // [Category, Account]
  ['Software', 'Administration'], ['Travel', 'Sales'], ['Meals & Entertainment', 'Sales'],
  ['Office Supplies', 'Administration'], ['Advertising', 'Marketing'], ['Equipment', 'Operations'],
  ['Contractors', 'Operations'], ['Training', 'Finance'], ['Utilities', 'Administration'], ['Shipping', 'Operations'],
];
const EXPENSE_DESCS = {
  Software: ['Figma annual seats', 'Grist Team plan', 'Slack subscription', 'AWS usage'],
  Travel: ['Client visit flights', 'Conference hotel', 'Rideshare to airport', 'Rail tickets'],
  'Meals & Entertainment': ['Client dinner', 'Team lunch', 'Coffee with prospect'],
  'Office Supplies': ['Printer paper & toner', 'Desk chairs', 'Whiteboard markers'],
  Advertising: ['Google Ads', 'LinkedIn campaign', 'Sponsored newsletter'],
  Equipment: ['Laptop refresh', 'Monitor', 'Warehouse scanner'],
  Contractors: ['Freelance copywriter', 'Contract QA', 'Design contractor'],
  Training: ['Accounting CPE course', 'Sales workshop', 'Security training'],
  Utilities: ['Office electricity', 'Internet', 'Water & waste'],
  Shipping: ['FedEx samples', 'Courier to client', 'Pallet freight'],
};

// Format LOCAL date components (not toISOString, which converts to UTC and can shift the date back
// a day in timezones ahead of UTC — that would push month-boundary dates like the 1st onto the
// previous month, and nudge calendar due-dates a day early).
const finIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const finMonthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

const FIN_INVOICES_COLUMNS = [
  { id: 'InvoiceNumber', label: 'Invoice #', type: 'Text' }, { id: 'Client', label: 'Client', type: 'Text' },
  { id: 'IssueDate', label: 'Issue Date', type: 'Date' }, { id: 'DueDate', label: 'Due Date', type: 'Date' },
  { id: 'Amount', label: 'Amount', type: 'Numeric' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'PaidDate', label: 'Paid Date', type: 'Date' }, { id: 'Outstanding', label: 'Outstanding', type: 'Numeric' },
  { id: 'Collected', label: 'Collected', type: 'Numeric' }, { id: 'OverdueAmount', label: 'Overdue Amount', type: 'Numeric' },
];
const FIN_EXPENSES_COLUMNS = [
  { id: 'Date', label: 'Date', type: 'Date' }, { id: 'Account', label: 'Account', type: 'Choice' },
  { id: 'Category', label: 'Category', type: 'Choice' }, { id: 'Description', label: 'Description', type: 'Text' },
  { id: 'Amount', label: 'Amount', type: 'Numeric' }, { id: 'Reimbursable', label: 'Reimbursable', type: 'Bool' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Employee', label: 'Employee', type: 'Text' },
];
const FIN_PAYROLL_COLUMNS = [
  { id: 'Employee', label: 'Employee', type: 'Text' }, { id: 'Role', label: 'Role', type: 'Text' },
  { id: 'Department', label: 'Department', type: 'Choice' }, { id: 'PayPeriod', label: 'Pay Period', type: 'Date' },
  { id: 'Hours', label: 'Hours', type: 'Numeric' }, { id: 'HourlyRate', label: 'Hourly Rate', type: 'Numeric' },
  { id: 'Payment', label: 'Payment', type: 'Numeric' },
];
const FIN_CLIENTS_COLUMNS = [
  { id: 'Name', label: 'Client', type: 'Text' }, { id: 'Contact', label: 'Contact', type: 'Text' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'City', label: 'City', type: 'Text' },
  { id: 'State', label: 'State', type: 'Text' }, { id: 'TotalBilled', label: 'Total Billed', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const FIN_CASHFLOW_COLUMNS = [
  { id: 'Month', label: 'Month', type: 'Date' }, { id: 'Invoiced', label: 'Invoiced', type: 'Numeric' },
  { id: 'Expenses', label: 'Expenses', type: 'Numeric' }, { id: 'Payroll', label: 'Payroll', type: 'Numeric' },
  { id: 'Net', label: 'Net', type: 'Numeric' },
];

function buildFinanceData() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rnd = mulberry32(7001);
  const round2 = (n) => Math.round(n * 100) / 100;
  const inMonth = (dStr, ms) => { const d = new Date(dStr); return d.getFullYear() === ms.getFullYear() && d.getMonth() === ms.getMonth(); };

  // Invoices — spread so some Due Dates land in the current month (for the calendar) and a realistic
  // mix of Paid / Sent / Overdue / Draft. Outstanding/Collected/OverdueAmount are per-row splits so
  // the KPI stats can be plain SUMs (stat blocks can't filter by status).
  const invoices = [];
  for (let i = 0; i < 30; i++) {
    const cname = FIN_CLIENTS[Math.floor(rnd() * FIN_CLIENTS.length)][0];
    // setDate(), not millisecond addition: adding 30×86400000 ms across a daylight-saving boundary
    // lands on a different local wall-clock time, so the formatted dates come out 31 days apart
    // and the "net 30" terms quietly break twice a year.
    const issue = new Date(today); issue.setDate(issue.getDate() - Math.round(5 + rnd() * 150));
    const due = new Date(issue); due.setDate(due.getDate() + 30);
    const amount = Math.round((800 + rnd() * 23000) / 10) * 10;
    let status, paidDate = null;
    if (due < today) { if (rnd() < 0.72) { status = 'Paid'; const pd = new Date(due); pd.setDate(pd.getDate() - Math.round(rnd() * 10)); paidDate = finIso(pd); } else status = 'Overdue'; }
    else status = rnd() < 0.85 ? 'Sent' : 'Draft';
    invoices.push({
      id: i + 1, InvoiceNumber: 'INV-' + (1001 + i), Client: cname, IssueDate: finIso(issue), DueDate: finIso(due),
      Amount: amount, Status: status, PaidDate: paidDate,
      Outstanding: (status === 'Sent' || status === 'Overdue') ? amount : 0,
      Collected: status === 'Paid' ? amount : 0,
      OverdueAmount: status === 'Overdue' ? amount : 0,
    });
  }

  const clients = FIN_CLIENTS.map((c, i) => {
    const [name, contact, city, state, lat, lon] = c;
    const billed = invoices.filter((v) => v.Client === name).reduce((s, v) => s + v.Amount, 0);
    return { id: i + 1, Name: name, Contact: contact,
      Email: contact.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com',
      City: city, State: state, TotalBilled: billed, Latitude: lat, Longitude: lon };
  });

  const payroll = []; let pid = 1;
  for (let m = 3; m >= 0; m--) {
    const period = finMonthStart(new Date(today.getFullYear(), today.getMonth() - m, 1));
    for (const [name, role, dept, rate] of FIN_EMPLOYEES) {
      const hours = 140 + Math.round(rnd() * 40);
      const hr = rate + (rnd() < 0.2 ? 2 : 0);
      payroll.push({ id: pid++, Employee: name, Role: role, Department: dept, PayPeriod: finIso(period), Hours: hours, HourlyRate: hr, Payment: round2(hours * hr) });
    }
  }

  const expenses = [];
  for (let i = 0; i < 42; i++) {
    const [cat, account] = EXPENSE_CATS[Math.floor(rnd() * EXPENSE_CATS.length)];
    const descs = EXPENSE_DESCS[cat];
    const date = new Date(today.getTime() - Math.round(rnd() * 150) * 86400000);
    const emp = FIN_EMPLOYEES[Math.floor(rnd() * FIN_EMPLOYEES.length)][0];
    const amount = round2(20 + rnd() * (cat === 'Equipment' || cat === 'Contractors' ? 3400 : 800));
    expenses.push({ id: i + 1, Date: finIso(date), Account: account, Category: cat, Description: descs[Math.floor(rnd() * descs.length)],
      Amount: amount, Reimbursable: rnd() < 0.4, Status: rnd() < 0.75 ? 'Approved' : 'Pending', Employee: emp });
  }

  const cashflow = [];
  for (let m = 5; m >= 0; m--) {
    const ms = finMonthStart(new Date(today.getFullYear(), today.getMonth() - m, 1));
    const invoiced = invoices.filter((v) => inMonth(v.IssueDate, ms)).reduce((s, v) => s + v.Amount, 0);
    const exp = expenses.filter((e) => inMonth(e.Date, ms)).reduce((s, e) => s + e.Amount, 0);
    const pay = payroll.filter((p) => inMonth(p.PayPeriod, ms)).reduce((s, p) => s + p.Payment, 0);
    cashflow.push({ id: cashflow.length + 1, Month: finIso(ms), Invoiced: Math.round(invoiced), Expenses: Math.round(exp), Payroll: Math.round(pay), Net: Math.round(invoiced - exp - pay) });
  }

  return {
    defaultTable: 'Invoices',
    tables: {
      Invoices: { id: 'Invoices', label: 'Invoices', columns: FIN_INVOICES_COLUMNS, records: invoices },
      Expenses: { id: 'Expenses', label: 'Expenses', columns: FIN_EXPENSES_COLUMNS, records: expenses },
      Payroll: { id: 'Payroll', label: 'Payroll', columns: FIN_PAYROLL_COLUMNS, records: payroll },
      Clients: { id: 'Clients', label: 'Clients', columns: FIN_CLIENTS_COLUMNS, records: clients },
      CashFlow: { id: 'CashFlow', label: 'Cash flow', columns: FIN_CASHFLOW_COLUMNS, records: cashflow },
    },
  };
}

// ---- Nonprofit: one published mission dashboard ----
// Modeled on Grist's four separate nonprofit docs (Grant Application Tracker, Church Management
// CRM, Donation Tracking, Event Sponsors + Registrations), unified into the view a nonprofit
// actually needs to SHOW donors, boards and funders. Extends the sources: grant deadlines get a
// draggable calendar and a win-rate (the tracker has deadlines but no calendar and no ratio),
// programs get budget-vs-actual (no source does this), events get capacity bars.
//
// Privacy, deliberately: the source docs are internal and lean on Grist access rules (People even
// has a List_Visibility flag). This widget PUBLISHES, so donors here are shown as "Maria G." /
// "Anonymous" — the template copy tells users to keep donor-level rows private and publish the
// aggregates. Never model a template on publishing donor PII.
const NP_DONORS = ['Maria G.', 'James W.', 'Anonymous', 'The Okonkwo Family', 'Priya S.', 'Daniel R.',
  'Anonymous', 'Chen W.', 'Aisha M.', 'Robert & Ellen T.', 'Sofia L.', 'Anonymous', 'Marcus D.', 'Yuki T.'];
const NP_CAMPAIGNS = ['Annual Fund', 'Winter Appeal', 'Spring Gala', 'Emergency Relief', 'Monthly Giving'];
const NP_METHODS = ['Card', 'Bank transfer', 'Check', 'Cash', 'Payroll giving'];
const NP_PROGRAMS = [
  ['Youth Literacy', 'Education', 'East Side', 42.36, -71.06, 'Dr. Alice Mensah'],
  ['Community Food Bank', 'Food Security', 'Riverside', 41.88, -87.63, 'Tom Becker'],
  ['Warm Homes', 'Housing', 'North Quarter', 39.74, -104.99, 'Grace Kim'],
  ['Mobile Health Clinic', 'Health', 'Rural District', 30.27, -97.74, 'Dr. Samuel Ortiz'],
  ['Green Spaces', 'Environment', 'Harbor View', 45.52, -122.68, 'Elena Novak'],
  ['Job Readiness', 'Education', 'Southbank', 33.75, -84.39, 'Jamal Wright'],
];
const NP_FOUNDATIONS = ['Whitfield Foundation', 'Cedar Trust', 'Openfield Fund', 'Harbor Community Trust',
  'The Lindqvist Foundation', 'Meridian Giving', 'Ashcroft Family Fund'];
const NP_GRANTS = [
  ['Youth Literacy Expansion', 'Youth Literacy'], ['Weekend Meals Program', 'Community Food Bank'],
  ['Winter Shelter Beds', 'Warm Homes'], ['Mobile Clinic Vehicle', 'Mobile Health Clinic'],
  ['Neighbourhood Tree Planting', 'Green Spaces'], ['Apprenticeship Pilot', 'Job Readiness'],
  ['Family Literacy Nights', 'Youth Literacy'], ['Cold Storage Upgrade', 'Community Food Bank'],
  ['Emergency Housing Fund', 'Warm Homes'], ['Rural Outreach Nurses', 'Mobile Health Clinic'],
  ['Community Garden Build', 'Green Spaces'], ['Digital Skills Lab', 'Job Readiness'],
  ['Summer Reading Corps', 'Youth Literacy'], ['Delivery Van Replacement', 'Community Food Bank'],
  ['Tenancy Support Workers', 'Warm Homes'], ['Screening Clinic Equipment', 'Mobile Health Clinic'],
  ['Pollinator Corridor', 'Green Spaces'], ['Employer Partnerships Fund', 'Job Readiness'],
];
const NP_GRANT_STATUS = ['Not started', 'Submitted', 'Awaiting decision', 'Funded', 'Declined'];
const NP_VOLUNTEER_NAMES = ['Ava Bennett', 'Diego Alvarez', 'Nadia Petrov', 'Owen Clarke', 'Mei Tanaka',
  'Jamal Wright', 'Elena Novak', 'Ruth Adeyemi', 'Peter Lindqvist', 'Hana Suzuki', 'Carlos Mendez',
  'Fatima Zahra', 'George Whitman', 'Linda Park', 'Samuel Osei', 'Nina Kowalski'];
const NP_ROLES = ['Tutor', 'Driver', 'Event steward', 'Fundraiser', 'Mentor', 'Kitchen help', 'Admin support'];
const NP_EVENTS = [
  ['Spring Gala Dinner', 'Riverside Hall'], ['Community Fun Run', 'Harbor Park'],
  ['Winter Coat Drive', 'East Side Centre'], ['Volunteer Open Day', 'North Quarter Hub'],
  ['Donor Thank-You Evening', 'Riverside Hall'], ['Summer Reading Festival', 'Southbank Library'],
];

const npIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const NP_DONATIONS_COLUMNS = [
  { id: 'Donor', label: 'Donor', type: 'Text' }, { id: 'Date', label: 'Date', type: 'Date' },
  { id: 'Amount', label: 'Amount', type: 'Numeric' }, { id: 'Campaign', label: 'Campaign', type: 'Choice' },
  { id: 'Method', label: 'Method', type: 'Choice' }, { id: 'Type', label: 'Type', type: 'Choice' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Received', label: 'Received', type: 'Numeric' },
  { id: 'Pledged', label: 'Pledged', type: 'Numeric' }, { id: 'Acknowledged', label: 'Receipt Sent', type: 'Bool' },
];
const NP_GRANTS_COLUMNS = [
  { id: 'GrantName', label: 'Grant', type: 'Text' }, { id: 'Foundation', label: 'Foundation', type: 'Text' },
  { id: 'Program', label: 'Program', type: 'Text' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'ProposalDeadline', label: 'Proposal Deadline', type: 'Date' },
  { id: 'AmountRequested', label: 'Requested', type: 'Numeric' }, { id: 'AmountAwarded', label: 'Awarded', type: 'Numeric' },
  { id: 'Assignee', label: 'Owner', type: 'Text' }, { id: 'Funded', label: 'Funded', type: 'Numeric' },
  { id: 'Decided', label: 'Decided', type: 'Numeric' },
];
const NP_VOLUNTEERS_COLUMNS = [
  { id: 'Name', label: 'Volunteer', type: 'Text' }, { id: 'Role', label: 'Role', type: 'Choice' },
  { id: 'Program', label: 'Program', type: 'Text' }, { id: 'HoursLogged', label: 'Hours Logged', type: 'Numeric' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'JoinDate', label: 'Joined', type: 'Date' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'BackgroundCheck', label: 'Checks Cleared', type: 'Bool' },
];
const NP_PROGRAMS_COLUMNS = [
  { id: 'Program', label: 'Program', type: 'Text' }, { id: 'Focus', label: 'Focus', type: 'Choice' },
  { id: 'Location', label: 'Location', type: 'Text' }, { id: 'PeopleServed', label: 'People Served', type: 'Numeric' },
  { id: 'Budget', label: 'Budget', type: 'Numeric' }, { id: 'Spent', label: 'Spent', type: 'Numeric' },
  { id: 'Lead', label: 'Program Lead', type: 'Text' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const NP_EVENTS_COLUMNS = [
  { id: 'Event', label: 'Event', type: 'Text' }, { id: 'Date', label: 'Date', type: 'Date' },
  { id: 'Location', label: 'Location', type: 'Text' }, { id: 'Capacity', label: 'Capacity', type: 'Numeric' },
  { id: 'Registered', label: 'Registered', type: 'Numeric' }, { id: 'PercentFull', label: '% Full', type: 'Numeric' },
  { id: 'TicketRevenue', label: 'Ticket Revenue', type: 'Numeric' }, { id: 'Coordinator', label: 'Coordinator', type: 'Text' },
];

function buildNonprofitData() {
  const rnd = mulberry32(8001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  // Donations across the last ~11 months; most received, a few still pledged.
  const donations = [];
  for (let i = 0; i < 46; i++) {
    const date = new Date(today.getTime() - Math.round(rnd() * 330) * 86400000);
    const type = rnd() < 0.32 ? 'Recurring' : 'One-time';
    const base = type === 'Recurring' ? 25 + rnd() * 175 : 40 + rnd() * 2600;
    const amount = Math.round(base / 5) * 5;
    const status = rnd() < 0.87 ? 'Received' : 'Pledged';
    donations.push({
      id: i + 1, Donor: pick(NP_DONORS), Date: npIso(date), Amount: amount,
      Campaign: pick(NP_CAMPAIGNS), Method: pick(NP_METHODS), Type: type, Status: status,
      Received: status === 'Received' ? amount : 0, Pledged: status === 'Pledged' ? amount : 0,
      Acknowledged: status === 'Received' ? rnd() < 0.85 : false,
    });
  }

  // Grants use two regimes so the page tells a complete story: a settled history (decided, giving a
  // believable ~60% win rate for the KPIs) plus live applications clustered around now, which is
  // what fills the proposal-deadline calendar's current month.
  const grants = NP_GRANTS.map(([name, program], i) => {
    const historical = rnd() < 0.45;
    const offset = historical ? Math.round(-190 + rnd() * 160) : Math.round(-8 + rnd() * 52);
    const deadline = new Date(today); deadline.setDate(deadline.getDate() + offset);
    const requested = Math.round((8000 + rnd() * 92000) / 500) * 500;
    // Past-deadline applications have been decided; future ones are still in flight.
    let status;
    if (offset < 0) status = rnd() < 0.62 ? 'Funded' : 'Declined';
    else status = rnd() < 0.45 ? 'Awaiting decision' : (rnd() < 0.6 ? 'Submitted' : 'Not started');
    const funded = status === 'Funded';
    return {
      id: i + 1, GrantName: name, Foundation: pick(NP_FOUNDATIONS), Program: program, Status: status,
      ProposalDeadline: npIso(deadline), AmountRequested: requested,
      AmountAwarded: funded ? Math.round(requested * (0.6 + rnd() * 0.4) / 500) * 500 : 0,
      Assignee: pick(['Dr. Alice Mensah', 'Grace Kim', 'Jamal Wright', 'Elena Novak']),
      Funded: funded ? 1 : 0, Decided: (status === 'Funded' || status === 'Declined') ? 1 : 0,
    };
  });

  const volunteers = NP_VOLUNTEER_NAMES.map((name, i) => {
    const join = new Date(today.getTime() - Math.round(30 + rnd() * 1400) * 86400000);
    const status = rnd() < 0.78 ? 'Active' : (rnd() < 0.5 ? 'Onboarding' : 'Inactive');
    return {
      id: i + 1, Name: name, Role: pick(NP_ROLES), Program: pick(NP_PROGRAMS)[0],
      HoursLogged: Math.round(8 + rnd() * 240), Status: status, JoinDate: npIso(join),
      Email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.org',
      BackgroundCheck: status === 'Onboarding' ? rnd() < 0.4 : true,
    };
  });

  const programs = NP_PROGRAMS.map(([program, focus, location, lat, lon, lead], i) => {
    // Kept in the same order of magnitude as the income above (donations + grants awarded), so the
    // dashboard's money story is internally coherent rather than budgeting far beyond what it raises.
    const budget = Math.round((15000 + rnd() * 55000) / 1000) * 1000;
    return {
      id: i + 1, Program: program, Focus: focus, Location: location,
      PeopleServed: Math.round(180 + rnd() * 3200), Budget: budget,
      Spent: Math.round(budget * (0.35 + rnd() * 0.55) / 1000) * 1000, Lead: lead,
      Latitude: lat, Longitude: lon,
    };
  });

  // Events span past and upcoming so the capacity bars show both sold-out and filling events.
  const events = NP_EVENTS.map(([event, location], i) => {
    const date = new Date(today.getTime() + Math.round(-90 + rnd() * 210) * 86400000);
    const capacity = [60, 120, 200, 250, 400][Math.floor(rnd() * 5)];
    const registered = Math.min(capacity, Math.round(capacity * (0.42 + rnd() * 0.62)));
    return {
      id: i + 1, Event: event, Date: npIso(date), Location: location, Capacity: capacity,
      Registered: registered, PercentFull: Math.round((registered / capacity) * 100),
      TicketRevenue: Math.round(registered * (15 + rnd() * 60) / 5) * 5,
      Coordinator: pick(['Grace Kim', 'Tom Becker', 'Elena Novak', 'Jamal Wright']),
    };
  });

  return {
    defaultTable: 'Donations',
    tables: {
      Donations: { id: 'Donations', label: 'Donations', columns: NP_DONATIONS_COLUMNS, records: donations },
      Grants: { id: 'Grants', label: 'Grants', columns: NP_GRANTS_COLUMNS, records: grants },
      Volunteers: { id: 'Volunteers', label: 'Volunteers', columns: NP_VOLUNTEERS_COLUMNS, records: volunteers },
      Programs: { id: 'Programs', label: 'Programs', columns: NP_PROGRAMS_COLUMNS, records: programs },
      Events: { id: 'Events', label: 'Events', columns: NP_EVENTS_COLUMNS, records: events },
    },
  };
}

// ---- Developers: an engineering cockpit across the delivery lifecycle ----
// Grist's engineering material lives in separate, internal docs — Requirements Traceability
// (ARS requirements ↔ Verifications with pass criteria ↔ Validation, plus Risks and
// Non_compliance), Test Data Logger (Devices/Test_Setups/Test_Runs/Measurements) and Project
// Management (Projects/All_Tasks). None of them is publishable. This widget publishes, so the win
// is one live page covering build → test → ship → run → measure: Issues, TestRuns, Releases,
// Incidents, Services. Beyond the sources: a draggable release calendar, incident MTTR, a
// pass-rate trend, and a per-region services map.
const DEV_COMPONENTS = ['API Gateway', 'Auth', 'Billing', 'Search', 'Notifications', 'Webhooks', 'Data Export', 'Web App'];
const DEV_ENGINEERS = ['Mei Tanaka', 'Priya Natarajan', 'Tom Reilly', 'Sofia Alvarez', 'Kwame Boateng', 'Lars Eriksen', 'Hana Kim'];
const DEV_ISSUE_TITLES = {
  Bug: ['Race condition on token refresh', 'Pagination cursor skips last page', 'Webhook retries fire twice',
    'Timezone off by one on export', 'Search returns stale results after delete', '500 on empty filter payload'],
  Feature: ['Add cursor pagination to /records', 'Bulk upsert endpoint', 'Webhook signature verification',
    'Per-key rate limit headers', 'CSV streaming export', 'Scoped API tokens'],
  Chore: ['Bump Node to 22 LTS', 'Rotate staging credentials', 'Prune unused indexes', 'Upgrade CI runners'],
  'Tech debt': ['Extract auth middleware', 'Replace ad-hoc retry logic', 'Consolidate error envelopes', 'Delete legacy v1 routes'],
};
const DEV_REGIONS = [
  ['us-east-1', 38.95, -77.45], ['us-west-2', 45.87, -119.69], ['eu-west-1', 53.35, -6.26],
  ['eu-central-1', 50.11, 8.68], ['ap-southeast-1', 1.35, 103.82], ['ap-northeast-1', 35.68, 139.69],
];
const DEV_SUITES = ['Unit', 'Integration', 'End-to-end', 'Contract', 'Load'];
const DEV_INCIDENT_SUMMARIES = ['Elevated 5xx on write path', 'Auth token validation latency spike',
  'Search index replication lag', 'Webhook delivery backlog', 'Billing webhook timeouts', 'Partial region failover'];

const devIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DEV_ISSUES_COLUMNS = [
  { id: 'Key', label: 'Key', type: 'Text' }, { id: 'Title', label: 'Title', type: 'Text' },
  { id: 'Type', label: 'Type', type: 'Choice' }, { id: 'Priority', label: 'Priority', type: 'Choice' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Component', label: 'Component', type: 'Choice' },
  { id: 'Assignee', label: 'Assignee', type: 'Text' }, { id: 'Opened', label: 'Opened', type: 'Date' },
  { id: 'Points', label: 'Points', type: 'Numeric' }, { id: 'IsOpen', label: 'Open', type: 'Numeric' },
  { id: 'IsBug', label: 'Is Bug', type: 'Numeric' },
];
const DEV_RELEASES_COLUMNS = [
  { id: 'Version', label: 'Version', type: 'Text' }, { id: 'ReleaseDate', label: 'Release Date', type: 'Date' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Owner', label: 'Release Owner', type: 'Text' },
  { id: 'IssuesShipped', label: 'Issues Shipped', type: 'Numeric' }, { id: 'Notes', label: 'Notes', type: 'Text' },
];
const DEV_INCIDENTS_COLUMNS = [
  { id: 'IncidentID', label: 'Incident', type: 'Text' }, { id: 'Service', label: 'Service', type: 'Text' },
  { id: 'Severity', label: 'Severity', type: 'Choice' }, { id: 'StartedAt', label: 'Started', type: 'Date' },
  { id: 'DowntimeMinutes', label: 'Downtime (min)', type: 'Numeric' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'Summary', label: 'Summary', type: 'Text' },
];
const DEV_SERVICES_COLUMNS = [
  { id: 'Service', label: 'Service', type: 'Text' }, { id: 'Owner', label: 'Owner', type: 'Text' },
  { id: 'Region', label: 'Region', type: 'Choice' }, { id: 'Uptime', label: 'Uptime %', type: 'Numeric' },
  { id: 'P95Latency', label: 'p95 Latency (ms)', type: 'Numeric' }, { id: 'ErrorRate', label: 'Error Rate %', type: 'Numeric' },
  { id: 'RequestsPerDay', label: 'Requests / Day', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const DEV_TESTRUNS_COLUMNS = [
  { id: 'Suite', label: 'Suite', type: 'Choice' }, { id: 'RunDate', label: 'Run Date', type: 'Date' },
  { id: 'Platform', label: 'Platform', type: 'Choice' }, { id: 'Passed', label: 'Passed', type: 'Numeric' },
  { id: 'Failed', label: 'Failed', type: 'Numeric' }, { id: 'Total', label: 'Total', type: 'Numeric' },
  { id: 'PassRate', label: 'Pass Rate %', type: 'Numeric' }, { id: 'Coverage', label: 'Coverage %', type: 'Numeric' },
  { id: 'DurationMin', label: 'Duration (min)', type: 'Numeric' },
];

function buildDevelopersData() {
  const rnd = mulberry32(9001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const r2 = (n) => Math.round(n * 100) / 100;

  const services = [
    ['API Gateway', 0.35], ['Auth', 0.18], ['Billing', 0.06], ['Search', 0.14],
    ['Notifications', 0.09], ['Webhooks', 0.07], ['Data Export', 0.04], ['Web App', 0.07],
  ].map(([name, share], i) => {
    const [region, lat, lon] = DEV_REGIONS[i % DEV_REGIONS.length];
    return {
      id: i + 1, Service: name, Owner: DEV_ENGINEERS[i % DEV_ENGINEERS.length], Region: region,
      Uptime: r2(99.5 + rnd() * 0.49), P95Latency: Math.round(45 + rnd() * 320),
      ErrorRate: r2(0.02 + rnd() * 0.9), RequestsPerDay: Math.round(2_400_000 * share * (0.8 + rnd() * 0.4)),
      Latitude: lat, Longitude: lon,
    };
  });

  const issues = [];
  for (let i = 0; i < 44; i++) {
    // A healthy backlog mix — roughly a third bugs, a third new work, the rest upkeep. (An earlier
    // pass made it ~60% bugs, which reads as a troubled product rather than a well-run one.)
    const tr0 = rnd();
    const type = tr0 < 0.34 ? 'Bug' : tr0 < 0.68 ? 'Feature' : tr0 < 0.84 ? 'Chore' : 'Tech debt';
    const opened = new Date(today.getTime() - Math.round(rnd() * 120) * 86400000);
    // P0s are rare and get closed; low-priority work lingers — that's what makes a backlog look real.
    const pr = rnd();
    const priority = pr < 0.06 ? 'P0' : pr < 0.28 ? 'P1' : pr < 0.66 ? 'P2' : 'P3';
    const closedChance = priority === 'P0' ? 0.95 : priority === 'P1' ? 0.72 : priority === 'P2' ? 0.55 : 0.35;
    const done = rnd() < closedChance;
    const status = done ? 'Done' : (rnd() < 0.35 ? 'In progress' : (rnd() < 0.4 ? 'In review' : 'Backlog'));
    issues.push({
      id: i + 1, Key: 'ENG-' + (1200 + i), Title: pick(DEV_ISSUE_TITLES[type]), Type: type, Priority: priority,
      Status: status, Component: pick(DEV_COMPONENTS), Assignee: pick(DEV_ENGINEERS), Opened: devIso(opened),
      Points: [1, 2, 3, 5, 8][Math.floor(rnd() * 5)], IsOpen: status === 'Done' ? 0 : 1, IsBug: type === 'Bug' ? 1 : 0,
    });
  }

  // Releases: shipped history plus scheduled work clustered near today, so the release calendar
  // always has something in the current month to drag.
  const releases = [];
  for (let i = 0; i < 11; i++) {
    const offset = i < 6 ? Math.round(-150 + (i * 22) + rnd() * 8) : Math.round(-10 + (i - 6) * 11 + rnd() * 5);
    const date = new Date(today); date.setDate(date.getDate() + offset);
    // Anything already past shipped (a couple got reverted); the next three weeks are in QA, and
    // beyond that is still planned — which is the state the Quality page's accordion describes.
    const status = offset < -3 ? (rnd() < 0.85 ? 'Released' : 'Rolled back') : (offset < 21 ? 'In QA' : 'Planned');
    releases.push({
      id: i + 1, Version: `v2.${i + 4}.0`, ReleaseDate: devIso(date), Status: status,
      Owner: pick(DEV_ENGINEERS), IssuesShipped: Math.round(4 + rnd() * 22),
      Notes: status === 'Rolled back' ? 'Reverted after elevated error rate on the write path.' : 'Routine release.',
    });
  }

  const incidents = [];
  for (let i = 0; i < 14; i++) {
    const started = new Date(today.getTime() - Math.round(rnd() * 150) * 86400000);
    const sv = rnd();
    const severity = sv < 0.14 ? 'SEV1' : sv < 0.45 ? 'SEV2' : 'SEV3';
    const downtime = severity === 'SEV1' ? Math.round(35 + rnd() * 130) : severity === 'SEV2' ? Math.round(12 + rnd() * 70) : Math.round(3 + rnd() * 25);
    incidents.push({
      id: i + 1, IncidentID: 'INC-' + (300 + i), Service: pick(services).Service, Severity: severity,
      StartedAt: devIso(started), DowntimeMinutes: downtime,
      Status: rnd() < 0.9 ? 'Resolved' : 'Monitoring', Summary: pick(DEV_INCIDENT_SUMMARIES),
    });
  }

  const testRuns = [];
  for (let i = 0; i < 30; i++) {
    const runDate = new Date(today.getTime() - Math.round(rnd() * 75) * 86400000);
    const suite = pick(DEV_SUITES);
    const total = suite === 'Unit' ? Math.round(900 + rnd() * 700) : suite === 'Integration' ? Math.round(180 + rnd() * 220) : Math.round(30 + rnd() * 90);
    const failed = Math.round(rnd() * (rnd() < 0.72 ? total * 0.02 : total * 0.09));
    const passed = total - failed;
    testRuns.push({
      id: i + 1, Suite: suite, RunDate: devIso(runDate), Platform: pick(['Linux', 'macOS', 'Windows']),
      Passed: passed, Failed: failed, Total: total, PassRate: r2((passed / total) * 100),
      Coverage: r2(72 + rnd() * 21), DurationMin: r2(suite === 'Unit' ? 1 + rnd() * 4 : 4 + rnd() * 26),
    });
  }

  return {
    defaultTable: 'Issues',
    tables: {
      Issues: { id: 'Issues', label: 'Issues', columns: DEV_ISSUES_COLUMNS, records: issues },
      Releases: { id: 'Releases', label: 'Releases', columns: DEV_RELEASES_COLUMNS, records: releases },
      Incidents: { id: 'Incidents', label: 'Incidents', columns: DEV_INCIDENTS_COLUMNS, records: incidents },
      Services: { id: 'Services', label: 'Services', columns: DEV_SERVICES_COLUMNS, records: services },
      TestRuns: { id: 'TestRuns', label: 'Test runs', columns: DEV_TESTRUNS_COLUMNS, records: testRuns },
    },
  };
}

// ---- Legal: a matter-centric firm cockpit ----
// Grist splits this across separate internal docs: Expert Witness Database (All_Expert_Witnesses
// with a CV attachment, "Worked for us?" flag and a two-level Primary/Secondary field taxonomy —
// the primary is a formula derived from the secondary) and Tracking Time + Invoicing (Clients with
// Rate_per_Hour → Projects rolling up Hours/Amount → Time_Log where Amount = Duration_hrs ×
// client rate, with Mark_Start/Mark_End checkbox stopwatch → Invoices where Subtotal = Hours ×
// rate and Due = invoice date + 30 days). Neither is publishable.
//
// Unified here into Matters / TimeEntries / Clients / ExpertWitnesses / Invoices, plus the things
// no source computes: realization rate, profitability by practice area (a named pain point) and a
// calendar of court dates — the highest-stakes dates in the whole practice.
//
// CONFIDENTIALITY: the sources rely on access rules and "ethical walls". This widget publishes, so
// matters are identified by number + practice area with no party names, and the copy tells firms to
// keep matter detail and rates behind Grist access rules and publish only the roll-ups.
const LG_PRACTICE = ['Corporate', 'Litigation', 'Employment', 'Real Estate', 'Intellectual Property', 'Family', 'Immigration'];
const LG_ATTORNEYS = ['R. Whitfield', 'S. Okafor', 'M. Delgado', 'A. Lindqvist', 'J. Chen', 'P. Nair', 'T. Brennan'];
const LG_STATUSES = ['Intake', 'Open', 'In discovery', 'Trial prep', 'Settled', 'Closed'];
const LG_FEE_TYPES = ['Hourly', 'Contingency', 'Flat fee'];
const LG_CLIENTS = [
  ['Harbour Freight Ltd', 'Dana Cole', 'Boston', 'MA', 42.36, -71.06, 420],
  ['Meridian Biotech', 'Erik Olsen', 'Cambridge', 'MA', 42.37, -71.11, 480],
  ['Cedar Mills Group', 'Priya Nair', 'Chicago', 'IL', 41.88, -87.63, 350],
  ['Northgate Realty', 'Tom Becker', 'Denver', 'CO', 39.74, -104.99, 310],
  ['Vantage Robotics', 'Aisha Khan', 'San Francisco', 'CA', 37.77, -122.42, 550],
  ['Ashcroft Holdings', 'Liu Wei', 'New York', 'NY', 40.71, -74.01, 620],
  ['Bluewater Shipping', 'Sofia Rossi', 'Miami', 'FL', 25.76, -80.19, 390],
  ['Orchard Health Partners', 'Grace Kim', 'Atlanta', 'GA', 33.75, -84.39, 445],
];
// Two-level expertise taxonomy, mirroring the source's Primary_Fields / Secondary_Fields pair.
const LG_EXPERT_FIELDS = [
  ['Medical', ['Orthopaedics', 'Neurology', 'Toxicology', 'Emergency medicine']],
  ['Engineering', ['Structural', 'Automotive', 'Electrical', 'Materials failure']],
  ['Financial', ['Forensic accounting', 'Business valuation', 'Economic loss']],
  ['Technology', ['Software forensics', 'Cybersecurity', 'Patent analysis']],
  ['Human factors', ['Accident reconstruction', 'Ergonomics']],
];
const LG_EXPERT_NAMES = ['Dr. Helen Ward', 'Dr. Marcus Reyes', 'Dr. Anika Sharma', 'Prof. David Kaur',
  'Dr. Elena Fischer', 'Dr. Samuel Adeyemi', 'Prof. Yuki Nakamura', 'Dr. Claire Dubois',
  'Dr. Omar Haddad', 'Prof. Ingrid Larsen', 'Dr. Nathan Cole', 'Dr. Rosa Martinez'];
const LG_WORK_DESCS = ['Document review', 'Client conference', 'Drafting motion', 'Deposition prep',
  'Court appearance', 'Discovery review', 'Contract negotiation', 'Legal research', 'Settlement conference'];

const lgIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const LG_MATTERS_COLUMNS = [
  { id: 'MatterNumber', label: 'Matter', type: 'Text' }, { id: 'Client', label: 'Client', type: 'Text' },
  { id: 'PracticeArea', label: 'Practice Area', type: 'Choice' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'NextHearing', label: 'Next Court Date', type: 'Date' }, { id: 'LeadAttorney', label: 'Lead Attorney', type: 'Text' },
  { id: 'FeeType', label: 'Fee Type', type: 'Choice' }, { id: 'OpenedDate', label: 'Opened', type: 'Date' },
  { id: 'BudgetHours', label: 'Budget (hrs)', type: 'Numeric' }, { id: 'HoursLogged', label: 'Hours Logged', type: 'Numeric' },
  { id: 'Fees', label: 'Fees', type: 'Numeric' }, { id: 'IsOpen', label: 'Open', type: 'Numeric' },
];
const LG_TIME_COLUMNS = [
  { id: 'Date', label: 'Date', type: 'Date' }, { id: 'MatterNumber', label: 'Matter', type: 'Text' },
  { id: 'Attorney', label: 'Attorney', type: 'Text' }, { id: 'Description', label: 'Description', type: 'Text' },
  { id: 'Hours', label: 'Hours', type: 'Numeric' }, { id: 'Rate', label: 'Rate', type: 'Numeric' },
  { id: 'Amount', label: 'Amount', type: 'Numeric' }, { id: 'Billable', label: 'Billable', type: 'Bool' },
  { id: 'BillableHours', label: 'Billable Hours', type: 'Numeric' }, { id: 'Invoiced', label: 'Invoiced', type: 'Bool' },
];
const LG_CLIENTS_COLUMNS = [
  { id: 'Name', label: 'Client', type: 'Text' }, { id: 'Contact', label: 'Contact', type: 'Text' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'City', label: 'City', type: 'Text' },
  { id: 'State', label: 'State', type: 'Text' }, { id: 'RatePerHour', label: 'Rate / Hour', type: 'Numeric' },
  { id: 'OpenMatters', label: 'Open Matters', type: 'Numeric' }, { id: 'TotalFees', label: 'Total Fees', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const LG_EXPERTS_COLUMNS = [
  { id: 'Name', label: 'Expert', type: 'Text' }, { id: 'PrimaryField', label: 'Primary Field', type: 'Choice' },
  { id: 'SecondaryField', label: 'Secondary Field', type: 'Choice' }, { id: 'WorkedForUs', label: 'Worked For Us', type: 'Bool' },
  { id: 'CourtAppearances', label: 'Court Appearances', type: 'Numeric' }, { id: 'Publications', label: 'Publications', type: 'Numeric' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'Phone', label: 'Phone', type: 'Text' },
  { id: 'DayRate', label: 'Day Rate', type: 'Numeric' },
];
const LG_INVOICES_COLUMNS = [
  { id: 'InvoiceNumber', label: 'Invoice', type: 'Text' }, { id: 'Client', label: 'Client', type: 'Text' },
  { id: 'InvoiceDate', label: 'Invoice Date', type: 'Date' }, { id: 'DueDate', label: 'Due Date', type: 'Date' },
  { id: 'Hours', label: 'Hours', type: 'Numeric' }, { id: 'Amount', label: 'Amount', type: 'Numeric' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Outstanding', label: 'Outstanding', type: 'Numeric' },
  { id: 'Collected', label: 'Collected', type: 'Numeric' },
];

function buildLegalData() {
  const rnd = mulberry32(10001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const r2 = (n) => Math.round(n * 100) / 100;

  // Matters. Court dates use the two-regime trick: live matters get a hearing in the next few
  // weeks (that's what fills the calendar's current month); resolved ones have none.
  const matters = [];
  for (let i = 0; i < 26; i++) {
    const client = pick(LG_CLIENTS);
    const st = rnd();
    const status = st < 0.10 ? 'Intake' : st < 0.36 ? 'Open' : st < 0.56 ? 'In discovery'
      : st < 0.68 ? 'Trial prep' : st < 0.84 ? 'Settled' : 'Closed';
    const isOpen = !['Settled', 'Closed'].includes(status);
    const opened = new Date(today.getTime() - Math.round(20 + rnd() * 700) * 86400000);
    // Only live matters have a next court date, and only litigation-ish ones reliably do.
    const hearing = isOpen && rnd() < 0.8
      ? (() => { const d = new Date(today); d.setDate(d.getDate() + Math.round(-6 + rnd() * 52)); return lgIso(d); })()
      : null;
    const budget = [40, 60, 80, 120, 200, 300][Math.floor(rnd() * 6)];
    const logged = r2(budget * (0.2 + rnd() * 0.95));
    matters.push({
      id: i + 1, MatterNumber: `M-${2400 + i}`, Client: client[0], PracticeArea: pick(LG_PRACTICE),
      Status: status, NextHearing: hearing, LeadAttorney: pick(LG_ATTORNEYS), FeeType: pick(LG_FEE_TYPES),
      OpenedDate: lgIso(opened), BudgetHours: budget, HoursLogged: logged,
      Fees: Math.round(logged * client[6]), IsOpen: isOpen ? 1 : 0,
    });
  }

  // Time entries, priced off the client's rate exactly like the source's
  // Amount = Duration_hrs × Client.Rate_per_Hour.
  const timeEntries = [];
  for (let i = 0; i < 60; i++) {
    const matter = pick(matters);
    const client = LG_CLIENTS.find((c) => c[0] === matter.Client);
    const date = new Date(today.getTime() - Math.round(rnd() * 120) * 86400000);
    const hours = r2(0.25 + rnd() * 6.5);
    const billable = rnd() < 0.82; // the other ~18% is what makes realization interesting
    const rate = client[6];
    timeEntries.push({
      id: i + 1, Date: lgIso(date), MatterNumber: matter.MatterNumber, Attorney: matter.LeadAttorney,
      Description: pick(LG_WORK_DESCS), Hours: hours, Rate: rate,
      Amount: billable ? Math.round(hours * rate) : 0, Billable: billable,
      BillableHours: billable ? hours : 0, Invoiced: billable ? rnd() < 0.7 : false,
    });
  }

  const clients = LG_CLIENTS.map(([name, contact, city, state, lat, lon, rate], i) => {
    const mine = matters.filter((m) => m.Client === name);
    return {
      id: i + 1, Name: name, Contact: contact,
      Email: contact.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com',
      City: city, State: state, RatePerHour: rate,
      OpenMatters: mine.reduce((s, m) => s + m.IsOpen, 0),
      TotalFees: mine.reduce((s, m) => s + m.Fees, 0), Latitude: lat, Longitude: lon,
    };
  });

  const experts = LG_EXPERT_NAMES.map((name, i) => {
    const [primary, secondaries] = LG_EXPERT_FIELDS[i % LG_EXPERT_FIELDS.length];
    return {
      id: i + 1, Name: name, PrimaryField: primary, SecondaryField: pick(secondaries),
      WorkedForUs: rnd() < 0.45, CourtAppearances: Math.round(rnd() * 40),
      Publications: Math.round(rnd() * 60),
      Email: name.toLowerCase().replace(/^(dr|prof)\.\s*/, '').replace(/[^a-z]+/g, '.') + '@experts.example.com',
      Phone: '+1 (555) 0' + String(20 + i).padStart(2, '0') + '-' + String(1000 + i * 7).slice(0, 4),
      DayRate: Math.round((2200 + rnd() * 5800) / 50) * 50,
    };
  });

  // Invoices — Due = invoice date + 30 days, exactly as the source computes it. Date arithmetic
  // goes through setDate(), not millisecond addition: adding 30×86400000 ms across a daylight-saving
  // boundary lands on a different local wall-clock time, so the formatted dates come out 31 days
  // apart instead of 30 and the "+30 days" promise quietly breaks twice a year.
  const invoices = [];
  for (let i = 0; i < 22; i++) {
    const client = pick(LG_CLIENTS);
    const invDate = new Date(today); invDate.setDate(invDate.getDate() - Math.round(5 + rnd() * 150));
    const due = new Date(invDate); due.setDate(due.getDate() + 30);
    const hours = r2(4 + rnd() * 60);
    const amount = Math.round(hours * client[6]);
    let status;
    if (due < today) status = rnd() < 0.75 ? 'Paid' : 'Overdue';
    else status = rnd() < 0.85 ? 'Sent' : 'Draft';
    invoices.push({
      id: i + 1, InvoiceNumber: 'LI-' + (5100 + i), Client: client[0], InvoiceDate: lgIso(invDate),
      DueDate: lgIso(due), Hours: hours, Amount: amount, Status: status,
      Outstanding: (status === 'Sent' || status === 'Overdue') ? amount : 0,
      Collected: status === 'Paid' ? amount : 0,
    });
  }

  return {
    defaultTable: 'Matters',
    tables: {
      Matters: { id: 'Matters', label: 'Matters', columns: LG_MATTERS_COLUMNS, records: matters },
      TimeEntries: { id: 'TimeEntries', label: 'Time entries', columns: LG_TIME_COLUMNS, records: timeEntries },
      Clients: { id: 'Clients', label: 'Clients', columns: LG_CLIENTS_COLUMNS, records: clients },
      ExpertWitnesses: { id: 'ExpertWitnesses', label: 'Expert witnesses', columns: LG_EXPERTS_COLUMNS, records: experts },
      Invoices: { id: 'Invoices', label: 'Invoices', columns: LG_INVOICES_COLUMNS, records: invoices },
    },
  };
}

// ---- Small Business: running the business, not closing the books ----
// Grounded in three Grist docs: Account-based Sales Team (Companies.Account_Owner cascading into
// Contacts.Contact_Owner and Deals.Deal_Owner — the pattern its access rules rely on; Deal_Stage
// runs Cold → Responsive → Negotiating → Deal Closed), Payroll (Payment = Hours × a rate looked up
// per person+role) and Expense Tracking for Teams (Account + Expense_Type + receipt, employee
// auto-filled). Deliberately positioned AGAINST our Finance template: that one closes the books
// (invoices/AR/cash flow), this one runs the business — pipeline first, then the people and costs
// behind it. Beyond the sources: a dated, draggable close-date forecast and a weighted pipeline,
// both explicitly absent from the ABM doc.
const SB_OWNERS = ['Ravi Patel', 'Jess Moreau', 'Dan Whitlock', 'Amara Osei'];
const SB_INDUSTRIES = ['Construction', 'Hospitality', 'Retail', 'Healthcare', 'Manufacturing', 'Professional services', 'Education'];
const SB_COMPANIES = [
  ['Bridgeway Construction', 'Construction', 'Austin', 'TX', 30.27, -97.74],
  ['The Copper Kettle', 'Hospitality', 'Portland', 'OR', 45.52, -122.68],
  ['Fairfield Grocers', 'Retail', 'Chicago', 'IL', 41.88, -87.63],
  ['Lakeside Dental Group', 'Healthcare', 'Minneapolis', 'MN', 44.98, -93.27],
  ['Ironwood Fabrication', 'Manufacturing', 'Cleveland', 'OH', 41.50, -81.69],
  ['Hartley & Rowe', 'Professional services', 'Boston', 'MA', 42.36, -71.06],
  ['Northside Academy', 'Education', 'Denver', 'CO', 39.74, -104.99],
  ['Maple Street Cafe', 'Hospitality', 'Nashville', 'TN', 36.16, -86.78],
  ['Summit Auto Parts', 'Retail', 'Phoenix', 'AZ', 33.45, -112.07],
  ['Riverbend Clinic', 'Healthcare', 'Kansas City', 'MO', 39.10, -94.58],
  ['Granite Peak Builders', 'Construction', 'Salt Lake City', 'UT', 40.76, -111.89],
  ['Wren & Co Printing', 'Professional services', 'Raleigh', 'NC', 35.78, -78.64],
];
const SB_FIRST = ['Alice', 'Marcus', 'Priya', 'Tom', 'Sofia', 'Chen', 'Grace', 'Miguel', 'Hana', 'Owen', 'Nadia', 'Sam'];
const SB_LAST = ['Reed', 'Delgado', 'Kaur', 'Byrne', 'Rossi', 'Lin', 'Adeyemi', 'Santos', 'Ito', 'Fletcher', 'Volkov', 'Barnes'];
const SB_TITLES = ['Owner', 'Operations Manager', 'Office Manager', 'Purchasing Lead', 'Finance Director', 'General Manager'];
const SB_STAGES = ['Cold', 'Contacted', 'Responsive', 'Negotiating', 'Won', 'Lost'];
const SB_TEAM = [
  ['Ravi Patel', 'Sales Lead', 'Sales', 46], ['Jess Moreau', 'Account Executive', 'Sales', 38],
  ['Dan Whitlock', 'Account Executive', 'Sales', 38], ['Amara Osei', 'Customer Success', 'Service', 34],
  ['Leo Fontaine', 'Installer', 'Operations', 29], ['Marta Silva', 'Installer', 'Operations', 29],
  ['Kofi Mensah', 'Bookkeeper', 'Admin', 32],
];
const SB_EXPENSE_CATS = [
  ['Vehicle & fuel', 'Operations'], ['Tools & equipment', 'Operations'], ['Software', 'Administration'],
  ['Advertising', 'Marketing'], ['Client entertainment', 'Sales'], ['Insurance', 'Administration'],
  ['Materials', 'Operations'], ['Training', 'Administration'], ['Phone & internet', 'Administration'],
  ['Trade show', 'Marketing'],
];
const SB_EXPENSE_DESCS = {
  'Vehicle & fuel': ['Van fuel', 'Vehicle service', 'Parking & tolls'],
  'Tools & equipment': ['Replacement drill set', 'Ladder', 'Safety gear'],
  Software: ['Grist Team plan', 'Accounting software', 'Scheduling app'],
  Advertising: ['Local radio spot', 'Google Ads', 'Sponsored newsletter'],
  'Client entertainment': ['Client lunch', 'Coffee with prospect'],
  Insurance: ['Liability premium', 'Vehicle insurance'],
  Materials: ['Timber order', 'Fixings & fasteners', 'Paint supplies'],
  Training: ['Safety certification', 'Sales workshop'],
  'Phone & internet': ['Mobile plan', 'Office broadband'],
  'Trade show': ['Booth fee', 'Trade show travel'],
};

const sbIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const SB_DEALS_COLUMNS = [
  { id: 'DealNumber', label: 'Deal', type: 'Text' }, { id: 'Company', label: 'Company', type: 'Text' },
  { id: 'LeadContact', label: 'Lead Contact', type: 'Text' }, { id: 'Stage', label: 'Stage', type: 'Choice' },
  { id: 'ExpectedClose', label: 'Expected Close', type: 'Date' }, { id: 'Amount', label: 'Amount', type: 'Numeric' },
  { id: 'Owner', label: 'Owner', type: 'Text' }, { id: 'OpenAmount', label: 'Open Value', type: 'Numeric' },
  { id: 'WonAmount', label: 'Won Value', type: 'Numeric' }, { id: 'IsOpen', label: 'Open', type: 'Numeric' },
  { id: 'IsWon', label: 'Won', type: 'Numeric' },
];
const SB_COMPANIES_COLUMNS = [
  { id: 'Name', label: 'Company', type: 'Text' }, { id: 'Industry', label: 'Industry', type: 'Choice' },
  { id: 'City', label: 'City', type: 'Text' }, { id: 'State', label: 'State', type: 'Text' },
  { id: 'AccountOwner', label: 'Account Owner', type: 'Text' }, { id: 'Phone', label: 'Phone', type: 'Text' },
  { id: 'OpenDeals', label: 'Open Deals', type: 'Numeric' }, { id: 'TotalValue', label: 'Pipeline Value', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const SB_CONTACTS_COLUMNS = [
  { id: 'FullName', label: 'Contact', type: 'Text' }, { id: 'Title', label: 'Title', type: 'Text' },
  { id: 'Company', label: 'Company', type: 'Text' }, { id: 'Owner', label: 'Owner', type: 'Text' },
  { id: 'Email', label: 'Email', type: 'Text' }, { id: 'Phone', label: 'Phone', type: 'Text' },
  { id: 'LastInteraction', label: 'Last Contacted', type: 'Date' }, { id: 'Interactions', label: 'Interactions', type: 'Numeric' },
];
const SB_TEAM_COLUMNS = [
  { id: 'Name', label: 'Team Member', type: 'Text' }, { id: 'Role', label: 'Role', type: 'Text' },
  { id: 'Department', label: 'Department', type: 'Choice' }, { id: 'PayPeriod', label: 'Pay Period', type: 'Date' },
  { id: 'Hours', label: 'Hours', type: 'Numeric' }, { id: 'HourlyRate', label: 'Hourly Rate', type: 'Numeric' },
  { id: 'Payment', label: 'Payment', type: 'Numeric' },
];
const SB_EXPENSES_COLUMNS = [
  { id: 'Date', label: 'Date', type: 'Date' }, { id: 'Account', label: 'Account', type: 'Choice' },
  { id: 'Category', label: 'Category', type: 'Choice' }, { id: 'Description', label: 'Description', type: 'Text' },
  { id: 'Amount', label: 'Amount', type: 'Numeric' }, { id: 'Employee', label: 'Submitted By', type: 'Text' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Reimbursable', label: 'Reimbursable', type: 'Bool' },
];

function buildSmallBusinessData() {
  const rnd = mulberry32(11001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const r2 = (n) => Math.round(n * 100) / 100;

  // Contacts first — one or two per company, owned by whoever owns the account (the source's
  // Contact_Owner = $Company.Account_Owner cascade).
  const companyOwner = {};
  SB_COMPANIES.forEach(([name], i) => { companyOwner[name] = SB_OWNERS[i % SB_OWNERS.length]; });

  const contacts = [];
  SB_COMPANIES.forEach(([company], i) => {
    const n = 1 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const first = SB_FIRST[(i * 2 + k) % SB_FIRST.length];
      const last = SB_LAST[(i * 3 + k) % SB_LAST.length];
      const last1 = new Date(today); last1.setDate(last1.getDate() - Math.round(rnd() * 70));
      contacts.push({
        id: contacts.length + 1, FullName: `${first} ${last}`, Title: pick(SB_TITLES), Company: company,
        Owner: companyOwner[company],
        Email: `${first.toLowerCase()}.${last.toLowerCase()}@${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
        Phone: '+1 (555) ' + String(200 + contacts.length).padStart(3, '0') + '-' + String(1000 + contacts.length * 13).slice(0, 4),
        LastInteraction: sbIso(last1), Interactions: Math.round(1 + rnd() * 11),
      });
    }
  });

  // Deals. Two regimes so the forecast reads honestly: settled history (won/lost, giving a real
  // win rate) plus live deals closing in the next few weeks — which is what fills the calendar.
  const deals = [];
  for (let i = 0; i < 28; i++) {
    const contact = pick(contacts);
    const settled = rnd() < 0.45;
    const offset = settled ? Math.round(-160 + rnd() * 145) : Math.round(-5 + rnd() * 55);
    const close = new Date(today); close.setDate(close.getDate() + offset);
    const amount = Math.round((1200 + rnd() * 46000) / 100) * 100;
    let stage;
    // ~48% expected win rate. A small trade business with warm referrals wins more than a cold
    // outbound team would, but anything much above 60% reads as fantasy on a demo dashboard.
    if (offset < 0) stage = rnd() < 0.48 ? 'Won' : 'Lost';
    else { const s = rnd(); stage = s < 0.28 ? 'Cold' : s < 0.55 ? 'Contacted' : s < 0.8 ? 'Responsive' : 'Negotiating'; }
    const isWon = stage === 'Won', isOpen = !['Won', 'Lost'].includes(stage);
    deals.push({
      id: i + 1, DealNumber: contact.Company.slice(0, 3).toUpperCase() + '-' + (400 + i),
      Company: contact.Company, LeadContact: contact.FullName, Stage: stage,
      ExpectedClose: sbIso(close), Amount: amount, Owner: companyOwner[contact.Company],
      OpenAmount: isOpen ? amount : 0, WonAmount: isWon ? amount : 0,
      IsOpen: isOpen ? 1 : 0, IsWon: isWon ? 1 : 0,
    });
  }

  const companies = SB_COMPANIES.map(([name, industry, city, state, lat, lon], i) => {
    const mine = deals.filter((d) => d.Company === name);
    return {
      id: i + 1, Name: name, Industry: industry, City: city, State: state,
      AccountOwner: companyOwner[name],
      Phone: '+1 (555) ' + String(700 + i).padStart(3, '0') + '-' + String(2000 + i * 17).slice(0, 4),
      OpenDeals: mine.reduce((s, d) => s + d.IsOpen, 0),
      TotalValue: mine.reduce((s, d) => s + d.OpenAmount, 0),
      Latitude: lat, Longitude: lon,
    };
  });

  // Payroll-lite: Payment = Hours × HourlyRate, four monthly periods (the source's model minus the
  // effective-dated rate lookup, which needs a second table a small business rarely keeps).
  const team = []; let tid = 1;
  for (let m = 3; m >= 0; m--) {
    const period = new Date(today.getFullYear(), today.getMonth() - m, 1);
    for (const [name, role, dept, rate] of SB_TEAM) {
      const hours = Math.round(120 + rnd() * 60);
      team.push({ id: tid++, Name: name, Role: role, Department: dept, PayPeriod: sbIso(period), Hours: hours, HourlyRate: rate, Payment: r2(hours * rate) });
    }
  }

  const expenses = [];
  for (let i = 0; i < 40; i++) {
    const [cat, account] = pick(SB_EXPENSE_CATS);
    const date = new Date(today); date.setDate(date.getDate() - Math.round(rnd() * 140));
    expenses.push({
      id: i + 1, Date: sbIso(date), Account: account, Category: cat,
      Description: pick(SB_EXPENSE_DESCS[cat]),
      Amount: r2(15 + rnd() * (cat === 'Tools & equipment' || cat === 'Insurance' || cat === 'Trade show' ? 2600 : 520)),
      Employee: pick(SB_TEAM)[0], Status: rnd() < 0.78 ? 'Approved' : 'Pending', Reimbursable: rnd() < 0.45,
    });
  }

  return {
    defaultTable: 'Deals',
    tables: {
      Deals: { id: 'Deals', label: 'Deals', columns: SB_DEALS_COLUMNS, records: deals },
      Companies: { id: 'Companies', label: 'Companies', columns: SB_COMPANIES_COLUMNS, records: companies },
      Contacts: { id: 'Contacts', label: 'Contacts', columns: SB_CONTACTS_COLUMNS, records: contacts },
      Team: { id: 'Team', label: 'Team', columns: SB_TEAM_COLUMNS, records: team },
      Expenses: { id: 'Expenses', label: 'Expenses', columns: SB_EXPENSES_COLUMNS, records: expenses },
    },
  };
}

// ---- Higher Education: the department, not the bench ----
// Grounded in Grist's higher-ed positioning (research & lab management, grant & budget tracking,
// campus operations, student/staff administration) and two real docs: Class Enrollment
// (Classes.Max_Students with Count = len(lookupRecords(Status="Confirmed")) and
// Spots_Left = max(Max-Count,0) or "Full" — capacity as a live rollup) and the Grant Application
// Tracker (a Status pipeline with Proposal_Deadline and requested-vs-granted amounts).
//
// Positioned apart from two neighbouring templates: Research Labs covers the bench (samples,
// reagents, instruments) and Nonprofits covers charitable funding; this is the department —
// course catalogue, enrolment capacity, research funding from sponsors, faculty and campus.
//
// FERPA: the source Students table carries insurance policy numbers, physician contacts, allergies
// and medical-form attachments. This widget PUBLISHES, and US student records are legally
// protected, so students here are anonymised cohort rows — an id, programme, year, status, credits
// — with no names, contacts or health data. Faculty are public-facing and are named.
const HE_DEPARTMENTS = [
  ['Computer Science', 'Turing Building', 'Prof. Ada Okonjo', 42.3601, -71.0942],
  ['Biology', 'Franklin Hall', 'Prof. Miguel Santos', 42.3585, -71.0925],
  ['Business', 'Hartley Center', 'Prof. Ingrid Lund', 42.3572, -71.0968],
  ['Psychology', 'Willow House', 'Prof. Daniel Reyes', 42.3618, -71.0903],
  ['Engineering', 'Foundry Building', 'Prof. Sara Haddad', 42.3559, -71.0911],
  ['History', 'Old Library', 'Prof. Tomas Novak', 42.3606, -71.0887],
];
const HE_PROGRAMMES = [
  ['BSc Computer Science', 'Computer Science'], ['MSc Data Science', 'Computer Science'],
  ['BSc Biology', 'Biology'], ['PhD Molecular Biology', 'Biology'],
  ['BA Business Administration', 'Business'], ['MBA', 'Business'],
  ['BSc Psychology', 'Psychology'], ['MEng Mechanical Engineering', 'Engineering'],
  ['BA History', 'History'],
];
const HE_COURSES = [
  ['CS101', 'Introduction to Programming', 'Computer Science', 3], ['CS210', 'Data Structures', 'Computer Science', 4],
  ['CS330', 'Machine Learning', 'Computer Science', 4], ['CS450', 'Distributed Systems', 'Computer Science', 4],
  ['BIO110', 'Cell Biology', 'Biology', 3], ['BIO240', 'Genetics', 'Biology', 4],
  ['BIO360', 'Microbiology Lab', 'Biology', 4], ['BUS120', 'Principles of Management', 'Business', 3],
  ['BUS250', 'Corporate Finance', 'Business', 3], ['BUS410', 'Strategy Capstone', 'Business', 4],
  ['PSY100', 'Introduction to Psychology', 'Psychology', 3], ['PSY220', 'Research Methods', 'Psychology', 4],
  ['ENG150', 'Statics & Dynamics', 'Engineering', 4], ['ENG320', 'Thermodynamics', 'Engineering', 4],
  ['HIS130', 'Modern World History', 'History', 3], ['HIS280', 'Historiography', 'History', 3],
];
const HE_FACULTY = [
  ['Prof. Ada Okonjo', 'Computer Science', 'Professor'], ['Dr. Ravi Chandra', 'Computer Science', 'Associate Professor'],
  ['Dr. Elena Marsh', 'Computer Science', 'Lecturer'], ['Prof. Miguel Santos', 'Biology', 'Professor'],
  ['Dr. Hana Suzuki', 'Biology', 'Assistant Professor'], ['Prof. Ingrid Lund', 'Business', 'Professor'],
  ['Dr. Peter Abara', 'Business', 'Senior Lecturer'], ['Prof. Daniel Reyes', 'Psychology', 'Professor'],
  ['Dr. Claire Beaumont', 'Psychology', 'Lecturer'], ['Prof. Sara Haddad', 'Engineering', 'Professor'],
  ['Dr. Yusuf Demir', 'Engineering', 'Associate Professor'], ['Prof. Tomas Novak', 'History', 'Professor'],
];
const HE_SPONSORS = ['National Science Foundation', 'National Institutes of Health', 'Department of Energy',
  'European Research Council', 'Wellcome Trust', 'Sloan Foundation', 'State Research Council'];
const HE_GRANT_TITLES = [
  'Federated Learning for Clinical Data', 'Gut Microbiome and Metabolic Health', 'Sustainable Concrete Composites',
  'Adolescent Sleep and Attention', 'Regional Economic Mobility Study', 'Quantum Error Correction Methods',
  'Coastal Wetland Carbon Capture', 'Archival Digitisation of Civic Records', 'Protein Folding Simulation at Scale',
  'Autonomous Inspection Robotics', 'Bias Auditing in Admissions Models', 'Antibiotic Resistance Surveillance',
  'Thermal Storage for Campus Heating', 'Language Acquisition in Bilingual Children',
];
const HE_TERMS = ['Fall 2025', 'Spring 2026', 'Fall 2026'];

const heIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const HE_COURSES_COLUMNS = [
  { id: 'Code', label: 'Code', type: 'Text' }, { id: 'Title', label: 'Course', type: 'Text' },
  { id: 'Department', label: 'Department', type: 'Choice' }, { id: 'Term', label: 'Term', type: 'Choice' },
  { id: 'Instructor', label: 'Instructor', type: 'Text' }, { id: 'Enrolled', label: 'Enrolled', type: 'Numeric' },
  { id: 'Capacity', label: 'Capacity', type: 'Numeric' }, { id: 'SpotsLeft', label: 'Spots Left', type: 'Numeric' },
  { id: 'PercentFull', label: '% Full', type: 'Numeric' }, { id: 'Credits', label: 'Credits', type: 'Numeric' },
  { id: 'IsFull', label: 'Full', type: 'Numeric' },
];
const HE_STUDENTS_COLUMNS = [
  { id: 'StudentID', label: 'Student ID', type: 'Text' }, { id: 'Programme', label: 'Programme', type: 'Choice' },
  { id: 'Department', label: 'Department', type: 'Choice' }, { id: 'Year', label: 'Year', type: 'Choice' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'CreditsEarned', label: 'Credits Earned', type: 'Numeric' },
  { id: 'Advisor', label: 'Advisor', type: 'Text' }, { id: 'IsEnrolled', label: 'Enrolled', type: 'Numeric' },
];
const HE_GRANTS_COLUMNS = [
  { id: 'Title', label: 'Project', type: 'Text' }, { id: 'PrincipalInvestigator', label: 'Principal Investigator', type: 'Text' },
  { id: 'Sponsor', label: 'Sponsor', type: 'Choice' }, { id: 'Department', label: 'Department', type: 'Choice' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'ProposalDeadline', label: 'Proposal Deadline', type: 'Date' },
  { id: 'AmountRequested', label: 'Requested', type: 'Numeric' }, { id: 'AmountAwarded', label: 'Awarded', type: 'Numeric' },
  { id: 'Funded', label: 'Funded', type: 'Numeric' },
];
const HE_FACULTY_COLUMNS = [
  { id: 'Name', label: 'Faculty', type: 'Text' }, { id: 'Department', label: 'Department', type: 'Choice' },
  { id: 'Title', label: 'Title', type: 'Choice' }, { id: 'Email', label: 'Email', type: 'Text' },
  { id: 'CoursesTaught', label: 'Courses Taught', type: 'Numeric' }, { id: 'GrantsHeld', label: 'Grants Held', type: 'Numeric' },
  { id: 'ResearchFunding', label: 'Research Funding', type: 'Numeric' },
];
const HE_DEPARTMENTS_COLUMNS = [
  { id: 'Name', label: 'Department', type: 'Text' }, { id: 'Building', label: 'Building', type: 'Text' },
  { id: 'Head', label: 'Head of Department', type: 'Text' }, { id: 'StudentCount', label: 'Students', type: 'Numeric' },
  { id: 'FacultyCount', label: 'Faculty', type: 'Numeric' }, { id: 'CourseCount', label: 'Courses', type: 'Numeric' },
  { id: 'ResearchFunding', label: 'Research Funding', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];

function buildHigherEdData() {
  const rnd = mulberry32(12001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const facultyByDept = {};
  for (const [name, dept] of HE_FACULTY) { (facultyByDept[dept] ||= []).push(name); }

  // Courses — capacity as a rollup, mirroring the source's Count / Spots_Left formulas.
  const courses = HE_COURSES.map(([code, title, dept, credits], i) => {
    const capacity = [24, 30, 40, 60, 90, 120][Math.floor(rnd() * 6)];
    // Intro courses fill up (some genuinely hit capacity, so "sections full" and the waitlist
    // story mean something); senior seminars often don't. That spread is what makes the page useful.
    const isIntro = /1\d\d$/.test(code);
    const fill = isIntro ? 0.9 + rnd() * 0.28 : 0.45 + rnd() * 0.5;
    const enrolled = Math.min(capacity, Math.round(capacity * fill));
    return {
      id: i + 1, Code: code, Title: title, Department: dept, Term: pick(HE_TERMS),
      Instructor: pick(facultyByDept[dept]), Enrolled: enrolled, Capacity: capacity,
      SpotsLeft: Math.max(capacity - enrolled, 0), PercentFull: Math.round((enrolled / capacity) * 100),
      Credits: credits, IsFull: enrolled >= capacity ? 1 : 0,
    };
  });

  // Students — anonymised on purpose (see the file header). No names, no contacts, no health data.
  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate'];
  const students = [];
  for (let i = 0; i < 60; i++) {
    const [programme, dept] = pick(HE_PROGRAMMES);
    const st = rnd();
    const status = st < 0.84 ? 'Enrolled' : st < 0.9 ? 'On leave' : st < 0.96 ? 'Graduated' : 'Withdrawn';
    const year = /PhD|MSc|MBA|MEng/.test(programme) ? 'Postgraduate' : years[Math.floor(rnd() * 4)];
    students.push({
      id: i + 1, StudentID: `S-24-${String(1000 + i).slice(1)}`, Programme: programme, Department: dept,
      Year: year, Status: status, CreditsEarned: Math.round(12 + rnd() * 108),
      Advisor: pick(facultyByDept[dept]), IsEnrolled: status === 'Enrolled' ? 1 : 0,
    });
  }

  // Grants — two regimes so the pipeline has settled history (a real success rate) plus live
  // proposals due in the next few weeks, which is what fills the deadline calendar.
  const grants = HE_GRANT_TITLES.map((title, i) => {
    const historical = rnd() < 0.45;
    const offset = historical ? Math.round(-200 + rnd() * 170) : Math.round(-8 + rnd() * 55);
    const deadline = new Date(today); deadline.setDate(deadline.getDate() + offset);
    const dept = HE_DEPARTMENTS[i % HE_DEPARTMENTS.length][0];
    const requested = Math.round((45000 + rnd() * 780000) / 1000) * 1000;
    let status;
    // Research funding is genuinely competitive — NSF and NIH award roughly a fifth to a quarter of
    // proposals. A demo showing half the applications funded would misrepresent the job.
    if (offset < 0) status = rnd() < 0.28 ? 'Funded' : 'Declined';
    else status = rnd() < 0.4 ? 'Awaiting decision' : (rnd() < 0.62 ? 'Submitted' : 'In preparation');
    const funded = status === 'Funded';
    return {
      id: i + 1, Title: title, PrincipalInvestigator: pick(facultyByDept[dept]), Sponsor: pick(HE_SPONSORS),
      Department: dept, Status: status, ProposalDeadline: heIso(deadline),
      AmountRequested: requested,
      AmountAwarded: funded ? Math.round(requested * (0.55 + rnd() * 0.45) / 1000) * 1000 : 0,
      Funded: funded ? 1 : 0,
    };
  });

  const faculty = HE_FACULTY.map(([name, dept, title], i) => {
    const mine = grants.filter((g) => g.PrincipalInvestigator === name);
    return {
      id: i + 1, Name: name, Department: dept, Title: title,
      Email: name.toLowerCase().replace(/^(prof|dr)\.\s*/, '').replace(/[^a-z]+/g, '.') + '@anupress.edu',
      CoursesTaught: courses.filter((c) => c.Instructor === name).length,
      GrantsHeld: mine.reduce((s, g) => s + g.Funded, 0),
      ResearchFunding: mine.reduce((s, g) => s + g.AmountAwarded, 0),
    };
  });

  const departments = HE_DEPARTMENTS.map(([name, building, head, lat, lon], i) => ({
    id: i + 1, Name: name, Building: building, Head: head,
    StudentCount: students.filter((s) => s.Department === name).reduce((s2, s) => s2 + s.IsEnrolled, 0),
    FacultyCount: faculty.filter((f) => f.Department === name).length,
    CourseCount: courses.filter((c) => c.Department === name).length,
    ResearchFunding: grants.filter((g) => g.Department === name).reduce((s, g) => s + g.AmountAwarded, 0),
    Latitude: lat, Longitude: lon,
  }));

  return {
    defaultTable: 'Courses',
    tables: {
      Courses: { id: 'Courses', label: 'Courses', columns: HE_COURSES_COLUMNS, records: courses },
      Students: { id: 'Students', label: 'Students', columns: HE_STUDENTS_COLUMNS, records: students },
      Grants: { id: 'Grants', label: 'Research grants', columns: HE_GRANTS_COLUMNS, records: grants },
      Faculty: { id: 'Faculty', label: 'Faculty', columns: HE_FACULTY_COLUMNS, records: faculty },
      Departments: { id: 'Departments', label: 'Departments', columns: HE_DEPARTMENTS_COLUMNS, records: departments },
    },
  };
}

// ---- Sports Facility: bookings, members, classes and leagues in one place ----
// Grist's own facility page is thin (generic budget/payroll/CRM templates), so this is grounded in
// adjacent real docs instead: Sports League Standings (Wins = len(Game_Schedule.lookupRecords(
// Winner=$id)), Win_Rate = Wins/(Wins+Losses) — a standings table entirely DERIVED from results,
// never typed), Rental Management (Income_and_Expenses tracked per space with Month =
// Date.strftime("%Y-%m"), rolled up per unit — the same shape as revenue per court) and Class
// Enrollment (whose sample classes are literally "Gym Stars" and "Yoga Kids", with Max_Students /
// Count / Spots_Left). No single source joins bookings, members, classes and leagues, which is
// exactly the gap: a facility manager runs all four and otherwise keeps four spreadsheets.
const SF_FACILITIES = [
  ['Court 1 — Indoor', 'Indoor court', 40, 45, 42.3712, -71.0589],
  ['Court 2 — Indoor', 'Indoor court', 40, 45, 42.3714, -71.0592],
  ['Court 3 — Indoor', 'Indoor court', 40, 45, 42.3716, -71.0595],
  ['North Field', 'Outdoor field', 200, 60, 42.3735, -71.0611],
  ['South Field', 'Outdoor field', 200, 60, 42.3698, -71.0574],
  ['Main Pool', 'Pool', 80, 70, 42.3721, -71.0601],
  ['Studio A', 'Studio', 25, 35, 42.3708, -71.0583],
  ['Studio B', 'Studio', 25, 35, 42.3706, -71.0581],
];
const SF_MEMBER_TYPES = ['Individual', 'Family', 'Team', 'Student'];
const SF_BOOKING_TYPES = ['Member', 'Team practice', 'Event', 'Class'];
const SF_FIRST = ['Amy', 'Derek', 'Nina', 'Carlos', 'Ruth', 'Mo', 'Jenna', 'Tobias', 'Leah', 'Priya',
  'Owen', 'Sasha', 'Marcus', 'Ella', 'Diego', 'Hana', 'Colin', 'Bea'];
const SF_LAST = ['Torres', 'Snyder', 'Kowalski', 'Reyes', 'Adeyemi', 'Farouk', 'Boyd', 'Lindqvist',
  'Murray', 'Shah', 'Fletcher', 'Volkov', 'Bennett', 'Nguyen', 'Alvarez', 'Ito', 'Doyle', 'Marsh'];
const SF_CLASSES = [
  ['Junior Basketball', 'Mon', '16:00', 24], ['Adult Volleyball', 'Tue', '19:00', 30],
  ['Yoga Kids', 'Wed', '15:30', 20], ['Aqua Fitness', 'Wed', '18:00', 25],
  ['Gym Stars Advanced', 'Thu', '17:00', 18], ['Circuit Training', 'Thu', '06:30', 22],
  ['Swim School', 'Fri', '16:30', 20], ['Weekend Football Camp', 'Sat', '09:00', 40],
  ['Senior Pickleball', 'Sat', '11:00', 24], ['Family Open Gym', 'Sun', '10:00', 50],
];
const SF_TEAMS = [
  ['Riverside Rockets', 'Adult Basketball'], ['Northgate Ravens', 'Adult Basketball'],
  ['Harbour Hawks', 'Adult Basketball'], ['Eastside Eagles', 'Adult Basketball'],
  ['Sunset Strikers', 'Indoor Football'], ['Ironworks FC', 'Indoor Football'],
  ['Bayview Blaze', 'Indoor Football'], ['Old Town Owls', 'Indoor Football'],
  ['Lakeside Lions', 'Volleyball'], ['Summit Spikers', 'Volleyball'],
];

const sfIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const SF_FACILITIES_COLUMNS = [
  { id: 'Name', label: 'Facility', type: 'Text' }, { id: 'Type', label: 'Type', type: 'Choice' },
  { id: 'Capacity', label: 'Capacity', type: 'Numeric' }, { id: 'HourlyRate', label: 'Hourly Rate', type: 'Numeric' },
  { id: 'BookedHours', label: 'Booked Hours', type: 'Numeric' }, { id: 'AvailableHours', label: 'Available Hours', type: 'Numeric' },
  { id: 'UtilisationPct', label: 'Utilisation %', type: 'Numeric' }, { id: 'Revenue', label: 'Revenue', type: 'Numeric' },
  { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const SF_BOOKINGS_COLUMNS = [
  { id: 'Date', label: 'Date', type: 'Date' }, { id: 'Facility', label: 'Facility', type: 'Text' },
  { id: 'StartTime', label: 'Start', type: 'Text' }, { id: 'Hours', label: 'Hours', type: 'Numeric' },
  { id: 'BookedBy', label: 'Booked By', type: 'Text' }, { id: 'Type', label: 'Type', type: 'Choice' },
  { id: 'Revenue', label: 'Revenue', type: 'Numeric' }, { id: 'Status', label: 'Status', type: 'Choice' },
];
const SF_MEMBERS_COLUMNS = [
  { id: 'MemberID', label: 'Member ID', type: 'Text' }, { id: 'Name', label: 'Member', type: 'Text' },
  { id: 'Type', label: 'Membership', type: 'Choice' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'JoinDate', label: 'Joined', type: 'Date' }, { id: 'RenewalDate', label: 'Renews', type: 'Date' },
  { id: 'VisitsThisMonth', label: 'Visits This Month', type: 'Numeric' },
  { id: 'MonthlyFee', label: 'Monthly Fee', type: 'Numeric' }, { id: 'IsActive', label: 'Active', type: 'Numeric' },
];
const SF_CLASSES_COLUMNS = [
  { id: 'Name', label: 'Class', type: 'Text' }, { id: 'Instructor', label: 'Instructor', type: 'Text' },
  { id: 'Day', label: 'Day', type: 'Choice' }, { id: 'Time', label: 'Time', type: 'Text' },
  { id: 'Facility', label: 'Facility', type: 'Text' }, { id: 'Enrolled', label: 'Enrolled', type: 'Numeric' },
  { id: 'Capacity', label: 'Capacity', type: 'Numeric' }, { id: 'SpotsLeft', label: 'Spots Left', type: 'Numeric' },
  { id: 'IsFull', label: 'Full', type: 'Numeric' },
];
const SF_STANDINGS_COLUMNS = [
  { id: 'Team', label: 'Team', type: 'Text' }, { id: 'League', label: 'League', type: 'Choice' },
  { id: 'Played', label: 'Played', type: 'Numeric' }, { id: 'Won', label: 'Won', type: 'Numeric' },
  { id: 'Drawn', label: 'Drawn', type: 'Numeric' }, { id: 'Lost', label: 'Lost', type: 'Numeric' },
  { id: 'Points', label: 'Points', type: 'Numeric' }, { id: 'WinRate', label: 'Win Rate %', type: 'Numeric' },
];

function buildSportsFacilityData() {
  const rnd = mulberry32(13001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const r2 = (n) => Math.round(n * 100) / 100;

  const staff = ['Coach Derek Snyder', 'Amy Torres', 'Mo Farouk', 'Jenna Boyd', 'Priya Shah'];

  const members = [];
  for (let i = 0; i < 48; i++) {
    const type = pick(SF_MEMBER_TYPES);
    const join = new Date(today); join.setDate(join.getDate() - Math.round(20 + rnd() * 1200));
    // Renewal is a year on from joining, rolled forward to the next one still ahead of us.
    // Rebuilt from components each step rather than a bare setFullYear(+1): someone who joined on
    // 29 February would otherwise roll to 1 March in every non-leap year and never renew on their
    // real anniversary again. Clamping to the last day of the month is what membership systems
    // actually do.
    const renew = new Date(join.getFullYear(), join.getMonth(), join.getDate());
    while (renew < today) {
      const y = renew.getFullYear() + 1;
      const lastDayOfMonth = new Date(y, join.getMonth() + 1, 0).getDate();
      renew.setFullYear(y, join.getMonth(), Math.min(join.getDate(), lastDayOfMonth));
    }
    const status = rnd() < 0.88 ? 'Active' : (rnd() < 0.6 ? 'Lapsed' : 'Frozen');
    const fee = { Individual: 45, Family: 85, Team: 160, Student: 28 }[type];
    members.push({
      id: i + 1, MemberID: 'M-' + String(2200 + i), Name: `${SF_FIRST[i % SF_FIRST.length]} ${SF_LAST[(i * 3) % SF_LAST.length]}`,
      Type: type, Status: status, JoinDate: sfIso(join), RenewalDate: sfIso(renew),
      VisitsThisMonth: status === 'Active' ? Math.round(rnd() * 18) : 0,
      MonthlyFee: fee, IsActive: status === 'Active' ? 1 : 0,
    });
  }

  // Bookings across the last ~5 weeks and the next ~4, so the court calendar always has a busy
  // current month. Revenue is hours × the facility's own rate — the per-space money model.
  // Volume is a deliberate balance. Too few (an earlier pass used 70) and the utilisation headline
  // read 2%, making a working complex look derelict; too many and every single day on the month
  // calendar truncates to "+N more" and you can't read it. ~500 across nine weeks is about one
  // booking per facility per day — busy, believable, and still legible in a month grid.
  const bookings = [];
  const times = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
  for (let i = 0; i < 500; i++) {
    const fac = pick(SF_FACILITIES);
    const date = new Date(today); date.setDate(date.getDate() + Math.round(-35 + rnd() * 63));
    const hours = [1, 1, 1.5, 2, 2, 3][Math.floor(rnd() * 6)];
    const type = pick(SF_BOOKING_TYPES);
    const past = date < today;
    const status = past ? (rnd() < 0.94 ? 'Completed' : 'No-show') : (rnd() < 0.9 ? 'Confirmed' : 'Pending');
    const bookedBy = type === 'Team practice' ? pick(SF_TEAMS)[0]
      : type === 'Class' ? pick(SF_CLASSES)[0]
      : type === 'Event' ? pick(['Corporate away day', 'Birthday party', 'School tournament', 'Charity match'])
      : pick(members).Name;
    bookings.push({
      id: i + 1, Date: sfIso(date), Facility: fac[0], StartTime: pick(times), Hours: hours,
      BookedBy: bookedBy, Type: type,
      Revenue: status === 'No-show' ? 0 : Math.round(hours * fac[3]), Status: status,
    });
  }

  // Utilisation per facility — booked hours against what is realistically SELLABLE, which is prime
  // time (roughly four hours an evening, plus weekend daytime averaging out the same), not every
  // hour the doors are open. Measuring against a 14-hour trading day would divide by a number
  // nobody can actually fill and make a healthy facility look empty.
  const OPEN_HOURS = 4 * 7 * 9;
  const facilities = SF_FACILITIES.map(([name, type, capacity, rate, lat, lon], i) => {
    const mine = bookings.filter((b) => b.Facility === name);
    const booked = r2(mine.reduce((s, b) => s + b.Hours, 0));
    return {
      id: i + 1, Name: name, Type: type, Capacity: capacity, HourlyRate: rate,
      BookedHours: booked, AvailableHours: r2(Math.max(OPEN_HOURS - booked, 0)),
      UtilisationPct: Math.round((booked / OPEN_HOURS) * 100),
      Revenue: mine.reduce((s, b) => s + b.Revenue, 0),
      Status: rnd() < 0.9 ? 'Open' : 'Maintenance', Latitude: lat, Longitude: lon,
    };
  });

  const classes = SF_CLASSES.map(([name, day, time, capacity], i) => {
    // Kids' and weekend sessions run full; early-morning adult sessions rarely do.
    const popular = /Kids|Junior|Family|Weekend|Swim/.test(name);
    const fill = popular ? 0.9 + rnd() * 0.22 : 0.5 + rnd() * 0.45;
    const enrolled = Math.min(capacity, Math.round(capacity * fill));
    return {
      id: i + 1, Name: name, Instructor: pick(staff), Day: day, Time: time,
      Facility: pick(SF_FACILITIES)[0], Enrolled: enrolled, Capacity: capacity,
      SpotsLeft: Math.max(capacity - enrolled, 0), IsFull: enrolled >= capacity ? 1 : 0,
    };
  });

  // Standings derived from a season's results, never typed — the source's contract.
  const standings = SF_TEAMS.map(([team, league], i) => {
    const played = 12 + Math.floor(rnd() * 3);
    const won = Math.round(rnd() * played);
    const drawn = Math.min(played - won, Math.round(rnd() * 3));
    const lost = played - won - drawn;
    return {
      id: i + 1, Team: team, League: league, Played: played, Won: won, Drawn: drawn, Lost: lost,
      Points: won * 3 + drawn, WinRate: Math.round((won / played) * 100),
    };
  });

  return {
    defaultTable: 'Bookings',
    tables: {
      Bookings: { id: 'Bookings', label: 'Bookings', columns: SF_BOOKINGS_COLUMNS, records: bookings },
      Facilities: { id: 'Facilities', label: 'Facilities', columns: SF_FACILITIES_COLUMNS, records: facilities },
      Members: { id: 'Members', label: 'Members', columns: SF_MEMBERS_COLUMNS, records: members },
      Classes: { id: 'Classes', label: 'Classes', columns: SF_CLASSES_COLUMNS, records: classes },
      Standings: { id: 'Standings', label: 'League standings', columns: SF_STANDINGS_COLUMNS, records: standings },
    },
  };
}

// ---- Marketing: campaigns, content/SEO, the social calendar, events and NPS ----
// Modeled on the five real docs in Grist's own Marketing workspace (see data/templates/marketing.js
// for the mapping). The one thing every source doc leaves on the table is the NPS number itself:
// the official template buckets each response into Promoter/Passive/Detractor but never computes
// %promoters − %detractors. NpsPoints below (+100 / 0 / −100) exists so a plain average of it IS
// the NPS score, exactly, with no special-case block needed.

const MK_CAMPAIGN_COLUMNS = [
  { id: 'Name', label: 'Campaign', type: 'Text' }, { id: 'Channel', label: 'Channel', type: 'Choice' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Owner', label: 'Owner', type: 'Text' },
  { id: 'StartDate', label: 'Start Date', type: 'Date' }, { id: 'EndDate', label: 'End Date', type: 'Date' },
  { id: 'Budget', label: 'Budget', type: 'Numeric' }, { id: 'Spend', label: 'Spend', type: 'Numeric' },
  { id: 'Impressions', label: 'Impressions', type: 'Numeric' }, { id: 'Clicks', label: 'Clicks', type: 'Numeric' },
  { id: 'Leads', label: 'Leads', type: 'Numeric' }, { id: 'Customers', label: 'Customers', type: 'Numeric' },
  { id: 'Revenue', label: 'Revenue', type: 'Numeric' }, { id: 'CTR', label: 'CTR %', type: 'Numeric' },
  { id: 'CostPerLead', label: 'Cost / Lead', type: 'Numeric' }, { id: 'ROAS', label: 'ROAS', type: 'Numeric' },
];
const MK_CONTENT_COLUMNS = [
  { id: 'Title', label: 'Page Title', type: 'Text' }, { id: 'Slug', label: 'Slug', type: 'Text' },
  { id: 'Section', label: 'Website Section', type: 'Choice' }, { id: 'Status', label: 'Status', type: 'Choice' },
  { id: 'Author', label: 'Responsible', type: 'Text' }, { id: 'PublishDate', label: 'Published', type: 'Date' },
  { id: 'Words', label: 'Words', type: 'Numeric' }, { id: 'InboundLinks', label: 'Links In', type: 'Numeric' },
  { id: 'OutboundLinks', label: 'Links Out', type: 'Numeric' },
  { id: 'Pageviews', label: 'Pageviews (30d)', type: 'Numeric' },
  { id: 'Orphaned', label: 'Orphaned', type: 'Numeric' },
];
const MK_POST_COLUMNS = [
  { id: 'Date', label: 'Publication Date', type: 'Date' }, { id: 'Topic', label: 'Topic', type: 'Text' },
  { id: 'Platform', label: 'Platform', type: 'Choice' }, { id: 'Campaign', label: 'Campaign', type: 'Text' },
  { id: 'Status', label: 'Status', type: 'Choice' }, { id: 'Author', label: 'Author', type: 'Text' },
  { id: 'Characters', label: 'Characters', type: 'Numeric' },
  { id: 'Engagements', label: 'Engagements', type: 'Numeric' },
];
const MK_EVENT_COLUMNS = [
  { id: 'Name', label: 'Event', type: 'Text' }, { id: 'StartDate', label: 'Start Date', type: 'Date' },
  { id: 'Location', label: 'Location', type: 'Text' }, { id: 'Coordinator', label: 'Coordinator', type: 'Text' },
  { id: 'Capacity', label: 'Capacity', type: 'Numeric' }, { id: 'Registered', label: 'Registered', type: 'Numeric' },
  { id: 'PctFull', label: '% Full', type: 'Numeric' }, { id: 'TicketRevenue', label: 'Ticket Revenue', type: 'Numeric' },
  { id: 'SponsorCount', label: 'Sponsors', type: 'Numeric' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' }, { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];
const MK_FEEDBACK_COLUMNS = [
  { id: 'Submitted', label: 'Submitted', type: 'Date' }, { id: 'Score', label: 'NPS Score', type: 'Numeric' },
  { id: 'Type', label: 'Type', type: 'Choice' }, { id: 'Segment', label: 'Segment', type: 'Choice' },
  { id: 'Reason', label: 'Reason For Score', type: 'Text' }, { id: 'Month', label: 'Month', type: 'Text' },
  { id: 'NpsPoints', label: 'NPS Points', type: 'Numeric' },
  { id: 'Contacted', label: 'Contacted', type: 'Numeric' },
];

// Each channel behaves the way it really does: search converts well but costs more per click,
// display buys enormous cheap reach that barely converts, events cost a fortune per head but
// close. Flat random numbers across every channel would make the cost-per-lead and ROAS charts
// meaningless, which are the two the page is built around.
//
// The cost column is FULLY-LOADED cost per click — media plus the content, tooling and time
// behind it — not just media spend. That matters: an earlier pass priced organic and email at
// media cost alone (2c and 5c a click, since nobody bids on their own newsletter), which made
// them look infinitely profitable and pushed blended ROAS to 466x. Owned channels are cheap,
// not free, and costing them honestly is what keeps the comparison worth making.
const MK_CHANNELS = [
  // name,            ctr%,  click->lead%, cost/click, lead->customer%
  ['Paid search',     3.2,   2.5,          5.00,       15],
  ['Paid social',     1.1,   1.8,          2.20,       10],
  ['Display',         0.35,  0.7,          0.90,        5],
  ['Email',           2.6,   4.5,          3.00,       18],
  ['Organic / SEO',   4.1,   2.2,          2.40,       14],
  ['Partnerships',    2.2,   5.0,          6.00,       22],
  ['Events',          1.8,   7.0,         14.00,       26],
];
const MK_CAMPAIGN_NAMES = [
  ['Spring Product Launch', 'Paid search'], ['Always-On Brand', 'Paid social'],
  ['Retargeting — Pricing Page', 'Display'], ['Monthly Newsletter', 'Email'],
  ['Comparison Guides', 'Organic / SEO'], ['Integrations Co-Marketing', 'Partnerships'],
  ['Summit Booth & Sessions', 'Events'], ['Free Trial Push', 'Paid search'],
  ['Founder Story Series', 'Paid social'], ['Onboarding Drip', 'Email'],
  ['Template Library SEO', 'Organic / SEO'], ['Q3 Webinar Series', 'Events'],
];
const MK_OWNERS = ['Rina Achebe', 'Tom Delacroix', 'Sana Qureshi', 'Ben Halvorsen'];
const MK_SECTIONS = ['Blog', 'Guides', 'Product', 'Docs', 'Case studies', 'Landing pages'];
const MK_PLATFORMS = ['LinkedIn', 'X', 'Instagram', 'YouTube', 'Facebook'];
const MK_CONTENT_TITLES = [
  ['How to build a marketing dashboard without a BI tool', 'Guides'],
  ['Spreadsheet vs database: which do you actually need?', 'Blog'],
  ['UTM parameters explained (with a builder you can copy)', 'Guides'],
  ['Internal linking: finding the pages nobody links to', 'Guides'],
  ['What a good NPS actually looks like in B2B', 'Blog'],
  ['Pricing', 'Landing pages'], ['Product tour', 'Product'],
  ['Migrating from Airtable', 'Docs'], ['API quickstart', 'Docs'],
  ['Access rules, explained', 'Docs'],
  ['How MissionSource cut reporting time by 80%', 'Case studies'],
  ['A nonprofit tracking 4,000 donations a year', 'Case studies'],
  ['Event registration without the reconciliation', 'Blog'],
  ['Content calendars that survive contact with reality', 'Blog'],
  ['The orphan page problem', 'Blog'], ['Formulas for marketers', 'Guides'],
  ['Webhooks 101', 'Docs'], ['Custom widgets', 'Docs'],
  ['Book a demo', 'Landing pages'], ['Free trial', 'Landing pages'],
  ['Charts that answer a question', 'Guides'], ['Reporting templates', 'Product'],
  ['Why we went open source', 'Blog'], ['Self-hosting guide', 'Docs'],
  ['From spreadsheet chaos to one source of truth', 'Case studies'],
  ['Attribution without a data team', 'Guides'],
];
const MK_POST_TOPICS = [
  'Template of the week', 'Customer spotlight', 'Feature drop', 'Behind the build',
  'Tip: pivot tables', 'Webinar reminder', 'Hiring: data engineer', 'Community Q&A',
  'Benchmark report teaser', 'Changelog highlights', 'Founder AMA', 'Poll: biggest reporting pain',
];
const MK_EVENTS = [
  ['SaaS Growth Summit', 'San Francisco, CA', 37.77, -122.42, 420, 89],
  ['Marketing Ops Meetup', 'Austin, TX', 30.27, -97.74, 120, 25],
  ['No-Code Conf', 'New York, NY', 40.71, -74.01, 650, 149],
  ['Data & Dashboards Day', 'Chicago, IL', 41.88, -87.63, 200, 59],
  ['Open Source Forum', 'Berlin, DE', 52.52, 13.40, 300, 0],
  ['Product Analytics Workshop', 'London, UK', 51.51, -0.13, 90, 199],
  ['Nonprofit Tech Gathering', 'Boston, MA', 42.36, -71.06, 260, 35],
  ['Partner Roadshow', 'Toronto, ON', 43.65, -79.38, 150, 45],
];
const MK_NPS_REASONS = {
  promoter: ['Replaced three tools for us — reporting takes minutes now.',
    'Support answered in under an hour on a weekend.', 'Formulas are genuinely powerful once it clicks.',
    'Access rules let us share one doc with the whole board safely.', 'Best migration experience we have had.'],
  passive: ['Works well, but the mobile view needs attention.', 'Good product; onboarding took us longer than expected.',
    'Happy overall — pricing is a bit steep for our size.', 'Solid, though we still export to slides for the board.'],
  detractor: ['Hit a limit on large imports and had to split the file.',
    'Took three weeks to get an answer on our billing question.', 'Too much setup before it was useful to us.'],
};

function buildMarketingData() {
  const rnd = mulberry32(17001);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const r2 = (n) => Math.round(n * 100) / 100;
  const chan = Object.fromEntries(MK_CHANNELS.map((c) => [c[0], c]));

  // --- Campaigns: the funnel, derived so every ratio is internally consistent ---
  const campaigns = MK_CAMPAIGN_NAMES.map(([name, channel], i) => {
    const [, ctrPct, leadPct, cpc, custPct] = chan[channel];
    const start = new Date(today); start.setDate(start.getDate() - Math.round(10 + rnd() * 160));
    const end = new Date(start); end.setDate(end.getDate() + Math.round(30 + rnd() * 90));
    const status = end < today ? 'Complete' : (start > today ? 'Planned' : 'Live');
    const impressions = Math.round((40000 + rnd() * 900000) / 1000) * 1000;
    const ctr = r2(ctrPct * (0.75 + rnd() * 0.5));
    const clicks = Math.round(impressions * (ctr / 100));
    const leads = Math.round(clicks * (leadPct / 100) * (0.8 + rnd() * 0.4));
    const customers = Math.round(leads * (custPct / 100) * (0.8 + rnd() * 0.4));
    const spend = Math.round(clicks * cpc * (0.9 + rnd() * 0.25));
    // Budget is set ahead of the campaign, so spend lands near it but rarely on it.
    const budget = Math.round((spend * (1.02 + rnd() * 0.3)) / 100) * 100;
    // Average contract value for a mid-market B2B product — this and the cost/click above are
    // what set ROAS, so both have to be defensible for the headline number to mean anything.
    const revenue = Math.round(customers * (2500 + rnd() * 4500));
    return {
      id: i + 1, Name: name, Channel: channel, Status: status, Owner: MK_OWNERS[i % MK_OWNERS.length],
      StartDate: iso(start), EndDate: iso(end), Budget: budget, Spend: spend,
      Impressions: impressions, Clicks: clicks, Leads: leads, Customers: customers, Revenue: revenue,
      CTR: ctr, CostPerLead: leads ? r2(spend / leads) : 0, ROAS: spend ? r2(revenue / spend) : 0,
    };
  });

  // --- Content: the SEO register. Orphaned reproduces the source's
  // Orphaned_ = len(Links.lookupRecords(To=$id))<1 — nothing on the site links TO this page. ---
  const content = MK_CONTENT_TITLES.map(([title, section], i) => {
    const pub = new Date(today); pub.setDate(pub.getDate() - Math.round(15 + rnd() * 700));
    // Cornerstone pages (pricing, product, trial) are linked from everywhere; deep blog posts
    // and older docs are where orphans actually accumulate, which is the whole point of the audit.
    // Roughly a fifth of non-cornerstone pages are deliberately orphaned — leaving it to chance
    // gave a single orphan across 26 pages, which makes the KPI and the highlighted column on the
    // Content page look broken rather than clean.
    const cornerstone = section === 'Landing pages' || section === 'Product';
    const inbound = cornerstone ? Math.round(8 + rnd() * 30)
      : (rnd() < 0.22 ? 0 : Math.round(1 + rnd() * 7));
    const outbound = Math.round(1 + rnd() * 9);
    const orphaned = inbound === 0 ? 1 : 0;
    // Traffic follows inbound links, with a floor so nothing reads as exactly dead.
    const views = Math.round((60 + inbound * (90 + rnd() * 260)) * (0.6 + rnd() * 0.9));
    return {
      id: i + 1, Title: title, Slug: '/' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42),
      Section: section, Status: rnd() < 0.82 ? 'Published' : (rnd() < 0.6 ? 'Draft' : 'Needs update'),
      Author: pick(MK_OWNERS), PublishDate: iso(pub), Words: Math.round((600 + rnd() * 2400) / 50) * 50,
      InboundLinks: inbound, OutboundLinks: outbound, Pageviews: views, Orphaned: orphaned,
    };
  });

  // --- Posts: the social calendar. 1-3 a day across the current month keeps the month grid
  // readable (unlike a booking calendar, a content team genuinely does post this often). ---
  const posts = [];
  for (let i = 0; i < 78; i++) {
    const d = new Date(today); d.setDate(d.getDate() + Math.round(-30 + rnd() * 52));
    const past = d < today;
    const platform = pick(MK_PLATFORMS);
    const chars = platform === 'X' ? Math.round(90 + rnd() * 180) : Math.round(180 + rnd() * 900);
    posts.push({
      id: i + 1, Date: iso(d), Topic: pick(MK_POST_TOPICS), Platform: platform,
      Campaign: pick(campaigns).Name, Author: pick(MK_OWNERS),
      // A post can only be Published once its date has passed; ahead of that it is
      // still moving through Drafted -> Reviewed, mirroring the source's three bool flags.
      Status: past ? 'Published' : (rnd() < 0.45 ? 'Reviewed' : (rnd() < 0.7 ? 'Drafted' : 'Idea')),
      Characters: chars,
      Engagements: past ? Math.round(rnd() * rnd() * 2400) : 0,
    });
  }

  // --- Events: Registered/Capacity and ticket revenue, per the source's Full_ and
  // Ticket_Revenue formulas. ---
  const events = MK_EVENTS.map(([name, location, lat, lon, capacity, price], i) => {
    const start = new Date(today); start.setDate(start.getDate() + Math.round(-40 + rnd() * 120));
    const fill = 0.55 + rnd() * 0.42;
    const registered = Math.min(capacity, Math.round(capacity * fill));
    return {
      id: i + 1, Name: name, StartDate: iso(start), Location: location, Coordinator: pick(MK_OWNERS),
      Capacity: capacity, Registered: registered, PctFull: Math.round((registered / capacity) * 100),
      TicketRevenue: registered * price, SponsorCount: Math.round(1 + rnd() * 7),
      Latitude: lat, Longitude: lon,
    };
  });

  // --- Feedback: NPS. Type reproduces the source's 0-6 / 7-8 / 9-10 bucketing exactly.
  // NpsPoints is ours: +100 promoter / 0 passive / -100 detractor, so mean(NpsPoints) == NPS. ---
  const feedback = [];
  for (let i = 0; i < 64; i++) {
    const sub = new Date(today); sub.setDate(sub.getDate() - Math.round(rnd() * 165));
    // A healthy but not fantastical B2B product: mostly promoters, a real detractor tail.
    const roll = rnd();
    const score = roll < 0.52 ? 9 + Math.round(rnd()) : roll < 0.79 ? 7 + Math.round(rnd()) : Math.round(rnd() * 6);
    const type = score <= 6 ? 'Detractor' : score >= 9 ? 'Promoter' : 'Passive';
    const bucket = type === 'Promoter' ? 'promoter' : type === 'Detractor' ? 'detractor' : 'passive';
    feedback.push({
      id: i + 1, Submitted: iso(sub), Score: score, Type: type,
      Segment: pick(['Starter', 'Team', 'Business', 'Enterprise']),
      Reason: pick(MK_NPS_REASONS[bucket]),
      Month: `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'][sub.getMonth()]} ${sub.getFullYear()}`,
      NpsPoints: type === 'Promoter' ? 100 : type === 'Detractor' ? -100 : 0,
      // Detractors are the ones you chase; a good team has reached most of them.
      Contacted: type === 'Detractor' ? (rnd() < 0.8 ? 1 : 0) : (rnd() < 0.2 ? 1 : 0),
    });
  }

  return {
    defaultTable: 'Campaigns',
    tables: {
      Campaigns: { id: 'Campaigns', label: 'Campaigns', columns: MK_CAMPAIGN_COLUMNS, records: campaigns },
      Content: { id: 'Content', label: 'Site content', columns: MK_CONTENT_COLUMNS, records: content },
      Posts: { id: 'Posts', label: 'Social posts', columns: MK_POST_COLUMNS, records: posts },
      Events: { id: 'Events', label: 'Events', columns: MK_EVENT_COLUMNS, records: events },
      Feedback: { id: 'Feedback', label: 'NPS responses', columns: MK_FEEDBACK_COLUMNS, records: feedback },
    },
  };
}

// The generic {Category, Site, Value, Latitude, Longitude} dataset that used to back the
// not-yet-written templates is gone: all nine now ship bespoke, industry-shaped data.

export const TEMPLATE_SAMPLE_DATA = {
  // The demo dashboard's data is the bundled demo dataset itself, not a second copy of it. That
  // dataset is what the widget already renders before anyone connects a document, so previewing
  // this template shows precisely the site the viewer has just been exploring — and applying it
  // creates those same six tables in their document. DUMMY_DATA's table entries already carry
  // {columns, records}; the extra id/label keys are ignored by everything that reads this map.
  'demo-dashboard': { defaultTable: DUMMY_DATA.defaultTable, tables: DUMMY_DATA.tables },
  'research-labs': buildResearchLabsData(),
  nonprofits: buildNonprofitData(),
  legal: buildLegalData(),
  'higher-education': buildHigherEdData(),
  marketing: buildMarketingData(),
  'finance-accounting': buildFinanceData(),
  developers: buildDevelopersData(),
  'small-business': buildSmallBusinessData(),
  'sports-facility': buildSportsFacilityData(),
};

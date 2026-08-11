// One small bundled sample dataset per industry template, used only to preview a template
// before it's applied (see builder/template-picker.js) — so what you see before committing to a
// template already looks like real data for that industry, instead of generic Sales numbers with
// different labels. Every dataset here is keyed by the same table name(s) its template's blocks
// already reference, so adaptTemplateToTable (data/provider.js) treats it as a genuine match at
// preview time and repairs every table-bound block type's columns to fit — this data never
// reaches a real site, it's preview-only.

import { mulberry32 } from '../dummy-data.js';

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

// Instruments — the one lab function the first pass didn't model. Real labs run a calibration /
// maintenance register (and the Jozef Stefan case study specifically integrates instrument data),
// so this carries a NextCalibration date the Equipment page plots on a draggable calendar and
// highlights when it slips. CalibrationDue/Compliant are pre-split 1/0 helper columns because a
// stat block can only SUM a column — it can't filter by status (same trick as Finance's Invoices).
const INSTRUMENTS = [
  ['Mass Spectrometer', 'Thermo Fisher', 'Lab A', 'Dr. Jane Smith'],
  ['HPLC System', 'Agilent', 'Lab A', 'Michael Brown'],
  ['PCR Thermocycler', 'Bio-Rad', 'Molecular Lab', 'Emily Johnson'],
  ['Refrigerated Centrifuge', 'Eppendorf', 'Prep Room', 'David Lee'],
  ['Microplate Reader', 'BioTek', 'Assay Room', 'Amanda Taylor'],
  ['-80°C Freezer', 'Thermo Fisher', 'Cold Room', 'David Lee'],
  ['Autoclave', 'Tuttnauer', 'Sterilization', 'John Doe'],
  ['Fluorescence Microscope', 'Zeiss', 'Imaging Suite', 'Emily Johnson'],
  ['UV-Vis Spectrophotometer', 'Shimadzu', 'Lab B', 'Michael Brown'],
  ['CO₂ Incubator', 'Panasonic', 'Cell Culture', 'John Doe'],
  ['Flow Cytometer', 'BD Biosciences', 'Imaging Suite', 'Amanda Taylor'],
  ['Water Purification System', 'Milli-Q', 'Lab B', 'Sarah Wilson'],
  ['Analytical Balance', 'Mettler Toledo', 'Prep Room', 'Sarah Wilson'],
  ['Gas Chromatograph', 'Agilent', 'Lab A', 'Dr. Jane Smith'],
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
    const issue = new Date(today.getTime() - Math.round(5 + rnd() * 150) * 86400000);
    const due = new Date(issue.getTime() + 30 * 86400000);
    const amount = Math.round((800 + rnd() * 23000) / 10) * 10;
    let status, paidDate = null;
    if (due < today) { if (rnd() < 0.72) { status = 'Paid'; paidDate = finIso(new Date(due.getTime() - Math.round(rnd() * 10) * 86400000)); } else status = 'Overdue'; }
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
  nonprofits: buildNonprofitData(),
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
  'finance-accounting': buildFinanceData(),
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

// Bundled demo dataset. Mirrors the shape of a Grist table so the same renderer works
// whether data comes from Grist or from here. Deterministically generated => stable charts.
// Shipped to GitHub Pages so the widget looks alive before anyone connects real data.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS = ['North', 'South', 'East', 'West'];
const CATEGORIES = ['Electronics', 'Apparel', 'Home', 'Sports'];
const CHANNELS = ['Online', 'Retail', 'Partner'];
const PRODUCTS = ['Nimbus', 'Vertex', 'Aura', 'Pulse', 'Drift', 'Ember'];
const MONTHS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
                '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

function buildSales() {
  const rnd = mulberry32(20260624);
  const rows = [];
  let id = 1;
  for (const month of MONTHS) {
    for (const cat of CATEGORIES) {
      const region = REGIONS[Math.floor(rnd() * REGIONS.length)];
      const channel = CHANNELS[Math.floor(rnd() * CHANNELS.length)];
      const product = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)];
      const seasonal = 1 + 0.35 * Math.sin((MONTHS.indexOf(month) / 12) * Math.PI * 2);
      const base = { Electronics: 1900, Apparel: 1200, Home: 950, Sports: 760 }[cat];
      const units = Math.round((base * seasonal * (0.7 + rnd() * 0.7)) / 10);
      const price = { Electronics: 240, Apparel: 65, Home: 120, Sports: 95 }[cat] * (0.9 + rnd() * 0.3);
      const revenue = Math.round(units * price);
      const cost = Math.round(revenue * (0.52 + rnd() * 0.16));
      const profit = revenue - cost;
      rows.push({
        id: id++,
        Month: month + '-01',
        Region: region,
        Category: cat,
        Channel: channel,
        Product: product,
        Units: units,
        Revenue: revenue,
        Cost: cost,
        Profit: profit,
        Margin: Math.round((profit / revenue) * 1000) / 10,
        Satisfaction: Math.round((3.4 + rnd() * 1.6) * 10) / 10,
      });
    }
  }
  return rows;
}

const SALES_COLUMNS = [
  { id: 'Month', label: 'Month', type: 'Date' },
  { id: 'Region', label: 'Region', type: 'Choice' },
  { id: 'Category', label: 'Category', type: 'Choice' },
  { id: 'Channel', label: 'Channel', type: 'Choice' },
  { id: 'Product', label: 'Product', type: 'Text' },
  { id: 'Units', label: 'Units', type: 'Int' },
  { id: 'Revenue', label: 'Revenue', type: 'Numeric' },
  { id: 'Cost', label: 'Cost', type: 'Numeric' },
  { id: 'Profit', label: 'Profit', type: 'Numeric' },
  { id: 'Margin', label: 'Margin %', type: 'Numeric' },
  { id: 'Satisfaction', label: 'Satisfaction', type: 'Numeric' },
];

// A second, very different dataset (people/HR) so the demo shows the widget is general-purpose
// and handles text / choice / date / int / numeric / bool columns — not just revenue.
const DEPARTMENTS = ['Engineering', 'Design', 'Sales', 'Marketing', 'Support', 'Operations'];
const ROLES = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
const CITIES = ['London', 'Berlin', 'Toronto', 'Austin', 'Dhaka', 'Singapore'];
const CITY_COORDS = {
  London: [51.51, -0.13], Berlin: [52.52, 13.40], Toronto: [43.65, -79.38],
  Austin: [30.27, -97.74], Dhaka: [23.81, 90.41], Singapore: [1.35, 103.82],
};
const GENDERS = ['Female', 'Male', 'Non-binary'];
const FIRST = ['Aria', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ravi', 'Sara', 'Kenji', 'Ines', 'Omar', 'Lena', 'Theo', 'Nadia', 'Yusuf', 'Elsa', 'Diego', 'Priya', 'Hugo', 'Maya', 'Felix'];
const LAST = ['Khan', 'Smith', 'Müller', 'Tanaka', 'Costa', 'Patel', 'Nguyen', 'Rossi', 'Park', 'Haddad'];

function buildPeople() {
  const rnd = mulberry32(77123);
  const rows = [];
  for (let i = 0; i < 36; i++) {
    const dept = DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)];
    const role = ROLES[Math.floor(rnd() * ROLES.length)];
    const seniority = ROLES.indexOf(role);
    const age = 23 + Math.floor(rnd() * 28);
    const year = 2016 + Math.floor(rnd() * 10);
    const month = 1 + Math.floor(rnd() * 12);
    const city = CITIES[Math.floor(rnd() * CITIES.length)];
    const [clat, clon] = CITY_COORDS[city];
    rows.push({
      id: i + 1,
      Name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      Department: dept,
      Role: role,
      Gender: GENDERS[Math.floor(rnd() * GENDERS.length)],
      City: city,
      JoinDate: `${year}-${String(month).padStart(2, '0')}-15`,
      Age: age,
      Salary: 45000 + seniority * 18000 + Math.floor(rnd() * 16000),
      Rating: Math.round((3 + rnd() * 2) * 10) / 10,
      Remote: rnd() > 0.5,
      Latitude: Math.round((clat + (rnd() - 0.5) * 0.5) * 10000) / 10000,
      Longitude: Math.round((clon + (rnd() - 0.5) * 0.5) * 10000) / 10000,
    });
  }
  return rows;
}

const PEOPLE_COLUMNS = [
  { id: 'Name', label: 'Name', type: 'Text' },
  { id: 'Department', label: 'Department', type: 'Choice' },
  { id: 'Role', label: 'Role', type: 'Choice' },
  { id: 'Gender', label: 'Gender', type: 'Choice' },
  { id: 'City', label: 'City', type: 'Choice' },
  { id: 'JoinDate', label: 'Join Date', type: 'Date' },
  { id: 'Age', label: 'Age', type: 'Int' },
  { id: 'Salary', label: 'Salary', type: 'Numeric' },
  { id: 'Rating', label: 'Performance', type: 'Numeric' },
  { id: 'Remote', label: 'Remote', type: 'Bool' },
  { id: 'Latitude', label: 'Latitude', type: 'Numeric' },
  { id: 'Longitude', label: 'Longitude', type: 'Numeric' },
];

export const DUMMY_DATA = {
  defaultTable: 'Sales',
  tables: {
    Sales: { id: 'Sales', label: 'Sales (demo)', columns: SALES_COLUMNS, records: buildSales() },
    People: { id: 'People', label: 'People (demo)', columns: PEOPLE_COLUMNS, records: buildPeople() },
  },
};

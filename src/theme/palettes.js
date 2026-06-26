// Curated, ready-to-use palettes + font pairings. Users can pick one of these or
// override any color. A palette = brand primary/accent + 8 series colors for charts.

export const PALETTES = [
  { id: 'aurora',   name: 'Aurora',   primary: '#6d5efc', accent: '#16c4a6', series: ['#6d5efc','#16c4a6','#ff8a5b','#ffd166','#ef476f','#4cc9f0','#b06bff','#06d6a0'] },
  { id: 'sunset',   name: 'Sunset',   primary: '#ff6b6b', accent: '#ffa94d', series: ['#ff6b6b','#ffa94d','#ffd43b','#f783ac','#9775fa','#4dabf7','#69db7c','#ff922b'] },
  { id: 'ocean',    name: 'Ocean',    primary: '#1c7ed6', accent: '#22b8cf', series: ['#1c7ed6','#22b8cf','#15aabf','#4263eb','#5c7cfa','#3bc9db','#0ca678','#748ffc'] },
  { id: 'forest',   name: 'Forest',   primary: '#2f9e44', accent: '#94d82d', series: ['#2f9e44','#94d82d','#66a80f','#37b24d','#0ca678','#fcc419','#a9e34b','#099268'] },
  { id: 'berry',    name: 'Berry',    primary: '#ae3ec9', accent: '#e64980', series: ['#ae3ec9','#e64980','#f06595','#cc5de8','#845ef7','#ff6b6b','#faa2c1','#7048e8'] },
  { id: 'mono',     name: 'Graphite', primary: '#495057', accent: '#868e96', series: ['#343a40','#495057','#868e96','#adb5bd','#5c7cfa','#15aabf','#ced4da','#212529'] },
  { id: 'candy',    name: 'Candy',    primary: '#f06595', accent: '#74c0fc', series: ['#f06595','#74c0fc','#63e6be','#ffd43b','#b197fc','#ff8787','#3bc9db','#69db7c'] },
  { id: 'midnight', name: 'Midnight', primary: '#7c83ff', accent: '#22d3ee', series: ['#7c83ff','#22d3ee','#f472b6','#fbbf24','#34d399','#f87171','#a78bfa','#60a5fa'], mode: 'dark' },
  { id: 'corporate',name: 'Corporate',primary: '#0b6bcb', accent: '#0891b2', series: ['#0b6bcb','#0891b2','#475569','#64748b','#0ea5e9','#14b8a6','#94a3b8','#1e293b'] },
  { id: 'warmclay', name: 'Warm Clay',primary: '#c2410c', accent: '#d97706', series: ['#c2410c','#d97706','#b45309','#92400e','#a16207','#ca8a04','#ea580c','#78350f'] },
];

export const FONT_PAIRS = [
  { id: 'system',  name: 'Crisp Sans',  head: '"Segoe UI", system-ui, -apple-system, Arial, sans-serif', body: '"Segoe UI", system-ui, -apple-system, Arial, sans-serif' },
  { id: 'serifmix',name: 'Editorial',   head: 'Georgia, "Times New Roman", serif', body: '"Segoe UI", system-ui, sans-serif' },
  { id: 'humanist',name: 'Humanist',    head: '"Trebuchet MS", "Segoe UI", sans-serif', body: '"Segoe UI", system-ui, sans-serif' },
  { id: 'geometric',name:'Geometric',   head: '"Century Gothic", "Segoe UI", sans-serif', body: '"Segoe UI", system-ui, sans-serif' },
  { id: 'mono',    name: 'Technical',   head: '"Cascadia Code", Consolas, ui-monospace, monospace', body: '"Segoe UI", system-ui, sans-serif' },
];

export const getPalette = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];
export const getFontPair = (id) => FONT_PAIRS.find((f) => f.id === id) || FONT_PAIRS[0];

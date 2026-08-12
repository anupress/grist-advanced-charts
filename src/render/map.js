// "Map" block: plots lat/long points on a Leaflet map with SVG-pin markers, popups, optional
// clustering and category coloring. Maps mount lazily (like charts) once their tab is visible.

import { el, escapeHtml, interpolate } from '../util.js';
import { currentSeriesColors } from '../theme/apply.js';

const L = () => window.L;
const registry = new WeakMap(); // container -> { map, layer }
const _pinCache = {};

function pinIcon(color) {
  if (_pinCache[color]) return _pinCache[color];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 30 42">`
    + `<path d="M15 1C7.3 1 1 7.3 1 15c0 10.8 14 26 14 26s14-15.2 14-26C29 7.3 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="2.5"/>`
    + `<circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`;
  const icon = L().divIcon({ html: svg, className: 'ap-map-pin', iconSize: [28, 40], iconAnchor: [14, 39], popupAnchor: [0, -36] });
  _pinCache[color] = icon;
  return icon;
}

const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null; };

export function buildMapCard(block, ctx) {
  const c = block.config || {};
  const table = c.table || ctx.config?.dataTable;
  const rows = ctx.provider.records(table);
  const columns = ctx.provider.columns(table);

  const card = el('div', { class: 'ap-card ap-mapcard', dataset: { blockId: block.id } }, [
    el('div', { class: 'ap-chartcard__head' }, [
      el('div', {}, [
        el('div', { class: 'ap-chartcard__title', text: c.title || 'Map' }),
        el('div', { class: 'ap-chartcard__sub ap-map-count' }),
      ]),
    ]),
  ]);
  const mapEl = el('div', { class: 'ap-map' });
  mapEl._apMap = { block, rows, columns, table };
  card.append(mapEl);
  return card;
}

export function mountMaps(scope) {
  if (!L()) return;
  (scope || document).querySelectorAll('.ap-map').forEach((container) => {
    if (container._apMap) mountOne(container);
  });
}

function mountOne(container) {
  if (container.offsetParent === null && container.clientWidth === 0) return; // hidden tab
  if (container.clientWidth === 0 || container.clientHeight === 0) {
    const n = container._apTry || 0;
    if (n < 12) { container._apTry = n + 1; setTimeout(() => mountOne(container), 60); }
    return;
  }
  container._apTry = 0;
  const { block, rows, columns, table } = container._apMap;
  const c = block.config || {};
  const Lf = L();

  let entry = registry.get(container);
  if (!entry) {
    // Attribution wording is not decorative — it is the condition each licence is granted on.
    // OpenStreetMap's ODbL asks for "OpenStreetMap contributors" specifically, since the credit
    // belongs to the people who surveyed the data rather than to the project; OpenTopoMap needs
    // its CC-BY-SA rendering licence named alongside the OSM data credit. Both were short.
    const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    const street = Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: OSM_ATTR, maxZoom: 19 });
    const topo = Lf.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { attribution: `${OSM_ATTR}, rendering &copy; <a href="https://opentopomap.org/" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)`, maxZoom: 17 });
    const map = Lf.map(container, { layers: [street], worldCopyJump: true, attributionControl: false }).setView([20, 0], 2);
    Lf.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);
    // The Satellite layer used to hotlink Esri's World_Imagery tiles. Their terms require an ArcGIS
    // account for use in an application — a publicly reachable endpoint is not a grant — so it has
    // been removed rather than left for our users to breach on our behalf. There is no free,
    // global, high-resolution aerial source that permits redistribution without an API key: the
    // open ones are either non-commercial (EOX Sentinel-2 cloudless is CC BY-NC-SA), region-locked
    // (USGS is US-only), or far too coarse (NASA GIBS tops out around zoom 9, versus 17 here).
    // Bring-your-own aerial tiles is the honest way to offer this; see the Map block editor.
    // A user who holds a tile licence — an ArcGIS, MapTiler, Mapbox or Stadia account, or their
    // own server — can point the block at it, and supplies the attribution their provider requires.
    // The licence then sits with the person who actually has it, which is the only arrangement that
    // works for a widget shipped to everyone.
    const layers = { Street: street, Terrain: topo };
    if (c.tileUrl && /^https:\/\//i.test(c.tileUrl)) {
      layers[c.tileLabel || 'Satellite'] = Lf.tileLayer(c.tileUrl, {
        attribution: c.tileAttribution || '', maxZoom: 19,
        maxNativeZoom: Number(c.tileMaxZoom) || 19,
      });
    }
    Lf.control.layers(layers, null, { position: 'bottomright', collapsed: true }).addTo(map);
    const layer = (typeof Lf.markerClusterGroup === 'function')
      ? Lf.markerClusterGroup({ disableClusteringAtZoom: 17, maxClusterRadius: 45, chunkedLoading: true })
      : Lf.layerGroup();
    map.addLayer(layer);
    entry = { map, layer };
    registry.set(container, entry);
  }

  const { map, layer } = entry;
  layer.clearLayers();

  const latC = c.latColumn, lonC = c.lonColumn, labelC = c.labelColumn;
  const colorBy = c.colorBy;
  const palette = currentSeriesColors();
  const groupColors = {};
  const colLabel = (id) => columns.find((x) => x.id === id)?.label || id;
  const extraCols = (c.popupColumns || []).filter(Boolean);

  const points = [];
  let missing = 0;
  for (const r of rows) {
    const lat = num(r[latC]), lon = num(r[lonC]);
    if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) { missing++; continue; }
    let color = palette[0];
    if (colorBy) {
      const g = (r[colorBy] == null || r[colorBy] === '') ? '—' : String(r[colorBy]);
      if (!(g in groupColors)) groupColors[g] = palette[Object.keys(groupColors).length % palette.length];
      color = groupColors[g];
    }
    const marker = Lf.marker([lat, lon], { icon: pinIcon(color), riseOnHover: true });
    const lines = [];
    if (labelC && r[labelC] != null && r[labelC] !== '') lines.push(`<strong>${escapeHtml(String(r[labelC]))}</strong>`);
    for (const col of extraCols) lines.push(`${escapeHtml(colLabel(col))}: ${escapeHtml(String(r[col] ?? '—'))}`);
    if (lines.length) marker.bindPopup(lines.join('<br/>'));
    layer.addLayer(marker);
    points.push([lat, lon]);
  }

  if (points.length === 1) map.setView(points[0], 12);
  else if (points.length > 1) { try { map.fitBounds(points, { maxZoom: 16, padding: [30, 30] }); } catch {} }

  const countEl = container.closest('.ap-mapcard')?.querySelector('.ap-map-count');
  if (countEl) {
    const legend = Object.entries(groupColors).slice(0, 8)
      .map(([n, col]) => `<span class="ap-map-leg"><span class="ap-map-legdot" style="background:${col}"></span>${escapeHtml(n)}</span>`).join('');
    const tpl = c.subtitle || '%count mapped · %missing without coordinates';
    const text = interpolate(tpl, { count: points.length, missing, total: rows.length });
    countEl.innerHTML = `<span>${escapeHtml(text)}</span>` + (legend ? ` &nbsp; ${legend}` : '');
  }
  setTimeout(() => { try { map.invalidateSize(); } catch {} }, 0);
}

export function resizeMapsIn(scope) {
  (scope || document).querySelectorAll('.ap-map').forEach((container) => {
    const entry = registry.get(container);
    if (entry) setTimeout(() => { try { entry.map.invalidateSize(); } catch {} }, 0);
  });
}

// Heuristic: find likely lat/lon columns by name.
export function detectLatLon(columns) {
  const lat = columns.find((c) => /^(lat|latitude|.*_lat|.*latitude)$/i.test(c.id) || /latitude/i.test(c.label || ''));
  const lon = columns.find((c) => /^(lon|lng|long|longitude|.*_lon|.*_lng|.*longitude)$/i.test(c.id) || /longitude/i.test(c.label || ''));
  return { lat: lat?.id || null, lon: lon?.id || null };
}

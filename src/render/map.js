// "Map" block: plots lat/long points on a Leaflet map with SVG-pin markers, popups, optional
// clustering and category coloring. Maps mount lazily (like charts) once their tab is visible.

import { el, escapeHtml, interpolate, formatCellValue } from '../util.js';
import { currentSeriesColors } from '../theme/apply.js';

// `__apLeaflet` is captured in index.html the instant after leaflet.js and its cluster plugin have
// run, so it is the reference we trust. `window.L` is the fallback, and it is a fallback rather
// than the source because a single-letter global is the easiest name on a page to lose: the
// obfuscated build once emitted its own top-level `function L(){…}` and silently took it.
const L = () => window.__apLeaflet || window.L;
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

// `window.L` being present is not the same as Leaflet being usable. It is a vendored script loaded
// from the page, so it can be blocked, half-fetched, or shadowed by something else that happens to
// be called L — and then every call below is a "not a function" thrown from inside a forEach. The
// methods this file actually depends on are checked once, by name, instead of assumed.
const LEAFLET_NEEDS = ['map', 'tileLayer', 'marker', 'divIcon', 'layerGroup', 'control'];
function leaflet() {
  const Lf = L();
  if (!Lf) return null;
  return LEAFLET_NEEDS.every((m) => typeof Lf[m] === 'function' || (m === 'control' && Lf[m])) ? Lf : null;
}

export function mountMaps(scope) {
  if (!leaflet()) {
    // Say so once rather than per map, and leave the card's own empty state showing.
    if (!mountMaps._warned) { mountMaps._warned = true; console.warn('[ANUPRESS] map library unavailable — map blocks will stay empty'); }
    return;
  }
  (scope || document).querySelectorAll('.ap-map').forEach((container) => {
    // Per map, so one bad dataset or one container mid-transition cannot stop the rest mounting.
    try { if (container._apMap) mountOne(container); }
    catch (e) { console.warn('[ANUPRESS] a map failed to mount', e); }
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
    // Clustering is an optional plugin, and testing for the factory is not enough: the plugin
    // closes over the global L to reach its own constructor, so it can be present and still throw
    // if that global has been taken. Plain markers on a working map beat no map at all.
    let layer = null;
    if (typeof Lf.markerClusterGroup === 'function') {
      try {
        layer = Lf.markerClusterGroup({ disableClusteringAtZoom: 17, maxClusterRadius: 45, chunkedLoading: true });
      } catch (e) {
        console.warn('[ANUPRESS] marker clustering unavailable — showing individual pins', e);
      }
    }
    if (!layer) layer = Lf.layerGroup();
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
  // Same rule as everywhere else: a Reference cell holds a row id, so a map coloured or labelled by
  // one produced a legend of numbers and pins named after nothing.
  const cellText = (r, id, fallback = '') => {
    const col = columns.find((x) => x.id === id) || null;
    const v = r?.[id];
    if (v == null || v === '') return fallback;
    return (col ? formatCellValue(v, col) : String(v)) || fallback;
  };
  const extraCols = (c.popupColumns || []).filter(Boolean);

  const points = [];
  let missing = 0;
  for (const r of rows) {
    const lat = num(r[latC]), lon = num(r[lonC]);
    if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) { missing++; continue; }
    let color = palette[0];
    if (colorBy) {
      const g = cellText(r, colorBy, '—');
      if (!(g in groupColors)) groupColors[g] = palette[Object.keys(groupColors).length % palette.length];
      color = groupColors[g];
    }
    const marker = Lf.marker([lat, lon], { icon: pinIcon(color), riseOnHover: true });
    const lines = [];
    if (labelC && r[labelC] != null && r[labelC] !== '') lines.push(`<strong>${escapeHtml(cellText(r, labelC))}</strong>`);
    for (const col of extraCols) lines.push(`${escapeHtml(colLabel(col))}: ${escapeHtml(cellText(r, col, '—'))}`);
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

/**
 * Get every map in `scope` ready to be captured by a print, and resolve once it is safe to call
 * window.print().
 *
 * Two things can leave a map blank on paper. The size Leaflet last measured may not be the size it
 * now occupies — invalidateSize settles that. And tiles arrive over the network, so a viewer who
 * opens a printable layout and clicks Print straight away can reach the dialog while the images
 * are still in flight; whatever has not landed by then is simply absent from the PDF. Waiting on
 * the tile <img> elements themselves, rather than a Leaflet event, covers both the initial load
 * and any tile the re-projection asks for.
 *
 * Capped, because a map that will never finish loading must not stop someone printing the rest of
 * their document. A missing tile costs a grey square; a hang costs them the page.
 */
export function settleMapsForPrint(scope, timeoutMs = 3000) {
  const containers = [...(scope || document).querySelectorAll('.ap-map')].filter((c) => registry.has(c));
  if (!containers.length) return Promise.resolve(0);

  for (const container of containers) {
    try { registry.get(container).map.invalidateSize({ animate: false, pan: false }); } catch {}
  }

  const started = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const imgs = containers.flatMap((c) => [...c.querySelectorAll('img.leaflet-tile')]);
      const pending = imgs.filter((im) => !im.complete).length;
      if ((imgs.length && !pending) || Date.now() - started > timeoutMs) return resolve(containers.length);
      setTimeout(check, 90);
    };
    // One tick first, so tiles requested by invalidateSize exist as elements before they are counted.
    setTimeout(check, 90);
  });
}

// Heuristic: find likely lat/lon columns by name.
export function detectLatLon(columns) {
  const lat = columns.find((c) => /^(lat|latitude|.*_lat|.*latitude)$/i.test(c.id) || /latitude/i.test(c.label || ''));
  const lon = columns.find((c) => /^(lon|lng|long|longitude|.*_lon|.*_lng|.*longitude)$/i.test(c.id) || /longitude/i.test(c.label || ''));
  return { lat: lat?.id || null, lon: lon?.id || null };
}

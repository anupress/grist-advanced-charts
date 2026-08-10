// A small, reusable, on-site media library for small assets (icons, avatars) that are likely to
// get reused across multiple blocks — generalizes the older ad hoc `site.customIcons` (a bare
// data-URL array, written directly by the Stat editor) into a proper `{id, dataUrl}` list so
// future callers (Counter, Icon block, ...) have one shared place to read/write from.
//
// Scope rule: this store is only for SMALL, reused assets (kept at the existing 128px icon
// downscale cap). One-off content images (hero slides, the Image block, testimonial avatars) are
// NOT pooled here — they're stored directly on their own block instead, since they're unlikely to
// be reused and pooling them would add complexity with no benefit.

import { uid } from '../util.js';

// Reads (and, on first access, migrates) the site's media library. `site.customIcons` is left in
// place afterward, untouched — inert, but a harmless safety net against data loss for anyone
// with an existing saved config that already has icons in the old array.
export function getMediaLibrary(site) {
  if (!site.mediaLibrary) {
    site.mediaLibrary = (site.customIcons || []).map((dataUrl) => ({ id: uid('med'), dataUrl }));
  }
  return site.mediaLibrary;
}

// Adds a data-URL asset if it's not already present (de-duped by exact data-URL match), returns
// the stored {id, dataUrl} entry either way.
export function addMediaAsset(site, dataUrl) {
  const lib = getMediaLibrary(site);
  const existing = lib.find((m) => m.dataUrl === dataUrl);
  if (existing) return existing;
  const asset = { id: uid('med'), dataUrl };
  lib.push(asset);
  return asset;
}

// Read an uploaded image file as a data URL, optionally downscaling it (canvas) so we don't
// store huge base64 blobs in the config. Used for logo, hero slides and custom icons.

export function readFileAsDataURL(file, maxPx = 0) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result;
      if (!maxPx) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        if (scale >= 1) return resolve(dataUrl);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const type = /image\/png|image\/gif/i.test(file.type) ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(type, 0.88));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// A hidden file input that calls back with the chosen file.
export function pickImage(onPick) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) onPick(f); input.remove(); });
  document.body.appendChild(input);
  input.click();
}

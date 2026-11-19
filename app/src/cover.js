// Vice Sunset cover engine: draws a multi-panel poster cover on a 2D canvas.
// Every panel holds its own photo with a crop (zoom) and a position (pan offsets);
// a grade washes the panels in a Vice City sunset or neon palette; Anton lettering
// carries the title and Pacifico the subtitle. No network, no Rockstar artwork.

/** Post sizes the app exports, in pixels. */
export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

/** Layouts: each names its panels as fractions of the canvas. */
export const LAYOUTS = {
  hero3: { label: 'Hero + 3', panels: 4 },
  grid4: { label: 'Four grid', panels: 4 },
  triptych: { label: 'Triptych', panels: 3 },
  fullbleed: { label: 'Full bleed', panels: 1 },
};

/** Colour grades: overlays washed over the panels, top to bottom. */
export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    overlays: [
      { from: 'rgba(255, 60, 160, 0)', at: 0, to: 'rgba(255, 60, 160, 0.14)', mid: 0.45 },
      { from: 'rgba(255, 120, 60, 0)', at: 0.45, to: 'rgba(255, 120, 60, 0.36)', mid: 1 },
    ],
    sun: true,
  },
  neon: {
    label: 'Neon Night',
    overlays: [
      { from: 'rgba(0, 229, 255, 0.20)', at: 0, to: 'rgba(0, 229, 255, 0)', mid: 0.45 },
      { from: 'rgba(255, 45, 149, 0)', at: 0.5, to: 'rgba(255, 45, 149, 0.34)', mid: 1 },
    ],
    sun: false,
  },
  golden: {
    label: 'Golden Hour',
    overlays: [
      { from: 'rgba(255, 190, 80, 0.16)', at: 0, to: 'rgba(255, 190, 80, 0.05)', mid: 0.5 },
      { from: 'rgba(255, 110, 20, 0)', at: 0.5, to: 'rgba(255, 110, 20, 0.26)', mid: 1 },
    ],
    sun: true,
  },
  noir: {
    label: 'Palm Noir',
    overlays: [
      { from: 'rgba(16, 34, 54, 0.28)', at: 0, to: 'rgba(16, 34, 54, 0.10)', mid: 0.5 },
      { from: 'rgba(0, 0, 0, 0)', at: 0.5, to: 'rgba(0, 0, 0, 0.34)', mid: 1 },
    ],
    sun: false,
  },
};

const GAP = 0.008; // panel gutter, as a fraction of the canvas width

/** Panel rectangles for a layout, as {x, y, w, h} in pixels. */
export function panelRects(layout, w, h) {
  const g = Math.max(2, Math.round(w * GAP));
  const third = (h - 2 * g) / 3;
  switch (layout) {
    case 'hero3': {
      const heroW = Math.round(w * 0.62);
      const sideX = heroW + g;
      const sideW = w - sideX;
      return [
        { x: 0, y: 0, w: heroW, h },
        { x: sideX, y: 0, w: sideW, h: third },
        { x: sideX, y: third + g, w: sideW, h: third },
        { x: sideX, y: 2 * (third + g), w: sideW, h: third },
      ];
    }
    case 'grid4': {
      const cw = (w - g) / 2;
      const ch = (h - g) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + g, y: 0, w: cw, h: ch },
        { x: 0, y: ch + g, w: cw, h: ch },
        { x: cw + g, y: ch + g, w: cw, h: ch },
      ];
    }
    case 'triptych': {
      const cw = (w - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: cw, h },
        { x: cw + g, y: 0, w: cw, h },
        { x: 2 * (cw + g), y: 0, w: cw, h },
      ];
    }
    default: // fullbleed
      return [{ x: 0, y: 0, w, h }];
  }
}

/** Which panel index holds the point (x, y), or -1. */
export function hitPanel(layout, w, h, x, y) {
  return panelRects(layout, w, h).findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

/** Draws one panel's photo cropped to its rectangle, honouring zoom and pan. */
function drawPanelPhoto(ctx, panel, rect) {
  const img = panel.img;
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#3a1b5e');
    grad.addColorStop(1, '#160a24');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Washes the panels in the grade's overlays. */
function drawGrade(ctx, grade, rects, w, h) {
  ctx.save();
  ctx.beginPath();
  for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (grade.sun) {
    const sun = ctx.createRadialGradient(w * 0.76, h * 0.14, 0, w * 0.76, h * 0.14, w * 0.42);
    sun.addColorStop(0, 'rgba(255, 205, 100, 0.45)');
    sun.addColorStop(1, 'rgba(255, 205, 100, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
  }
  for (const o of grade.overlays) {
    const grad = ctx.createLinearGradient(0, h * o.at, 0, h * o.mid);
    grad.addColorStop(0, o.from);
    grad.addColorStop(1, o.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * o.at, w, h * (o.mid - o.at));
  }
  ctx.restore();
}

let noisePattern = null;
/** Tiles a fine film grain over the panels. */
function drawGrain(ctx, rects, w, h) {
  if (!noisePattern) {
    const n = document.createElement('canvas');
    n.width = 140;
    n.height = 140;
    const nctx = n.getContext('2d');
    const data = nctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 110 + Math.floor(Math.random() * 90);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
    noisePattern = ctx.createPattern(n, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = noisePattern;
  ctx.beginPath();
  for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill();
  ctx.restore();
}

/** Darkens the corners so the middle pops. */
function drawVignette(ctx, rects, w, h) {
  ctx.save();
  ctx.beginPath();
  for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(8, 2, 16, 0)');
  v.addColorStop(1, 'rgba(8, 2, 16, 0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Fits the title to the width, shrinking it until it fits. */
function fitFont(ctx, text, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the masthead, title band, title and subtitle. */
function drawLettering(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = h * 0.24;
  const band = ctx.createLinearGradient(0, h - bandH, 0, h);
  band.addColorStop(0, 'rgba(12, 4, 24, 0)');
  band.addColorStop(0.55, 'rgba(12, 4, 24, 0.72)');
  band.addColorStop(1, 'rgba(12, 4, 24, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH, w, bandH);

  // Masthead, small caps top left.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const mastSize = fitFont(ctx, 'VICE SUNSET', '"Anton", "Arial Narrow", sans-serif', h * 0.034, w * 0.5);
  ctx.font = `${mastSize}px "Anton", "Arial Narrow", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText('VICE SUNSET', w * 0.035, h * 0.055);

  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, '"Pacifico", cursive', h * 0.048, w * 0.86);
    ctx.font = `${subSize}px "Pacifico", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5da2';
    ctx.shadowColor = 'rgba(255, 45, 149, 0.9)';
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillText(subtitle, w / 2, h - bandH * 0.68);
    ctx.shadowBlur = 0;
  }
  if (title) {
    const size = fitFont(ctx, title, '"Anton", "Arial Narrow", sans-serif', h * 0.115, w * 0.92);
    ctx.font = `${size}px "Anton", "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    const grad = ctx.createLinearGradient(0, h - bandH * 0.62, 0, h - bandH * 0.10);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffe9a8');
    grad.addColorStop(1, '#ff9a3d');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160818';
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(title, w / 2, h - bandH * 0.13);
    ctx.fillStyle = grad;
    ctx.fillText(title, w / 2, h - bandH * 0.13);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

/**
 * Draws the whole cover onto `canvas` at the named size.
 * `state` holds layout, grade, title, subtitle, panels, grain and frame.
 */
export function drawCover(canvas, state, sizeName) {
  const size = SIZES[sizeName] || SIZES.square;
  const { w, h } = size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.vice;
  const rects = panelRects(state.layout, w, h);

  ctx.fillStyle = '#ffffff'; // poster gutters and frame
  ctx.fillRect(0, 0, w, h);
  const inset = state.frame ? Math.max(4, Math.round(w * 0.012)) : 0;
  const inner = rects.map((r) => ({
    x: r.x + (r.x === 0 ? inset : 0),
    y: r.y + (r.y === 0 ? inset : 0),
    w: r.w - (r.x === 0 ? inset : 0) - (r.x + r.w === w ? inset : 0),
    h: r.h - (r.y === 0 ? inset : 0) - (r.y + r.h === h ? inset : 0),
  }));
  for (let i = 0; i < inner.length; i++) drawPanelPhoto(ctx, state.panels[i] || {}, inner[i]);
  drawGrade(ctx, grade, inner, w, h);
  if (state.grain !== false) drawGrain(ctx, inner, w, h);
  drawVignette(ctx, inner, w, h);
  drawLettering(ctx, state, w, h);
  return size;
}

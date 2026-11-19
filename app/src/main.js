// Wires the Vice Sunset Cover Studio: photos, panels, grades, caption and export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, hitPanel, panelRects, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const SAMPLES = [
  { name: 'pier', label: 'Pier', url: 'samples/pier.jpg' },
  { name: 'boulevard', label: 'Boulevard', url: 'samples/boulevard.jpg' },
];

/** The cover's state: layout, grade, caption and one photo slot per panel. */
const state = {
  layout: 'hero3',
  grade: 'vice',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'Vice City nights',
  grain: true,
  frame: true,
  panels: [
    { img: null, name: 'pier', zoom: 1, ox: 0, oy: 0 },
    { img: null, name: 'boulevard', zoom: 1, ox: 0, oy: 0 },
    { img: null, name: 'pier', zoom: 1.35, ox: -0.08, oy: 0.05 },
    { img: null, name: 'boulevard', zoom: 1.2, ox: 0.06, oy: -0.04 },
  ],
};
let selectedPanel = 0;
let uploads = []; // {name, url, img}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

/** All photos the user can pick from: samples first, then uploads. */
function photoChoices() {
  return [...SAMPLES, ...uploads];
}

function redraw() {
  drawCover(canvas, state, state.size);
}

/** Builds the layout / grade / size picker buttons. */
function buildPickers() {
  const layouts = document.getElementById('layouts');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.setAttribute('aria-pressed', String(state.layout === key));
    b.addEventListener('click', () => {
      state.layout = key;
      selectedPanel = 0;
      buildPickers();
      buildPanelRows();
      redraw();
    });
    layouts.appendChild(b);
  }
  const grades = document.getElementById('grades');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.setAttribute('aria-pressed', String(state.grade === key));
    b.addEventListener('click', () => {
      state.grade = key;
      buildPickers();
      redraw();
    });
    grades.appendChild(b);
  }
  const sizes = document.getElementById('sizes');
  for (const [key, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `PNG ${def.label}`;
    b.addEventListener('click', () => exportSize(key));
    sizes.appendChild(b);
  }
}

/** Builds the photo tray: one thumbnail per photo, click to fill the selected panel. */
function buildTray() {
  const tray = document.getElementById('tray');
  tray.replaceChildren();
  for (const photo of photoChoices()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Use ${photo.label || photo.name} in the selected panel`;
    b.setAttribute('aria-pressed', String(state.panels[selectedPanel]?.name === photo.name));
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.label || photo.name;
    b.appendChild(img);
    b.addEventListener('click', async () => {
      const panel = state.panels[selectedPanel];
      panel.img = photo.img;
      panel.name = photo.name;
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildTray();
      buildPanelRows();
      redraw();
      setStatus(`${photo.label || photo.name} is in panel ${selectedPanel + 1}.`);
    });
    tray.appendChild(b);
  }
}

/** Builds one editor row per panel of the current layout. */
function buildPanelRows() {
  const wrap = document.getElementById('panels');
  wrap.replaceChildren();
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    row.addEventListener('click', () => {
      selectedPanel = i;
      buildTray();
      buildPanelRows();
      redraw();
    });
    const head = document.createElement('div');
    head.className = 'panel-head';
    const strong = document.createElement('strong');
    strong.textContent = `Panel ${i + 1}`;
    const center = document.createElement('button');
    center.type = 'button';
    center.textContent = 'Centre photo';
    center.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildPanelRows();
      redraw();
    });
    head.append(strong, center);
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    for (const photo of photoChoices()) {
      const opt = document.createElement('option');
      opt.value = photo.name;
      opt.textContent = photo.label || photo.name;
      if (panel.name === photo.name) opt.selected = true;
      select.appendChild(opt);
    }
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Empty panel';
    if (!panel.img) empty.selected = true;
    select.appendChild(empty);
    select.addEventListener('change', () => {
      const photo = photoChoices().find((p) => p.name === select.value);
      if (photo) {
        panel.img = photo.img;
        panel.name = photo.name;
      } else {
        panel.img = null;
        panel.name = '';
      }
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildPanelRows();
      redraw();
    });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom || 1);
    zoom.setAttribute('aria-label', `Zoom for panel ${i + 1}`);
    const zoomLabel = document.createElement('div');
    zoomLabel.className = 'zoom-label';
    zoomLabel.textContent = `Zoom ${Number(zoom.value).toFixed(2)}x — drag the preview to move the photo`;
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      zoomLabel.textContent = `Zoom ${panel.zoom.toFixed(2)}x — drag the preview to move the photo`;
      redraw();
    });
    row.append(head, select, zoom, zoomLabel);
    wrap.appendChild(row);
  }
}

/** Renders one size offscreen and downloads it as a PNG. */
function exportSize(sizeName) {
  const off = document.createElement('canvas');
  drawCover(off, state, sizeName);
  const def = SIZES[sizeName];
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — the canvas was empty.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-cover-${def.w}x${def.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-sunset-cover-${def.w}x${def.h}.png`);
  }, 'image/png');
}

document.getElementById('exportAll').addEventListener('click', () => {
  for (const key of Object.keys(SIZES)) exportSize(key);
  setStatus('Exporting all three sizes — check your downloads.');
});

document.getElementById('uploads').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      uploads.push({ name: file.name.replace(/\.[^.]+$/, ''), label: file.name, url, img });
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  if (files.length) {
    buildTray();
    buildPanelRows();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — click one to fill the selected panel.`);
  }
  e.target.value = '';
});

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('frame').addEventListener('change', (e) => {
  state.frame = e.target.checked;
  redraw();
});

// Drag a panel's photo to move it; the wheel zooms it.
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = hitPanel(state.layout, canvas.width, canvas.height, x, y);
  if (hit < 0) return;
  selectedPanel = hit;
  buildTray();
  buildPanelRows();
  const panel = state.panels[hit];
  dragging = { panel, startX: x, startY: y, ox: panel.ox || 0, oy: panel.oy || 0, w: canvas.width, h: canvas.height };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const panelRect = panelRects(state.layout, canvas.width, canvas.height)[selectedPanel];
  dragging.panel.ox = dragging.ox + (x - dragging.startX) / panelRect.w;
  dragging.panel.oy = dragging.oy + (y - dragging.startY) / panelRect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  dragging = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  panel.zoom = Math.min(2.5, Math.max(1, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93)));
  buildPanelRows();
  redraw();
}, { passive: false });

/** Applies a screenshot scene: loads the named photos and sets the cover's state. */
export async function applyShot(config) {
  if (config.layout) state.layout = config.layout;
  if (config.grade) state.grade = config.grade;
  if (config.size) state.size = config.size;
  if (config.title !== undefined) {
    state.title = config.title;
    document.getElementById('title').value = config.title;
  }
  if (config.subtitle !== undefined) {
    state.subtitle = config.subtitle;
    document.getElementById('subtitle').value = config.subtitle;
  }
  const hero = photoChoices().find((p) => p.name === config.photo) || photoChoices()[0];
  const other = photoChoices().find((p) => p.name !== hero.name) || hero;
  const picks = [hero, other, hero, other];
  // Wide side panels are short, so gentler crops keep faces in frame.
  const zooms = config.size === 'wide' ? [1, 1, 1.12, 1.05] : [1, 1, 1.4, 1.2];
  const pans = config.size === 'wide'
    ? [[0, 0], [0, 0], [-0.05, 0.14], [0.04, -0.02]]
    : [[0, 0], [0, 0], [-0.08, 0.05], [0.06, -0.04]];
  state.panels = picks.map((photo, i) => ({
    img: photo.img, name: photo.name, zoom: zooms[i], ox: pans[i][0], oy: pans[i][1],
  }));
  buildPickers();
  buildTray();
  buildPanelRows();
  await document.fonts.ready;
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  // Load the sample photos first, then let the shot scene arrange the cover.
  Promise.all(SAMPLES.map(async (s) => {
    s.img = await loadImage(s.url);
  })).then(() => runShot(shot, new URLSearchParams(location.search), applyShot));
} else {
  Promise.all(SAMPLES.map(async (s) => {
    s.img = await loadImage(s.url);
  })).then(() => {
    state.panels[0].img = SAMPLES[0].img;
    state.panels[1].img = SAMPLES[1].img;
    state.panels[2].img = SAMPLES[0].img;
    state.panels[3].img = SAMPLES[1].img;
    buildPickers();
    buildTray();
    buildPanelRows();
    redraw();
  });
}

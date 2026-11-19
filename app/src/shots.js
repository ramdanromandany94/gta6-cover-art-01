// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone. `photo` picks the sample (samples/<photo>.jpg),
// `caption` the title words, `layout`, `grade` and `size` the cover's settings.
// window.__shotReady is set once the cover is painted.
export async function runShot(shot, query, applyShot) {
  const config = {
    photo: query.get('photo') ?? 'pier',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice City nights',
    layout: query.get('layout') ?? 'hero3',
    grade: query.get('grade') ?? 'vice',
    size: query.get('size') ?? 'square',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  await applyShot(config);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

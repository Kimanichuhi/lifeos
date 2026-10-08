// Derives the Workout page artwork from the full character illustration
// (public/fitness.png). Run manually with:
//   node scripts/gen-workout-art.mjs
// Re-run this after replacing the source illustration.
import sharp from 'sharp';

const SRC = 'public/fitness.png';
// Square around the character's head (hair to chin + a little neck) in the
// 1024×1536 source.
const FACE = { left: 378, top: 0, width: 204, height: 204 };

/** Background → transparent: flood-fill light, low-saturation pixels from the edges. */
function keyOutBackground(data, w, h) {
  const isBg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 28;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !isBg(p * 4)) continue;
    seen[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  // Fade the cut-off neck at the bottom so it blends into the figure's neck.
  const fadeFrom = Math.round(h * 0.86);
  for (let y = fadeFrom; y < h; y++) {
    const k = 1 - (y - fadeFrom) / (h - fadeFrom);
    for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] *= k;
  }
}

async function gen() {
  // Head for the animated figure, background removed so it sits on the SVG body.
  const size = 160;
  const { data, info } = await sharp(SRC).extract(FACE).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyOutBackground(data, info.width, info.height);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile('public/workout/face.webp');
  console.log('wrote public/workout/face.webp');

  // Full illustration for the coach card / alarm, sized for 2× displays.
  await sharp(SRC).resize({ width: 640 }).webp({ quality: 82 }).toFile('public/workout/coach.webp');
  console.log('wrote public/workout/coach.webp');
}

gen();

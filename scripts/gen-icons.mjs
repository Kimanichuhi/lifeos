// Regenerates every favicon/PWA icon in public/icons/ from the brand
// artwork (public/icons/nerd icon.jpeg). Run manually with:
//   node scripts/gen-icons.mjs
// Re-run this after replacing the source artwork rather than editing the
// generated PNGs by hand.
import sharp from 'sharp';

const SRC = 'public/icons/nerd icon.jpeg';
// Sampled from the source artwork's own background so padding blends in
// seamlessly instead of leaving a visible seam.
const BG = { r: 247, g: 244, b: 239, alpha: 1 };

async function squareIcon(size, outPath) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(outPath);
  console.log('wrote', outPath, `${size}x${size}`);
}

// Maskable icons get cropped to a circle/squircle by the OS (Android home
// screens, etc.), so the art is shrunk and centered on a full-bleed canvas
// to keep everything inside the safe zone.
async function maskableIcon(size, outPath) {
  const inner = Math.round(size * 0.72);
  const art = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: BG }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath, `${size}x${size}`, '(maskable, safe-zone padded)');
}

async function gen() {
  await squareIcon(64, 'public/icons/favicon.png');
  await squareIcon(180, 'public/icons/apple-touch-icon.png');
  await squareIcon(192, 'public/icons/icon-192.png');
  await squareIcon(512, 'public/icons/icon-512.png');
  await maskableIcon(512, 'public/icons/icon-maskable-512.png');
}

gen().catch((e) => { console.error(e); process.exit(1); });

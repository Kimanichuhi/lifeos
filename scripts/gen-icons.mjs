import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const accent = '#5a6cec';
const dark = '#0a0b14';

function svgIcon(size, maskable = false) {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const inner = size - pad * 2;
  const cx = size / 2;
  const r = inner * 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#4250a8"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="url(#bg)"/>
  <g transform="translate(${cx} ${cx})" filter="url(#glow)">
    <circle r="${r}" fill="none" stroke="white" stroke-width="${size * 0.035}" stroke-linecap="round" stroke-dasharray="${r * 0.7} ${r * 1.6}" transform="rotate(-90)"/>
    <path d="M0 ${-r * 0.45} L${r * 0.28} ${-r * 0.05} L0 ${r * 0.18} L${-r * 0.28} ${-r * 0.05} Z" fill="white"/>
    <circle r="${r * 0.12}" fill="white"/>
  </g>
</svg>`;
}

async function gen() {
  for (const { size, file, maskable } of [
    { size: 192, file: 'public/icons/icon-192.png', maskable: false },
    { size: 512, file: 'public/icons/icon-512.png', maskable: false },
    { size: 512, file: 'public/icons/icon-maskable-512.png', maskable: true },
    { size: 180, file: 'public/icons/apple-touch-icon.png', maskable: false },
  ]) {
    const svg = Buffer.from(svgIcon(size, maskable));
    await sharp(svg).png().toFile(file);
    console.log('wrote', file);
  }
  // favicon
  const svg = Buffer.from(svgIcon(64, false));
  await sharp(svg).png().toFile('public/icons/favicon.png');
  console.log('wrote favicon');
}

gen().catch((e) => { console.error(e); process.exit(1); });

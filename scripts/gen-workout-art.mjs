// Derives the Workout page coach artwork from the full character illustration
// (public/fitness.png). Run manually with:
//   node scripts/gen-workout-art.mjs
// Re-run this after replacing the source illustration.
import sharp from 'sharp';

const SRC = 'public/fitness.png';

async function gen() {
  // Full illustration for the coach card / alarm, sized for 2× displays.
  await sharp(SRC).resize({ width: 640 }).webp({ quality: 82 }).toFile('public/workout/coach.webp');
  console.log('wrote public/workout/coach.webp');
}

gen();

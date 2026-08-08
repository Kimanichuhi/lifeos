// Shared vivid hue palette for per-section color coding across the sidebar,
// dashboard, and other views. Values are "R G B" triples so callers can
// compose rgb(...) with any alpha, matching the --accent-* CSS var convention.
export const HUES = {
  violet: '139 92 246',
  rose: '244 63 94',
  sky: '14 165 233',
  emerald: '16 185 129',
  amber: '245 158 11',
  orange: '249 115 22',
  cyan: '6 182 212',
  yellow: '234 179 8',
  teal: '20 184 166',
  green: '34 197 94',
  pink: '236 72 153',
  slate: '100 116 139',
} as const;

export type HueName = keyof typeof HUES | 'accent';

export function hueTriple(name: HueName): string {
  return name === 'accent' ? 'var(--accent-500)' : HUES[name];
}

export function hueRGB(name: HueName, alpha?: number): string {
  const triple = hueTriple(name);
  return alpha === undefined ? `rgb(${triple})` : `rgb(${triple} / ${alpha})`;
}

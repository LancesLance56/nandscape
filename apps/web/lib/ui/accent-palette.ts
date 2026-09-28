/**
 * The ramp used to tint index tiles.
 *
 * The brand primaries - crayola blue, scarlet rush, golden pollen - plus a
 * deeper blue and the ink, so a grid of tiles reads as blocks of flat primary
 * colour rather than a gradient of one hue. Rendered at 14-34% over
 * transparent (see rail.tsx), so even the pollen lands as a legible wash, and
 * the numerals mix toward black for contrast.
 */
export const ACCENT_PALETTE: readonly string[] = [
  "#3772ff", // crayola blue (the accent)
  "#df2935", // scarlet rush
  "#fdca40", // golden pollen
  "#1d47c2", // deep blue
  "#4a474b", // ink
  "#b81d28", // deep scarlet
];

/**
 * Picks a colour from a stable seed, so a given section or tool keeps its
 * colour across reloads and between server and client render.
 */
export function accentFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

/**
 * Spreads colours across a list so neighbours never repeat.
 *
 * Hashing alone happily gives two adjacent tiles the same colour, which looks
 * like a mistake rather than a pattern. This keeps the hash as the starting
 * point and only nudges a tile forward when it collides with the one before.
 */
export function accentsFor(seeds: string[]): string[] {
  const out: string[] = [];
  for (const seed of seeds) {
    let colour = accentFor(seed);
    if (out.length > 0 && out[out.length - 1] === colour) {
      const next = (ACCENT_PALETTE.indexOf(colour) + 1) % ACCENT_PALETTE.length;
      colour = ACCENT_PALETTE[next];
    }
    out.push(colour);
  }
  return out;
}

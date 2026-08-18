/**
 * The warm accent palette used to colour index tiles.
 *
 * Deliberately narrow and all in the copper/amber family rather than a full
 * spectrum: a tile grid should read as one deliberate set, not as a bag of
 * random hues. There is no blue here for the same reason the tutorial badges
 * never had one, it pulls the eye out of the site's warm range.
 */
export const ACCENT_PALETTE: readonly string[] = [
  "#c15a2a", // copper
  "#e0a339", // amber
  "#b25a3b", // rust
  "#d9694f", // coral
  "#8a8f5c", // olive
  "#c97b3c", // ochre
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

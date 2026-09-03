/**
 * The muted ramp used to tint index tiles.
 *
 * Ink-wash page with a single sage accent, so tiles stay in a narrow
 * sage-through-grey range rather than reaching for a full spectrum. Rendered at
 * 14-34% over transparent (see rail.tsx), so even neighbouring steps land as
 * visibly different washes.
 */
export const ACCENT_PALETTE: readonly string[] = [
  "#2b8341", // green (the accent)
  "#4f8a5c",
  "#6f8f76",
  "#7d7d7d", // neutral ink
  "#8f8f8f",
  "#a2a2a2",
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

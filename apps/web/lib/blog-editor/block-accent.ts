import type { ContentBlock } from "@/types/content-block";
import { DEFAULT_BLOCK_COLORS, hexToRgba } from "@/lib/editor/block-colors";

/**
 * Deliberately hand-assigned, not hashed. There are exactly 9 block types -
 * a fixed set - so a hash (used elsewhere for the open-ended set of user
 * tags in puzzle-list.tsx) would just be an arbitrary, unstable-feeling
 * assignment for no benefit. Each color below is picked for a reason:
 */
export const BLOCK_ACCENT: Record<ContentBlock["type"], string | null> = {
  heading: DEFAULT_BLOCK_COLORS[0], // green - the site accent, matches how headline emphasis already reads
  image: DEFAULT_BLOCK_COLORS[1], // signal green - media
  video: DEFAULT_BLOCK_COLORS[2], // amber - media, distinct from image
  button: DEFAULT_BLOCK_COLORS[4], // rust - "action" without borrowing signal-coral's low/error meaning
  code: DEFAULT_BLOCK_COLORS[5], // olive - muted, technical
  divider: DEFAULT_BLOCK_COLORS[6], // pink - otherwise the only block with zero visible content in the list
  paragraph: DEFAULT_BLOCK_COLORS[7], // neutral gray - the default, most common block; shouldn't compete for attention
  table: DEFAULT_BLOCK_COLORS[8], // blue - structured data, distinct from every other block's meaning
  list: DEFAULT_BLOCK_COLORS[3], // signal coral - ordered/unordered items, a sibling of table
  callout: DEFAULT_BLOCK_COLORS[2], // amber - a set-apart aside, shares the "attention" read with video
  // No color: interactive blocks get a dashed/muted treatment instead (see
  // block-card.tsx) - the visual difference itself signals "not editable
  // yet," which is more honest than assigning a color that implies parity
  // with the other, actually-editable types.
  interactive: null,
};

export { hexToRgba };

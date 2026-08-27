import { getDiagramPresets } from "@/lib/diagrams/diagram-records";
import type { ContentBlock } from "@/types/content-block";

/**
 * Swaps `preset: "bubble"` for the stored spec, before anything renders.
 *
 * Done on the server, in one query for the whole page, so a diagram is part
 * of the HTML the reader receives rather than something that pops in later.
 * The alternative - each widget fetching its own preset on mount - would put
 * a spinner in the middle of an article for every chart in it.
 *
 * Widgets already accept a spec inline, so this needs no cooperation from
 * them: it hands them the shape they would have been given by hand.
 */

interface InteractiveLike {
  type: string;
  widget?: string;
  data?: Record<string, unknown>;
}

/** Which data key a widget family reads its inline spec from. */
const SPEC_KEY: Record<string, string> = {
  flowchart: "chart",
  "flowchart-maker": "chart",
};

function isInteractive(block: unknown): block is InteractiveLike {
  return typeof block === "object" && block !== null && (block as InteractiveLike).type === "interactive";
}

function presetOf(block: InteractiveLike): string | null {
  const preset = block.data?.preset;
  return typeof preset === "string" && preset.trim() !== "" ? preset : null;
}

export async function resolveBlockDiagrams(blocks: ContentBlock[]): Promise<ContentBlock[]> {
  const wanted: string[] = [];
  for (const block of blocks) {
    if (!isInteractive(block)) continue;
    if (!block.widget || !(block.widget in SPEC_KEY)) continue;
    const preset = presetOf(block);
    if (preset) wanted.push(preset);
  }

  if (wanted.length === 0) return blocks;

  const presets = await getDiagramPresets(wanted);

  return blocks.map((block) => {
    if (!isInteractive(block)) return block;
    if (!block.widget || !(block.widget in SPEC_KEY)) return block;

    const preset = presetOf(block);
    if (!preset) return block;

    const found = presets.get(preset);
    // A missing preset is left exactly as it was. The widget draws its own
    // "nothing here" state, which is a clearer signal than a page that
    // silently omits a diagram the prose refers to.
    if (!found) return block;

    const key = SPEC_KEY[block.widget];
    return { ...block, data: { ...block.data, [key]: found.spec } } as ContentBlock;
  });
}

import type { ContentBlock, TextSpan } from "@/types/content-block";

/** Average adult silent-reading speed, words per minute. Round, deliberately
 *  conservative - the number is a rough "how much of my time is this",
 *  not a stopwatch. */
const WORDS_PER_MINUTE = 200;

function words(text: string | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function countSpans(spans: TextSpan[] | undefined): number {
  if (!spans) return 0;
  return spans.reduce((n, span) => n + words(span.text), 0);
}

function wordsInBlock(block: ContentBlock): number {
  switch (block.type) {
    case "paragraph":
      return countSpans(block.content);
    case "heading":
      return words(block.text);
    case "callout":
      return countSpans(block.content) + words(block.title);
    case "list":
      return block.items.reduce((n, item) => n + countSpans(item), 0);
    case "table":
      return block.rows.reduce((n, row) => n + row.reduce((m, cell) => m + words(cell), 0), 0);
    case "code":
      // Code is scanned, not read word by word; count it lightly.
      return Math.round(words(block.code) / 3);
    case "image":
      return words(block.caption);
    default:
      // video / button / divider / interactive contribute no reading time.
      return 0;
  }
}

/** Whole-minute reading estimate for a block body, never below 1. */
export function readingTimeMinutes(blocks: ContentBlock[]): number {
  const total = blocks.reduce((n, block) => n + wordsInBlock(block), 0);
  return Math.max(1, Math.round(total / WORDS_PER_MINUTE));
}

/** "1 min read" / "7 min read" - the string both article routes render. */
export function readingTimeLabel(blocks: ContentBlock[]): string {
  return `${readingTimeMinutes(blocks)} min read`;
}

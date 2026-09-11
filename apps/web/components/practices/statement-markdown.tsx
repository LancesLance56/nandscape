import { MarkdownProse } from "@/components/content/markdown-prose";

/**
 * A problem statement.
 *
 * The renderer moved to `components/content/markdown-prose` once discussions
 * needed the same one. This name stays because a statement is a specific thing
 * with specific defaults - hard breaks off, because a problem statement is
 * authored content where a blank line is what starts a paragraph.
 */
export function StatementMarkdown({ source }: { source: string }) {
  return <MarkdownProse source={source} />;
}

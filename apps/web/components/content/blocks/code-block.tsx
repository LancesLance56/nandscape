import { highlighter } from "@/lib/shiki";
import type { CodeBlock } from "@/types/blog";
import { cn } from "@/lib/cn";
import { CodeTabs, type RenderedVariant } from "./code-tabs";

/** Shiki lang ids are lowercase and terse; these are what a reader expects to see. */
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  python: "Python",
  cpp: "C++",
  c: "C",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  bash: "Bash",
  verilog: "Verilog",
  latex: "LaTeX",
  text: "Text",
};

function label(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

function highlight(code: string, language: string): string {
  return highlighter.codeToHtml(code, {
    lang: language || "text",
    // Dual theme: every token carries both `--shiki-light` and `--shiki-dark`
    // as CSS variables and no hard-coded `color` (defaultColor: false). The
    // `.shiki` rules in globals.css pick which variable applies from the
    // site's `.dark` class, so code follows the theme toggle. The container's
    // own `bg-surface-2` supplies the surface in both modes.
    themes: { light: "light-plus", dark: "dark-plus" },
    defaultColor: false,
    transformers: [
      {
        pre(node) {
          // Keep Shiki's own `shiki` class - the dual-theme CSS variables on
          // every token are only turned into a real `color` by the
          // `.shiki`-scoped rules in globals.css. Overwriting the class
          // (rather than appending) is what left highlighting rendering as
          // plain unstyled text.
          const existing = typeof node.properties.class === "string" ? node.properties.class : "";
          node.properties.class = `${existing} overflow-x-auto p-4`.trim();
          node.properties.style = "background: transparent; margin: 0;";
        },
      },
    ],
  });
}

export async function CodeBlockView({
  block,
}: {
  block: CodeBlock & { className?: string };
}) {
  const primary = { language: block.language || "text", code: block.code };
  const extras = (block.variants ?? []).filter((v) => typeof v?.code === "string" && v.code.length > 0);

  // Single-language blocks keep the original chrome: a plain label strip, no
  // tabs to click, which is what most snippets on the site still are.
  if (extras.length === 0) {
    const html = highlight(primary.code, primary.language);
    return (
      <div className={cn("not-prose overflow-hidden rounded-xl border border-border bg-surface-2", block.className)}>
        {block.language && (
          <div className="border-b border-border px-4 py-1.5 font-mono text-[11px] text-slate">{block.language}</div>
        )}
        <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  const rendered: RenderedVariant[] = [primary, ...extras].map((v) => ({
    language: v.language,
    label: label(v.language),
    html: highlight(v.code, v.language),
  }));

  return <CodeTabs variants={rendered} className={block.className} />;
}

import type { CodeToHastOptions } from "shiki";

/**
 * The one definition of how this site highlights code.
 *
 * Three places need identical Shiki output and reach it by different routes:
 * the published code block (a Server Component calling the singleton in
 * lib/shiki.ts), the blog editor's live preview, and the Problem Studio's code
 * fields (both clients, dynamically importing `shiki/bundle/web`). They used to
 * carry three copies of the same options object and the same `pre` transformer,
 * with comments pointing at each other to keep them in step - which is exactly
 * the kind of agreement that quietly stops being true.
 *
 * Kept free of any import from lib/shiki.ts so a client bundle can use it
 * without dragging in the server-only highlighter singleton.
 */

/**
 * Dual theme: every token carries both `--shiki-light` and `--shiki-dark` as
 * CSS variables and no hard-coded `color` (`defaultColor: false`). The
 * `.shiki` rules in globals.css pick which variable applies from the site's
 * `.dark` class, so code follows the theme toggle with one render.
 */
export const SHIKI_THEMES = { light: "light-plus", dark: "dark-plus" } as const;

/**
 * Build the options for one snippet.
 *
 * The `pre` transformer *appends* to the class rather than replacing it:
 * Shiki's own `shiki` class is what the dual-theme CSS in globals.css hooks
 * onto, and overwriting it is what once left highlighted code rendering as
 * plain unstyled text.
 */
export function shikiOptions(
  language: string,
  extraPreClasses = "overflow-x-auto p-4",
): CodeToHastOptions<string, string> {
  return {
    lang: language || "text",
    themes: SHIKI_THEMES,
    defaultColor: false,
    transformers: [
      {
        pre(node) {
          const existing = typeof node.properties.class === "string" ? node.properties.class : "";
          node.properties.class = `${existing} ${extraPreClasses}`.trim();
          node.properties.style = "background: transparent; margin: 0;";
        },
      },
    ],
  } as CodeToHastOptions<string, string>;
}

/** Shiki lang ids are lowercase and terse; these are what a reader expects to see. */
export const LANGUAGE_LABELS: Record<string, string> = {
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

export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

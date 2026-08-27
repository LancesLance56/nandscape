import { createHighlighter } from "shiki";

export const highlighter = await createHighlighter({
  // `dark-plus` / `light-plus` are the dual-theme pair CodeBlockView emits
  // (as CSS variables), so code follows the site's light/dark toggle.
  themes: ["dark-plus", "light-plus"],
  langs: [
    "typescript",
    "javascript",
    "tsx",
    "jsx",
    "json",
    "html",
    "css",
    "bash",
    "cpp",
    "c",
    "python",
    "text",
    "verilog",
    "latex"
  ],
});
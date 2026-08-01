import { createHighlighter } from "shiki";

export const highlighter = await createHighlighter({
  themes: ["github-dark"],
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
  ],
});
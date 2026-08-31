import path from "path";
import type { NextConfig } from "next";

const devPort = process.env.WEB_PORT ?? "3000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Shiki has to load from node_modules rather than be bundled. Its grammars
  // and regex engine are pulled in at runtime, and once bundled the engine
  // comes up unable to match anything: highlighting silently degrades to one
  // flat token per line - a theme applied, no syntax. Nothing throws, which
  // is why it looks like the highlighter simply stopped caring.
  serverExternalPackages: ["shiki"],
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  allowedDevOrigins: [`localhost:${devPort}`, 'nandscape.dev', '192.168.5.67'],

  // Several thin graph-theory / sorting intro lessons were merged into one
  // stronger page each (better for search, one canonical URL instead of
  // three). The old lessons were published and linked, so their URLs 308 to
  // the relevant section of the merged page rather than 404ing. Both the
  // nested form and the legacy flat form (which app/tutorials/[track]/page.tsx
  // used to rewrite) are covered.
  async redirects() {
    const merges: Array<[string, string]> = [
      ["graph-what-is-a-graph", "graph-theory-basics#what-a-graph-actually-is"],
      ["graph-kinds-and-digraphs", "graph-theory-basics#directed-weighted-and-other-flavours"],
      ["graph-representations", "graph-theory-basics#storing-a-graph-in-code"],
      ["sorting-elementary", "sorting-introduction#bubble-selection-and-insertion-sort"],
      // The recursion pair and the memoization/tabulation pair were each one
      // lesson split in two. "recursion-as-induction" and
      // "memoization-top-down" led their merged page, so they land at the top
      // of it; the other two open a section partway down.
      ["recursion-as-induction", "recursion"],
      ["overlapping-subproblems", "recursion#when-recursion-does-the-same-work-twice"],
      ["memoization-top-down", "memoization-vs-tabulation"],
      [
        "tabulation-bottom-up",
        "memoization-vs-tabulation#tabulation-the-same-table-without-the-recursion",
      ],
    ];

    return [
      // The flowchart maker outgrew a widget in an article column and moved to
      // its own full-window route. Its old tool page was indexed and linked,
      // so it points at the new one rather than 404ing or serving a duplicate.
      { source: "/tools/flowchart-maker", destination: "/flowchart", permanent: true },

      ...merges.flatMap(([from, to]) => [
        { source: `/tutorials/dsa/${from}`, destination: `/tutorials/dsa/${to}`, permanent: true },
        { source: `/tutorials/${from}`, destination: `/tutorials/dsa/${to}`, permanent: true },
      ]),
    ];
  },
};

export default nextConfig;
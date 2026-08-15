/**
 * The standalone tool pages.
 *
 * These exist for a specific reason: nobody links to "another BFS tutorial",
 * but people do link to a thing that does a job ("here, use this K-map
 * solver"). The widgets already existed, buried inside tutorials where they
 * can't be found or cited on their own - each entry here gives one its own
 * URL, its own tool-intent title, and its own place in the sitemap.
 */
export interface ToolDefinition {
  slug: string;
  /** The on-page H1. */
  title: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  /** One or two sentences under the H1, before the widget. */
  intro: string;
  /** Key into the interactive widget registry (see interactive-block.tsx). */
  widget: string;
  widgetData?: Record<string, unknown>;
  /** Short "how to use this" bullets, rendered under the widget. */
  howTo: string[];
  /** Deeper reading, keeping the tool pages wired into the tutorial library
   *  rather than sitting as orphan pages. */
  related: { label: string; href: string }[];
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "karnaugh-map-solver",
    title: "Karnaugh Map Solver",
    seoTitle: "Karnaugh Map Solver: Simplify Boolean Expressions Online",
    seoDescription:
      "Free online Karnaugh map solver. Toggle cells on a 2, 3 or 4-variable K-map and get the simplified boolean expression, with the groups shown.",
    keywords: ["karnaugh map solver", "k-map solver", "boolean simplification", "karnaugh map calculator"],
    intro:
      "Click cells to set them to 1 and the map groups them for you, showing the simplified expression as you go. No signup, no install.",
    widget: "kmap-explorer",
    howTo: [
      "Click a cell to toggle it between 0 and 1.",
      "Groups are found automatically and highlighted as you change the map.",
      "The simplified sum-of-products expression updates underneath.",
    ],
    related: [
      { label: "How Karnaugh maps work, from the truth table up", href: "/tutorials/kmap-tabulation-fundamentals" },
      { label: "4-variable maps and the four corners", href: "/tutorials/kmap-four-variable" },
    ],
  },
  {
    slug: "number-base-converter",
    title: "Binary, Decimal and Hex Converter",
    seoTitle: "Binary to Decimal Converter: Binary, Decimal and Hex",
    seoDescription:
      "Convert between binary, decimal and hexadecimal by flipping bits. See all three bases update together so the relationship is obvious, not memorised.",
    keywords: ["binary to decimal", "binary converter", "decimal to binary", "hex converter", "number base converter"],
    intro:
      "Flip any bit and watch binary, decimal and hexadecimal move together. Built to show you why the conversion works, not just to hand you an answer.",
    widget: "number-base-explorer",
    howTo: [
      "Click any bit to flip it between 0 and 1.",
      "Each column is labelled with its place value, so you can see what each bit contributes.",
      "Binary, decimal and hex all update at once.",
    ],
    related: [{ label: "Two's complement calculator", href: "/tools/twos-complement-calculator" }],
  },
  {
    slug: "twos-complement-calculator",
    title: "Two's Complement Calculator",
    seoTitle: "Two's Complement Calculator: Signed Binary Explained",
    seoDescription:
      "Convert signed binary with a two's complement calculator that shows the negation step by step: invert every bit, then add one.",
    keywords: ["two's complement calculator", "twos complement", "signed binary", "negative binary numbers"],
    intro:
      "See the same bits read as unsigned and as two's complement side by side, and watch what negation actually does to them.",
    widget: "twos-complement-explorer",
    howTo: [
      "Click a bit to flip it. The leftmost bit is the sign bit.",
      "Compare the unsigned and two's complement readings of the identical pattern.",
      "Hit Negate to invert every bit and add one, the operation that makes a number negative.",
    ],
    related: [{ label: "Binary, decimal and hex converter", href: "/tools/number-base-converter" }],
  },
  {
    slug: "truth-table-generator",
    title: "Truth Table Generator",
    seoTitle: "Truth Table Generator for Logic Gates and Expressions",
    seoDescription:
      "Build a truth table for any logic gate and see every input combination and its output, with the rows highlighted as you explore them.",
    keywords: ["truth table generator", "logic gate truth table", "boolean truth table", "truth table calculator"],
    intro:
      "Pick a gate and step through every input combination. Useful when you need to check a row rather than trust your memory of it.",
    widget: "truth-table-explorer",
    howTo: [
      "Choose which gate the table describes.",
      "Each row is one possible input combination, with the resulting output.",
      "Use it to sanity-check a circuit you have built in the editor.",
    ],
    related: [
      { label: "Turning a truth table into a formula", href: "/tutorials/kmap-tabulation-fundamentals" },
      { label: "Open the logic gate editor", href: "/logic-editor" },
    ],
  },
  {
    slug: "graph-algorithm-visualizer",
    title: "Graph Algorithm Visualizer",
    seoTitle: "Graph Algorithm Visualizer: BFS, DFS and Dijkstra",
    seoDescription:
      "Step through BFS, DFS and Dijkstra one frame at a time on a graph you can click. See the queue, the stack and the distance table change as they run.",
    keywords: [
      "graph algorithm visualizer",
      "bfs visualization",
      "dfs visualization",
      "dijkstra visualizer",
      "algorithm animation",
    ],
    intro:
      "Play, pause and scrub through a traversal. The queue, stack and distance table update alongside the graph, so you can see why the algorithm does what it does.",
    widget: "graph-traversal",
    howTo: [
      "Press Play to run the traversal, or Step to advance one frame at a time.",
      "Click any node to restart from there.",
      "Switch between BFS and DFS to compare visit orders on the identical graph.",
    ],
    related: [
      { label: "BFS vs DFS explained", href: "/tutorials/graph-bfs-dfs" },
      { label: "Dijkstra's algorithm, worked through", href: "/tutorials/graph-dijkstra" },
      { label: "All algorithms tutorials", href: "/tutorials/dsa" },
    ],
  },
];

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

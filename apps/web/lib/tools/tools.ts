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
  /**
   * Rendered on the page and emitted as FAQPage structured data. These are
   * the questions people actually type into a search box, so answering them
   * in the page body is worth more than another paragraph of prose about
   * the tool itself.
   */
  faq?: { question: string; answer: string }[];
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: "karnaugh-map-solver",
    title: "Karnaugh Map Solver",
    seoTitle: "Karnaugh Map Solver: Simplify Boolean Expressions Online",
    seoDescription:
      "Free online Karnaugh map solver for 2, 3 and 4 variables. Click cells to set 1s and don't-cares, and get the minimal sum-of-products expression with every group outlined.",
    keywords: [
      "karnaugh map solver",
      "k-map solver",
      "karnaugh map calculator",
      "boolean expression simplifier",
      "sum of products calculator",
      "kmap solver 4 variables",
      "boolean algebra simplifier",
    ],
    intro:
      "Click cells to set them to 1 or a don't-care. The map is solved as you type, showing the minimal sum-of-products expression with every group outlined, including the ones that wrap around the edges.",
    widget: "kmap-explorer",
    widgetData: { mode: "solve", variables: ["A", "B", "C", "D"], title: "Karnaugh map solver" },
    howTo: [
      "Click a cell to cycle it between 0, 1 and X (don't-care).",
      "Groups are found and outlined automatically, each labelled with its product term.",
      "The minimal sum-of-products expression updates underneath, along with the term and literal count.",
      "Groups that wrap around an edge are drawn with a dashed outline in each piece.",
    ],
    related: [
      { label: "How Karnaugh maps work, from the truth table up", href: "/tutorials/kmap-tabulation-fundamentals" },
      { label: "4-variable maps and the four corners", href: "/tutorials/kmap-four-variable" },
      { label: "Practice with random K-maps", href: "/tools/karnaugh-map-practice" },
    ],
    faq: [
      {
        question: "How does a Karnaugh map solver work?",
        answer:
          "It finds every prime implicant of the function using the Quine-McCluskey method, keeps the ones that are essential (the only group covering some 1), then searches for the cheapest combination that covers whatever is left. The result is a genuinely minimal sum of products, not just a correct one.",
      },
      {
        question: "What is a don't-care in a Karnaugh map?",
        answer:
          "A don't-care, written X, is an input combination the function will never receive, so its output does not matter. You may include it in a group when doing so makes the group larger, or leave it out. Using them well often removes a whole term from the answer.",
      },
      {
        question: "Why can Karnaugh map groups wrap around the edges?",
        answer:
          "Because the rows and columns are labelled in Gray code, where neighbouring labels differ in exactly one bit. The first and last columns also differ in one bit, so they are adjacent too. That makes the map a torus rather than a flat rectangle, which is why the four corner cells of a 4-variable map form a single valid group.",
      },
      {
        question: "What size can a Karnaugh map group be?",
        answer:
          "Any power of two: 1, 2, 4, 8 or 16 cells, arranged as a rectangle that may wrap around the edges. Each doubling of the group size removes one literal from the term, so the largest legal group is always the one you want.",
      },
      {
        question: "Can a Karnaugh map have more than one correct answer?",
        answer:
          "Yes. Many functions have several groupings that are all equally minimal, with the same number of terms and literals. Any of them is a correct answer, which is why this tool reports when alternatives exist rather than treating one arrangement as the only right one.",
      },
    ],
  },
  {
    slug: "karnaugh-map-practice",
    title: "Karnaugh Map Practice Problems",
    seoTitle: "Karnaugh Map Practice Problems: Random K-Map Generator",
    seoDescription:
      "Free random Karnaugh map generator with instant marking. Endless K-map practice problems for 3 and 4 variables, with don't-cares, graded against the true minimal solution.",
    keywords: [
      "karnaugh map practice problems",
      "karnaugh map generator",
      "k-map practice",
      "random karnaugh map",
      "karnaugh map exercises with answers",
      "k map questions",
      "boolean simplification practice",
    ],
    intro:
      "A fresh randomly generated K-map every time, marked as you go. Group the cells yourself and find out whether your answer is minimal, not merely correct.",
    widget: "kmap-practice",
    widgetData: { difficulty: "easy" },
    howTo: [
      "Pick a difficulty. Easy is 3 variables; medium and hard are 4 variables and add don't-cares.",
      "Click cells to select a group, then press Confirm group. Repeat until every 1 is covered.",
      "Your answer is checked against the true minimal solution, so it tells you when a correct answer could still be smaller.",
      "Press New random problem for another one, or Give up to see the worked answer.",
    ],
    related: [
      { label: "Karnaugh map solver", href: "/tools/karnaugh-map-solver" },
      { label: "Start with 2-variable maps", href: "/tutorials/kmap-two-variable" },
      { label: "Worked examples and don't-cares", href: "/tutorials/kmap-worked-examples" },
    ],
    faq: [
      {
        question: "How do you know if a Karnaugh map answer is minimal?",
        answer:
          "An answer is minimal when no other grouping covers the same 1s with fewer product terms, and no other grouping with that many terms uses fewer literals. This tool computes the true minimum with the Quine-McCluskey algorithm and compares your grouping against it, so a correct-but-oversized answer is marked as such.",
      },
      {
        question: "What order should I pick Karnaugh map groups in?",
        answer:
          "Start with any 1 that can only be covered one way, since the group covering it is forced. Take the largest legal group each time, and stop as soon as every 1 is covered. A group whose 1s are all already covered by other groups is redundant and should be dropped.",
      },
      {
        question: "Are these Karnaugh map problems random?",
        answer:
          "Every problem is generated from a random seed rather than drawn from a fixed set, so the supply does not run out. Generated maps are filtered to remove degenerate cases: problems that simplify to a constant, or where circling each 1 separately is already optimal, are discarded because they teach nothing.",
      },
      {
        question: "How many variables do the practice problems use?",
        answer:
          "Easy problems use 3 variables on a 2 by 4 map. Medium and hard use 4 variables on a 4 by 4 map, and include don't-care cells. Hard problems have more product terms and more don't-cares, so there is more scope for a correct answer to be non-minimal.",
      },
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

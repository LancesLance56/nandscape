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
  /**
   * Where this tool actually lives, when that is not `/tools/<slug>`.
   *
   * A tool big enough to need the whole window earns its own route, and
   * serving it at both URLs would be two pages of identical content. The
   * entry stays here so the tool keeps its place in the index, the homepage
   * bento and the embed catalog; only the page moves, and `/tools/<slug>`
   * redirects to it (see next.config.ts).
   */
  href?: string;
  widgetData?: Record<string, unknown>;
  /**
   * Iframe height the embed snippet suggests for this tool, in pixels.
   * Optional: the default suits most widgets, and only the notably taller or
   * shorter ones need to say so (see lib/embeds/embeddable.ts).
   */
  embedHeight?: number;
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
    embedHeight: 640,
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
    embedHeight: 360,
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
    embedHeight: 400,
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
    embedHeight: 460,
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
    slug: "sorting-algorithm-visualizer",
    title: "Sorting Algorithm Visualizer",
    seoTitle: "Sorting Algorithm Visualizer: Compare 7 Sorts Step by Step",
    seoDescription:
      "Free sorting algorithm visualizer. Watch bubble, selection, insertion, merge, quick, heap and counting sort run step by step, with live comparison and write counts on the same input.",
    keywords: [
      "sorting algorithm visualizer",
      "sorting visualizer",
      "merge sort visualization",
      "quick sort visualization",
      "bubble sort animation",
      "compare sorting algorithms",
      "heap sort visualizer",
    ],
    intro:
      "Seven sorting algorithms on the input of your choice, one frame at a time. The counters underneath show exactly how many comparisons and writes each one spends, so the difference between them is a number rather than a claim.",
    widget: "sorting-visualizer",
    embedHeight: 720,
    widgetData: { algorithm: "quick", preset: "random", size: 16 },
    howTo: [
      "Pick an algorithm, then press Play or step through one frame at a time.",
      "Change the input shape: nearly sorted, reversed and few-unique inputs are where the algorithms stop looking alike.",
      "Watch the colours: copper is a comparison, coral is a write, green means the value is in its final position.",
      "The table at the bottom runs every algorithm on the identical input so the costs can be compared directly.",
    ],
    related: [
      { label: "How sorting works, and the n log n limit", href: "/tutorials/dsa/sorting-introduction" },
      { label: "Merge sort explained", href: "/tutorials/dsa/sorting-merge-sort" },
      { label: "Quick sort and partitioning", href: "/tutorials/dsa/sorting-quick-sort" },
      { label: "Graph algorithm visualizer", href: "/tools/graph-algorithm-visualizer" },
    ],
    faq: [
      {
        question: "Which sorting algorithm is the fastest?",
        answer:
          "For general use, quick sort is usually fastest in practice because its inner loop is tight and cache-friendly, even though its worst case is O(n²). Merge sort matches it asymptotically and is stable but needs O(n) extra memory. Real language runtimes mostly use hybrids: Timsort in Python and Java for objects, and introsort (quick sort that falls back to heap sort) in C++.",
      },
      {
        question: "What does it mean for a sort to be stable?",
        answer:
          "A stable sort keeps equal elements in their original relative order. It matters whenever records are sorted by more than one field: sort by name, then stably by department, and within each department the names are still in order. Merge, insertion, bubble and counting sort are stable; quick, heap and selection sort are not.",
      },
      {
        question: "Why can't any comparison sort beat O(n log n)?",
        answer:
          "A comparison sort learns about the input only through yes/no comparisons, so a run of c comparisons can distinguish at most 2^c different orderings. There are n! possible orderings, so 2^c must be at least n!, which gives c ≥ log2(n!) ≈ n log n. Counting and radix sort get around this by not comparing elements at all.",
      },
      {
        question: "When should I use insertion sort?",
        answer:
          "On small arrays and on nearly-sorted data, where it runs in close to linear time. That is why production sorts switch to insertion sort once a partition drops below roughly 10 to 30 elements: at that size its low overhead beats the recursion of an asymptotically better algorithm.",
      },
      {
        question: "What is the difference between comparisons and writes?",
        answer:
          "A comparison asks which of two elements is larger; a write stores a value into the array. They are counted separately because they can cost very different amounts. Selection sort does O(n²) comparisons but only n-1 swaps, which makes it attractive when writing is expensive, such as to flash memory.",
      },
    ],
  },
  {
    slug: "flowchart-maker",
    href: "/flowchart",
    title: "Flowchart Maker",
    seoTitle: "Free Flowchart Maker for Algorithms: Build and Edit Online",
    seoDescription:
      "Free online flowchart maker with automatic layout. Add process, decision and terminal boxes, connect them, and the chart arranges itself. Includes ready-made sorting algorithm flowcharts.",
    keywords: [
      "flowchart maker",
      "algorithm flowchart",
      "free flowchart tool",
      "flowchart generator online",
      "sorting algorithm flowchart",
      "bubble sort flowchart",
      "pseudocode flowchart",
    ],
    intro:
      "Build a flowchart by adding boxes and dragging arrows between them. Boxes place themselves until you move one, and then they stay put. Start from a blank chart or load one of the sorting algorithms.",
    widget: "flowchart-maker",
    embedHeight: 700,
    howTo: [
      "Add boxes from the palette: start and end are pills, process is a rectangle, decision is a diamond.",
      "Adding a box while another is selected connects the two, so a chain of steps builds itself.",
      "Double-click a box to rename it where it sits, or press Enter with it selected.",
      "Drag from the dot on a box's edge to another box to draw an arrow. Label the branches out of a decision, usually yes and no.",
      "Drag a box to pin it exactly where you want it; everything you have not moved keeps arranging itself around it.",
      "Arrows that point back up the chart are drawn dashed, so loops are visible at a glance.",
      "Warnings call out the common mistakes: a decision with one exit, an unreachable box, a missing start.",
      "Copy the chart as JSON to save it or paste it into a tutorial page.",
    ],
    related: [
      { label: "Merge sort, step by step", href: "/tutorials/dsa/sorting-merge-sort" },
      { label: "Quick sort, step by step", href: "/tutorials/dsa/sorting-quick-sort" },
      { label: "Sorting algorithm visualizer", href: "/tools/sorting-algorithm-visualizer" },
    ],
    faq: [
      {
        question: "What do the different flowchart shapes mean?",
        answer:
          "A rounded pill is a terminal, meaning start or end. A rectangle is a process: a step that does something. A diamond is a decision, which asks a yes/no question and has one arrow leaving it per answer. A parallelogram is input or output. These shapes come from the ANSI and ISO 5807 flowchart conventions and are near-universal.",
      },
      {
        question: "How do you draw a loop in a flowchart?",
        answer:
          "A loop is an arrow that points back to an earlier box. There is no special symbol for it: a while loop is a decision box whose 'yes' branch runs the body and then returns to the decision, and whose 'no' branch continues past it. This tool draws those back edges dashed and routes them down the side so they do not cross the main flow.",
      },
      {
        question: "Can a flowchart show recursion?",
        answer:
          "Not directly. A flowchart describes one pass through a procedure, and recursion means the procedure invokes itself, which the notation has no symbol for. The usual convention is to draw a single call and show the recursive step as an ordinary process box, which is how the merge sort and quick sort charts here are drawn.",
      },
      {
        question: "Can I move the boxes myself?",
        answer:
          "Yes. Every box is placed automatically until you drag it, and from then on it stays exactly where you dropped it while the rest of the chart keeps arranging itself around it. Auto-layout releases every box at once, or a single box can be unpinned from its own panel, so a chart can never get stuck in a half-arranged state you cannot escape.",
      },
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
      { label: "Topological sort visualizer", href: "/tools/topological-sort-visualizer" },
      { label: "All algorithms tutorials", href: "/tutorials/dsa" },
    ],
  },
  {
    slug: "topological-sort-visualizer",
    title: "Topological Sort Visualizer",
    seoTitle: "Topological Sort Visualizer: Kahn's Algorithm Step by Step",
    seoDescription:
      "Free topological sort visualizer using Kahn's algorithm. Watch the ready queue and in-degree counts update on a graph you can build yourself, including what happens when it hits a cycle.",
    keywords: [
      "topological sort visualizer",
      "topological sort",
      "kahn's algorithm",
      "dependency graph",
      "cycle detection",
    ],
    intro:
      "Kahn's algorithm, one node at a time. The ready queue and every node's in-degree update as it runs, and building a cycle shows exactly what happens when no order exists: the queue runs dry with nodes left over.",
    widget: "topological-sort",
    howTo: [
      "Press Play to run it, or Step to advance one node at a time.",
      "Switch between the two built-in graphs: one is a valid order, the other is a genuine cycle.",
      "Watch the in-degree panel. A node joins the ready queue the instant its count reaches zero.",
      "On the cycle example, notice which nodes never turn green: they sit inside the cycle, or depend on something that does.",
    ],
    related: [
      { label: "Topological sort, derived from scratch", href: "/tutorials/dsa/graph-topological-sort" },
      { label: "Graph algorithm visualizer", href: "/tools/graph-algorithm-visualizer" },
      { label: "All algorithms tutorials", href: "/tutorials/dsa" },
    ],
    faq: [
      {
        question: "What is a topological sort used for?",
        answer:
          "Ordering tasks so every dependency comes before whatever needs it: build systems compiling files, package managers installing dependencies, spreadsheet formulas recalculating in the right order, and course prerequisite planning are all topological sorts in disguise.",
      },
      {
        question: "Does a topological order always exist?",
        answer:
          "Only when the graph is a DAG, a directed graph with no cycle. A cycle means A must come before B, which must come before A, and no linear order can satisfy both. Kahn's algorithm detects this for free: if it emits fewer nodes than the graph contains, whatever is left over is stuck in or behind a cycle.",
      },
      {
        question: "Is the topological order unique?",
        answer:
          "Usually not. Whenever more than one node is ready at the same time, the algorithm has a real choice, and a different pick produces a different, equally valid order. A problem expecting one exact answer has to specify a tie-break, such as always taking the smallest available node.",
      },
      {
        question: "How is this different from a graph traversal like BFS?",
        answer:
          "BFS explores outward from one starting node and answers questions about distance. A topological sort has no single starting point: it processes the whole graph at once, tracking how many unmet dependencies each node has left, and a node only becomes eligible once every dependency ahead of it has already been placed.",
      },
    ],
  },
];

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

/** Where to link a tool. The single place that knows about `href`. */
export function toolHref(tool: ToolDefinition): string {
  return tool.href ?? `/tools/${tool.slug}`;
}

/** Tools whose page really is `/tools/<slug>`, for routing and the sitemap. */
export const PAGED_TOOLS = TOOLS.filter((tool) => !tool.href);

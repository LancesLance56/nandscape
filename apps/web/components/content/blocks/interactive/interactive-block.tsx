import { PollWidget } from "./poll-widget";
import { TruthTableExplorerWidget } from "./truth-table-explorer-widget";
import { ReorderWidget } from "./reorder-widget";
import { RevealWidget } from "./reveal-widget";
import { ChoiceQuizWidget } from "./choice-quiz-widget";
import { ComparisonSliderWidget } from "./comparison-slider-widget";
import { QuizWidget } from "./quiz-widget";
import { KMapExplorerWidget } from "./kmap/kmap-explorer-widget";
import { KMapPracticeWidget } from "./kmap/kmap-practice-widget";
import { MintermPickerWidget } from "./minterm-picker-widget";
import { GrayCodeExplorerWidget } from "./gray-code-explorer-widget";
import { NumberBaseExplorerWidget } from "./number-base-explorer-widget";
import { TwosComplementWidget } from "./twos-complement-widget";
import { StateMachineWidget } from "./state-machine-widget";
import { GraphExplorerWidget } from "./graph/graph-explorer-widget";
import { GraphTraversalWidget } from "./graph/graph-traversal-widget";
import { ShortestPathWidget } from "./graph/shortest-path-widget";
import { MstWidget } from "./graph/mst-widget";
import { TarjanSccWidget } from "./graph/tarjan-scc-widget";
import { BacktrackingTreeWidget } from "./backtracking/backtracking-tree-widget";
import { PermutationsWidget } from "./backtracking/permutations-widget";
import { NQueensWidget } from "./backtracking/n-queens-widget";
import { PalindromePartitionWidget } from "./backtracking/palindrome-partition-widget";
import { GraphColoringWidget } from "./backtracking/graph-coloring-widget";
import { SudokuWidget } from "./backtracking/sudoku-widget";
import { RecursionTreeWidget } from "./dp/recursion-tree-widget";
import { DpArrayWidget, DpTableWidget } from "./dp/dp-table-widgets";
import { SortingVisualizerWidget } from "./sorting/sorting-visualizer-widget";
import {
  PartitionExplorerWidget,
  MergeExplorerWidget,
  IntervalExplorerWidget,
  PairingExplorerWidget,
} from "./sorting/pattern-widgets";
import { FlowchartWidget, FlowchartMakerWidget } from "./flowchart/flowchart-widgets";
import { CircuitEmbedWidget } from "@/components/content/blocks/circuit/circuit-embed";
import type { InteractiveBlock } from "@/types/blog";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

interface WidgetProps {
  data: Record<string, unknown>;
}

const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  poll: PollWidget,
  "truth-table-explorer": TruthTableExplorerWidget,
  reorder: ReorderWidget,
  reveal: RevealWidget,
  "choice-quiz": ChoiceQuizWidget,
  "comparison-slider": ComparisonSliderWidget,
  quiz: QuizWidget,
  "kmap-explorer": KMapExplorerWidget,
  "kmap-practice": KMapPracticeWidget,
  "minterm-picker": MintermPickerWidget,
  "gray-code-explorer": GrayCodeExplorerWidget,
  "number-base-explorer": NumberBaseExplorerWidget,
  "twos-complement-explorer": TwosComplementWidget,
  "state-machine-explorer": StateMachineWidget,
  "graph-explorer": GraphExplorerWidget,
  "graph-traversal": GraphTraversalWidget,
  "shortest-path": ShortestPathWidget,
  "mst-explorer": MstWidget,
  "tarjan-scc": TarjanSccWidget,
  "backtracking-tree": BacktrackingTreeWidget,
  "permutations-explorer": PermutationsWidget,
  "n-queens": NQueensWidget,
  "palindrome-partition": PalindromePartitionWidget,
  "graph-coloring": GraphColoringWidget,
  "sudoku-solver": SudokuWidget,
  "recursion-tree": RecursionTreeWidget,
  "dp-array": DpArrayWidget,
  "dp-table": DpTableWidget,
  "sorting-visualizer": SortingVisualizerWidget,
  "partition-explorer": PartitionExplorerWidget,
  "merge-explorer": MergeExplorerWidget,
  "interval-explorer": IntervalExplorerWidget,
  "pairing-explorer": PairingExplorerWidget,
  flowchart: FlowchartWidget,
  "flowchart-maker": FlowchartMakerWidget,
  "circuit-embed": CircuitEmbedWidget,

  // Deprecated aliases
  "blackbox-explorer": TruthTableExplorerWidget,
  "boolean-reorder": ReorderWidget,
  "boolean-reveal": RevealWidget,
  "boolean-choice-quiz": ChoiceQuizWidget,
  "boolean-slider": ComparisonSliderWidget,
};

export function InteractiveBlockView({ block }: { block: InteractiveBlock & { className?: string } }) {
  const Widget = widgetRegistry[block.widget];
  if (!Widget) {
    return (
      <div className="my-2 rounded-xl border border-dashed border-border-strong p-4 text-sm text-slate">
        Unknown interactive widget: &ldquo;{block.widget}&rdquo;
      </div>
    );
  }
  return (
    <div className={cn("my-2", block.className)}>
      <Widget data={block.data} />
    </div>
  );
}

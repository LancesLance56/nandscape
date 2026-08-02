import { PollWidget } from "./poll-widget";
import { TruthTableExplorerWidget } from "./truth-table-explorer-widget";
import { ReorderWidget } from "./reorder-widget";
import { RevealWidget } from "./reveal-widget";
import { ChoiceQuizWidget } from "./choice-quiz-widget";
import { ComparisonSliderWidget } from "./comparison-slider-widget";
import { QuizWidget } from "./quiz-widget";
import { KMapExplorerWidget } from "./kmap-explorer-widget";
import { MintermPickerWidget } from "./minterm-picker-widget";
import { GrayCodeExplorerWidget } from "./gray-code-explorer-widget";
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
  "minterm-picker": MintermPickerWidget,
  "gray-code-explorer": GrayCodeExplorerWidget,
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

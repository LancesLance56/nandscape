import { PollWidget } from "./poll-widget";
import { BlackBoxExplorerWidget } from "./blackbox-explorer-widget";
import { KMapExplorerWidget } from "./kmap-explorer-widget";
import { CircuitEmbedWidget } from "@/components/content/blocks/circuit/circuit-embed";
import { OpsMeterWidget } from "./boolean-algebra/ops-meter-widget";
import { BooleanChoiceQuizWidget } from "./boolean-algebra/boolean-choice-quiz-widget";
import { BooleanRevealWidget } from "./boolean-algebra/boolean-reveal-widget";
import { BooleanReorderWidget } from "./boolean-algebra/boolean-reorder-widget";
import { BooleanSliderWidget } from "./boolean-algebra/boolean-slider-widget";
import type { InteractiveBlock } from "@/types/blog";
import type { ComponentType } from "react";

interface WidgetProps {
  data: Record<string, unknown>;
}

const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  poll: PollWidget,
  "blackbox-explorer": BlackBoxExplorerWidget,
  "kmap-explorer": KMapExplorerWidget,
  "circuit-embed": CircuitEmbedWidget,
  "ops-meter": OpsMeterWidget,
  "boolean-choice-quiz": BooleanChoiceQuizWidget,
  "boolean-reveal": BooleanRevealWidget,
  "boolean-reorder": BooleanReorderWidget,
  "boolean-slider": BooleanSliderWidget,
};

export function InteractiveBlockView({ block }: { block: InteractiveBlock }) {
  const Widget = widgetRegistry[block.widget];
  if (!Widget) {
    return (
      <div className="my-2 rounded-xl border border-dashed border-border-strong p-4 text-sm text-slate">
        Unknown interactive widget: &ldquo;{block.widget}&rdquo;
      </div>
    );
  }
  return (
    <div className="my-2">
      <Widget data={block.data} />
    </div>
  );
}

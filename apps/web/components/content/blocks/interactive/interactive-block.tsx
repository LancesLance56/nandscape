import { PollWidget } from "./poll-widget";
import { BlackBoxExplorerWidget } from "./blackbox-explorer-widget";
import { KMapExplorerWidget } from "./kmap-explorer-widget";
import { CircuitEmbedWidget } from "@/components/content/blocks/circuit/circuit-embed";
import type { InteractiveBlock } from "@/types/blog";
import type { ComponentType } from "react";

interface WidgetProps {
  data: Record<string, unknown>;
}

// "sequential-explorer" (ToggleSwitch + Led standing in for the circuit) has
// been retired in favor of "circuit-embed",  a real, read-only React Flow
// canvas showing the actual gates and wires, with its own zoom-in view.
// components/content/blocks/interactive/sequential-circuit-widget.tsx is no
// longer referenced anywhere and can be deleted.
const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  poll: PollWidget,
  "blackbox-explorer": BlackBoxExplorerWidget,
  "kmap-explorer": KMapExplorerWidget,
  "circuit-embed": CircuitEmbedWidget,
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

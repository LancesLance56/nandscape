import { PollWidget } from "./poll-widget";
import { BlackBoxExplorerWidget } from "./blackbox-explorer-widget";
import { KMapExplorerWidget } from "./kmap-explorer-widget";
import type { InteractiveBlock } from "@/types/blog";
import type { ComponentType } from "react";

interface WidgetProps {
  data: Record<string, unknown>;
}

const widgetRegistry: Record<string, ComponentType<WidgetProps>> = {
  poll: PollWidget,
  "blackbox-explorer": BlackBoxExplorerWidget,
  "kmap-explorer": KMapExplorerWidget,
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
"use client";

import {useEditorStore} from "@/store/editor-store";
import {useUiStore} from "@/store/ui-store";
import {inspectorPanelRegistry} from "./inspector-registry";
import { GatePalette } from "@/components/editor/sidebar/gate-palette";
import {EmptyInspectorPanel} from "./panels/empty-inspector";
import type {InspectorTab} from "@/types/editor";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "properties", label: "Properties" },
  { id: "palette", label: "Palette" },
];

export function Inspector() {
  const selection = useEditorStore((s) => s.selection);
  const nodes = useEditorStore((s) => s.nodes);
  const activeTab = useUiStore((s) => s.inspectorTab);
  const setTab = useUiStore((s) => s.setInspectorTab);

  const selectedNodes = nodes.filter((n) => selection.nodeIds.includes(n.id));
  const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const renderBody = () => {
    if (activeTab === "palette") return <GatePalette/>;

    if (selectedNodes.length > 1) {
      return <EmptyInspectorPanel message={`${selectedNodes.length} items selected. Multi-edit isn't supported yet.`}/>;
    }

    if (!singleNode) return <EmptyInspectorPanel/>;

    const Panel = inspectorPanelRegistry[singleNode.data.kind];
    if (!Panel) {
      return <EmptyInspectorPanel message={`"${singleNode.data.kind}" doesn't have an inspector panel yet.`}/>;
    }

    return <Panel node={singleNode}/>;
  };

  return (
    <div className="flex h-full flex-col bg-surface-card">
      <div className="flex gap-1 rounded-t-2xl bg-surface-2 p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-surface-card text-ink shadow-sm"
                : "text-ink-soft hover:bg-surface-card/60 hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">{renderBody()}</div>
    </div>
  );
}
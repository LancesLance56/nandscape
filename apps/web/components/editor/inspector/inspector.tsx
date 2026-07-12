"use client";

import {useEditorStore} from "@/store/editor-store";
import {useUiStore} from "@/store/ui-store";
import {inspectorPanelRegistry} from "./inspector-registry";
import {EmptyInspectorPanel} from "./panels/empty-inspector";
import type {InspectorTab} from "@/types/editor";

const TABS: { id: InspectorTab; label: string }[] = [
  {id: "properties", label: "Properties"},
  {id: "truth-table", label: "Truth table"},
  {id: "notes", label: "Notes"},
];

export function Inspector() {
  const selection = useEditorStore((s) => s.selection);
  const nodes = useEditorStore((s) => s.nodes);
  const activeTab = useUiStore((s) => s.inspectorTab);
  const setTab = useUiStore((s) => s.setInspectorTab);

  const selectedNodes = nodes.filter((n) => selection.nodeIds.includes(n.id));
  const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const renderBody = () => {
    if (activeTab !== "properties") {
      return (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate">
          {activeTab === "truth-table"
            ? "Truth table view — generated from simulation once compile-circuit.ts lands."
            : "Notes — free-form annotations for this circuit."}
        </div>
      );
    }

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
      <div className="flex border-b border-border px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`relative px-3 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-copper"/>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">{renderBody()}</div>
    </div>
  );
}

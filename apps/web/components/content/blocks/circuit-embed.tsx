"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SignalState } from "@nandscape/engine";
import { evaluateLiveCircuit } from "@/lib/editor/live-simulate";
import { useSandboxProgressStore } from "@/store/sandbox-progress-store";
import { PreviewGateNode } from "./preview-gate-node";
import { PreviewIoNode } from "./preview-io-node";
import { PreviewWireEdge } from "./preview-wire-edge";
import { cn } from "@/lib/cn";
import type { EditorNode, EditorEdge, IoNodeData } from "@/types/editor";

const nodeTypes: NodeTypes = {
  gate: PreviewGateNode,
  "io-input": PreviewIoNode,
  "io-output": PreviewIoNode,
};

const edgeTypes: EdgeTypes = {
  wire: PreviewWireEdge,
};

export interface CircuitEmbedData {
  title?: string;
  height?: number;
  className?: string;
  nodes: EditorNode[];
  edges: EditorEdge[];
  [key: string]: unknown | undefined;
}

function isCircuitEmbedData(data: Record<string, unknown>): data is CircuitEmbedData {
  return Array.isArray(data.nodes) && Array.isArray(data.edges);
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M6 2H2v4M10 14h4v-4M2 2l4.5 4.5M14 14L9.5 9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CircuitStage({
  nodes: initialNodes,
  edges,
  allowScrollZoom = false,
}: {
  nodes: EditorNode[];
  edges: EditorEdge[];
  allowScrollZoom?: boolean;
}) {
  const [nodes, setNodes] = useState<EditorNode[]>(initialNodes);
  const [edgeSignals, setEdgeSignals] = useState<Record<string, SignalState>>({});

  // Reset to the tutorial's starting values whenever a fresh set of nodes
  // is handed in (e.g. the modal opening with its own CircuitStage instance).
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setEdgeSignals((prev) => evaluateLiveCircuit(nodes, edges, prev));
  }, [nodes, edges]);

  const toggleInput = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || n.data.kind !== "input") return n;
        const data = n.data as IoNodeData;
        const next = data.value === SignalState.HIGH ? SignalState.LOW : SignalState.HIGH;
        return { ...n, data: { ...n.data, value: next } };
      }),
    );
  }, []);

  const incomingEdgeByTarget = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of edges) map.set(e.target, e.id);
    return map;
  }, [edges]);

  const renderNodes = useMemo(
    () =>
      nodes.map((n) => {
        if (n.data.kind === "input") {
          return { ...n, data: { ...n.data, onToggle: () => toggleInput(n.id) } };
        }
        if (n.data.kind === "output") {
          const edgeId = incomingEdgeByTarget.get(n.id);
          return { ...n, data: { ...n.data, value: edgeId ? edgeSignals[edgeId] : undefined } };
        }
        return n;
      }),
    [nodes, edgeSignals, incomingEdgeByTarget, toggleInput],
  );

  const renderEdges = useMemo(
    () => edges.map((e) => ({ ...e, data: { ...e.data, signal: edgeSignals[e.id] } })),
    [edges, edgeSignals],
  );

  return (
    <ReactFlow
      nodes={renderNodes}
      edges={renderEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnScroll={false}
      zoomOnScroll={allowScrollZoom}
      zoomOnPinch
      panOnDrag
      zoomOnDoubleClick={false}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={22}
        size={1.2}
        className="opacity-60"
        color="var(--border-strong)"
      />
    </ReactFlow>
  );
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function CircuitEmbedWidget({ data }: { data: Record<string, unknown> }) {
  const router = useRouter();
  const mounted = useMounted();
  const [expanded, setExpanded] = useState(false);
  const saveSandbox = useSandboxProgressStore((s) => s.save);

  if (!isCircuitEmbedData(data)) {
    return (
      <div className="my-2 rounded-xl border border-dashed border-border-strong p-4 text-sm text-slate">
        Circuit embed is missing node/edge data.
      </div>
    );
  }

  const title = data.title ?? "Circuit";
  const height = data.height ?? 280;

  const handleOpenSandbox = () => {
    saveSandbox(data.nodes, data.edges);
    router.push("/nandbox");
  };

  return (
    <div
      className={cn(
        "not-prose my-8 overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
        data.className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-coral" />
        <span className="h-2.5 w-2.5 rounded-full bg-copper" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">{title}</span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border-strong px-2 py-1 font-mono text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-card hover:text-ink"
        >
          <ExpandIcon />
          Zoom in
        </button>
      </div>

      <div style={{ height }} className="relative overflow-hidden">
        <ReactFlowProvider>
          <CircuitStage nodes={data.nodes} edges={data.edges} />
        </ReactFlowProvider>
      </div>

      {mounted &&
        expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-999 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          >
            <div
              className="flex h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
                  {title}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSandbox}
                    title="Loads this exact circuit into the sandbox editor so you can rewire, extend, or save it"
                    className="rounded-md bg-copper px-2.5 py-1 font-mono text-[10px] font-semibold text-white transition-colors hover:bg-copper-dark"
                  >
                    Open in sandbox editor →
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    aria-label="Close"
                    className="rounded-md border border-border-strong px-2 py-1 font-mono text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <ReactFlowProvider>
                  <CircuitStage nodes={data.nodes} edges={data.edges} allowScrollZoom />
                </ReactFlowProvider>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

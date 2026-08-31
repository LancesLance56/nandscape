"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  CircleDot,
  Diamond,
  Flag,
  LayoutGrid,
  Maximize2,
  Play,
  Redo2,
  Square,
  SquareDashed,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import {
  addNode,
  clearPositions,
  connect,
  newId,
  placedCount,
  removeElements,
} from "@/lib/flowchart/edit";
import { validateFlowchart, type FlowNodeType } from "@/lib/flowchart/types";
import { FlowchartCanvas } from "@/components/content/blocks/interactive/flowchart/flowchart-canvas";
import {
  DownloadButton,
  FlowchartLegend,
  deriveLegend,
} from "@/components/content/blocks/interactive/flowchart/flowchart-chrome";
import { Btn, IconBtn } from "./controls";
import { Inspector } from "./inspector";
import type { FlowchartDoc } from "./use-flowchart-doc";

/* -------------------------------------------------------------------------
 * Shape palette
 * ---------------------------------------------------------------------- */

const SHAPES: { id: FlowNodeType; label: string; hint: string; Icon: typeof Square }[] = [
  { id: "process", label: "Process", hint: "A step that does something", Icon: Square },
  { id: "decision", label: "Decision", hint: "A yes/no question", Icon: Diamond },
  { id: "io", label: "Input / output", hint: "Read or write something", Icon: CircleDot },
  { id: "start", label: "Start", hint: "Where the procedure begins", Icon: Play },
  { id: "end", label: "End", hint: "Where it finishes", Icon: Flag },
  { id: "group", label: "Group", hint: "A labelled container for several steps", Icon: SquareDashed },
];

/* -------------------------------------------------------------------------
 * Workbench
 * ---------------------------------------------------------------------- */

export interface FlowchartWorkbenchProps {
  doc: FlowchartDoc;
  /**
   * `studio` fills the window: palette rail, canvas, inspector column.
   * `embedded` is the version that goes in an article or an admin form, where
   * the chart is one control among many and the page owns the scroll.
   */
  variant?: "studio" | "embedded";
  /** Canvas height for the embedded variant. Ignored by the studio. */
  height?: number;
  /** Extra controls for the studio's top bar. */
  toolbarExtra?: React.ReactNode;
}

/**
 * The flowchart editor.
 *
 * Three things drive the design, all of them reactions to the previous one:
 *
 *  - Boxes are placed by dragging them, and that has to actually work. See
 *    `onNodeMove` in FlowchartCanvas for why it did not.
 *  - Arrows are drawn by dragging between boxes, not chosen from two
 *    dropdowns listing every box in the chart by name.
 *  - There is one properties panel, and it shows whatever is selected,
 *    rather than five tabs to hunt through.
 *
 * The keyboard covers the rest: Enter renames, Delete removes, Ctrl+Z undoes,
 * Escape steps back out.
 */
export function FlowchartWorkbench({
  doc,
  variant = "embedded",
  height = 460,
  toolbarExtra,
}: FlowchartWorkbenchProps) {
  const { spec, edit } = doc;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  // Bumped to ask the canvas to refit. It never refits on its own here: the
  // layout's bounding box moves on every edit, and following that would drag
  // the viewport around under whoever is working.
  const [fitToken, setFitToken] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const studio = variant === "studio";

  const issues = useMemo(() => validateFlowchart(spec), [spec]);
  const legend = useMemo(() => deriveLegend(spec), [spec]);
  const pinned = placedCount(spec);

  const interactive = useMemo(
    () => ({
      notes: false,
      walkthrough: false,
      focus: false,
      draggable: true,
      zoom: true,
      minimap: studio,
      fullscreen: false,
      download: false,
      legend: false,
    }),
    [studio],
  );

  /* --- actions -------------------------------------------------------- */

  const add = useCallback(
    (type: FlowNodeType) => {
      const id = newId();
      edit((d) => {
        addNode(d, type, selectedNode, id);
      });
      setSelectedEdge(null);
      setSelectedNode(id);
      // Straight into rename. A new box always needs a label, and the whole
      // point of adding one is to say what it is.
      setEditingNode(id);
    },
    [edit, selectedNode],
  );

  const deleteNodes = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      edit((d) => removeElements(d, nodeIds, edgeIds));
      if (selectedNode && nodeIds.includes(selectedNode)) setSelectedNode(null);
      if (selectedEdge && edgeIds.includes(selectedEdge)) setSelectedEdge(null);
      setEditingNode(null);
    },
    [edit, selectedNode, selectedEdge],
  );

  const autoLayout = useCallback(() => {
    edit(clearPositions);
    setFitToken((t) => t + 1);
  }, [edit]);

  const fit = useCallback(() => setFitToken((t) => t + 1), []);

  /* --- keyboard ------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Never steal a key from a field. React Flow already guards its own
      // delete handling this way; undo has to do the same or Ctrl+Z inside
      // the note box would rewind the chart instead of the text.
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      // The studio is the whole window, so it answers to the keyboard
      // unconditionally. An embedded one must not: a tutorial page can carry
      // two of these, and an undo meant for the chart under the cursor would
      // otherwise rewind every chart on the page at once.
      if (!studio && !rootRef.current?.contains(document.activeElement)) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) doc.redo();
        else doc.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        doc.redo();
        return;
      }
      if (e.key === "Escape") {
        setEditingNode(null);
        setSelectedNode(null);
        setSelectedEdge(null);
        return;
      }
      if (e.key === "Enter" && selectedNode && !editingNode) {
        e.preventDefault();
        setEditingNode(selectedNode);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, selectedNode, editingNode, studio]);

  /* --- pieces --------------------------------------------------------- */

  const palette = (
    <div className={cn("flex gap-1.5", studio ? "flex-wrap lg:flex-col" : "flex-wrap")}>
      {SHAPES.map(({ id, label, hint, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => add(id)}
          title={`${label} - ${hint}`}
          className={cn(
            "flex items-center gap-2 rounded-md border border-border-strong text-[11px] font-semibold text-ink-soft transition-colors hover:border-copper hover:bg-copper-bg hover:text-copper-dark",
            studio ? "px-2.5 py-2" : "px-2 py-1.5",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {/* The rail is icons only at the width where it is a rail but the
              window is not wide enough to spare 12rem for it; below that it
              is a wrapped row across the top and the labels fit again. */}
          <span className={cn(studio && "inline lg:hidden xl:inline")}>{label}</span>
        </button>
      ))}
    </div>
  );

  const canvas = (
    <div ref={canvasRef} className={cn(studio ? "h-full w-full" : "")}>
      <FlowchartCanvas
        spec={spec}
        interactive={interactive}
        height={studio ? undefined : height}
        fill={studio}
        showGrid
        freeMove
        autoFit={false}
        fitToken={fitToken}
        selectedId={selectedNode}
        onSelectNode={(id) => {
          setSelectedNode(id);
          if (id !== editingNode) setEditingNode(null);
        }}
        selectedEdgeId={selectedEdge}
        onSelectEdge={setSelectedEdge}
        onNodeMove={(id, position) =>
          // One undo step per drag, not one per animation frame.
          edit((d) => {
            const n = d.nodes.find((x) => x.id === id);
            if (n) n.position = position;
          }, `drag:${id}`)
        }
        onConnectNodes={(from, to) => edit((d) => void connect(d, from, to))}
        onDelete={deleteNodes}
        onNodeDoubleClick={(id) => {
          setSelectedNode(id);
          setSelectedEdge(null);
          setEditingNode(id);
        }}
        editingNodeId={editingNode}
        onEditingText={(id, text) =>
          edit((d) => {
            const n = d.nodes.find((x) => x.id === id);
            if (n) n.text = text;
          }, `text:${id}`)
        }
        onEditingDone={() => setEditingNode(null)}
        overlayBottom={
          studio ? undefined : (
            <div className="rounded-md bg-surface-card/85 px-2 py-1 backdrop-blur-sm">
              <FlowchartLegend items={legend} />
            </div>
          )
        }
      />
    </div>
  );

  const inspector = (
    <Inspector
      spec={spec}
      edit={edit}
      selectedNodeId={selectedNode}
      selectedEdgeId={selectedEdge}
      onDeleteNode={(id) => deleteNodes([id], [])}
      onDeleteEdge={(key) => deleteNodes([], [key])}
    />
  );

  const historyControls = (
    <>
      <IconBtn onClick={doc.undo} label="Undo (Ctrl+Z)" disabled={!doc.canUndo}>
        <Undo2 className="h-4 w-4" />
      </IconBtn>
      <IconBtn onClick={doc.redo} label="Redo (Ctrl+Shift+Z)" disabled={!doc.canRedo}>
        <Redo2 className="h-4 w-4" />
      </IconBtn>
    </>
  );

  const viewControls = (
    <>
      <Btn onClick={autoLayout} disabled={pinned === 0} title="Discard every hand-placed box">
        <LayoutGrid className="h-3.5 w-3.5" />
        Auto-layout{pinned > 0 ? ` (${pinned})` : ""}
      </Btn>
      <Btn onClick={fit} title="Bring the whole chart back into view">
        <Maximize2 className="h-3.5 w-3.5" />
        Fit
      </Btn>
      <DownloadButton container={canvasRef} filename={spec.title ?? "flowchart"} />
    </>
  );

  const problems =
    issues.length > 0 ? (
      <ul className="flex flex-col gap-1">
        {issues.map((issue) => (
          <li key={issue} className="text-[11px] leading-snug text-copper-dark">
            {issue}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[11px] text-slate">No structural problems.</p>
    );

  /* --- layouts -------------------------------------------------------- */

  if (studio) {
    return (
      <ReactFlowProvider>
        {/* Three columns on a desktop; stacked on anything narrower, because a
            48rem-wide phone cannot spare a rail and a panel either side of a
            canvas and still leave a canvas. */}
        <div ref={rootRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface-card p-2.5 lg:w-auto lg:border-b-0 lg:border-r xl:w-48">
            <div>
              <h2 className="mb-2 hidden px-1 text-[10px] font-bold uppercase tracking-wider text-slate xl:block">
                Add a box
              </h2>
              {palette}
            </div>
            <p className="mt-auto hidden px-1 text-[10px] leading-relaxed text-slate xl:block">
              Adding a box while another is selected wires the two together, so a chain builds itself.
              Drag between two boxes to connect them by hand.
            </p>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-card px-3 py-2">
              {historyControls}
              <span className="mx-1 h-5 w-px bg-border" />
              {viewControls}
              {toolbarExtra}
            </div>

            {/* min-h-0 so this shrinks rather than pushing the strips below it
                off the bottom of the window. */}
            <div className="relative min-h-64 flex-1">{canvas}</div>

            <div className="flex items-start gap-4 border-t border-border bg-surface-card px-3 py-2">
              <FlowchartLegend items={legend} />
              {issues.length > 0 && (
                <details className="ml-auto max-w-md text-right">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold text-copper-dark marker:hidden">
                    {issues.length} thing{issues.length === 1 ? "" : "s"} to look at
                  </summary>
                  <div className="mt-1.5 text-left">{problems}</div>
                </details>
              )}
            </div>
          </div>

          <aside className="max-h-72 shrink-0 overflow-y-auto border-t border-border bg-surface-card lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            {inspector}
          </aside>
        </div>
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <div ref={rootRef} className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {canvas}
          <div className="flex flex-wrap items-center gap-2">
            {historyControls}
            {viewControls}
          </div>
          {issues.length > 0 && (
            <div className="rounded-lg border border-copper/40 bg-copper-bg/30 p-3">{problems}</div>
          )}
        </div>

        <div className="w-full shrink-0 overflow-hidden rounded-lg border border-border bg-surface-card xl:w-[21rem]">
          <div className="border-b border-border px-3.5 py-2.5">{palette}</div>
          {inspector}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

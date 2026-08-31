"use client";

import { useEffect, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/cn";
import type { HandleSlot } from "@/lib/flowchart/layout";
import type { FlowAccent, FlowNode, FlowSide } from "@/lib/flowchart/types";

/* -------------------------------------------------------------------------
 * Palette
 * ---------------------------------------------------------------------- */

/**
 * Every accent resolves to three tokens: the outline, the fill behind the
 * text, and the text itself. Tinted fill plus a coloured outline rather than
 * a solid block, because a solid block forces white text and white text on a
 * light theme's copper is unreadable at 11px.
 */
export const ACCENT: Record<FlowAccent, { line: string; fill: string; text: string }> = {
  neutral: { line: "var(--border-strong)", fill: "var(--surface-card)", text: "var(--ink)" },
  copper: { line: "var(--copper)", fill: "var(--copper-bg)", text: "var(--copper-dark)" },
  green: { line: "var(--signal-green)", fill: "var(--signal-green-bg)", text: "var(--signal-green-strong)" },
  coral: { line: "var(--signal-coral)", fill: "var(--signal-coral-bg)", text: "var(--signal-coral-strong)" },
  blue: { line: "var(--diagram-blue)", fill: "var(--diagram-blue-bg)", text: "var(--diagram-blue)" },
  violet: { line: "var(--diagram-violet)", fill: "var(--diagram-violet-bg)", text: "var(--diagram-violet)" },
  amber: { line: "var(--diagram-amber)", fill: "var(--diagram-amber-bg)", text: "var(--diagram-amber)" },
};

export const ACCENT_NAMES = Object.keys(ACCENT) as FlowAccent[];

/* -------------------------------------------------------------------------
 * Node data
 * ---------------------------------------------------------------------- */

export interface FlowNodeData extends Record<string, unknown> {
  spec: FlowNode;
  accent: FlowAccent;
  mono: boolean;
  /** The layout's attachment points for this node's own edges. */
  slots: HandleSlot[];
  /** Faded because something else is focused or being stepped through. */
  dimmed: boolean;
  /** The current walkthrough step. */
  active: boolean;
  /** Already passed on this walkthrough. */
  visited: boolean;
  clickable: boolean;
  /** Draw the connect ports and make the whole box a drop target. */
  connectable?: boolean;
  /** This box's label is being renamed in place. */
  editing?: boolean;
  onTextChange?: (id: string, text: string) => void;
  onTextDone?: () => void;
}

export type FlowchartNode = Node<FlowNodeData>;

const SIDES: { side: FlowSide; position: Position }[] = [
  { side: "top", position: Position.Top },
  { side: "right", position: Position.Right },
  { side: "bottom", position: Position.Bottom },
  { side: "left", position: Position.Left },
];

const POSITION_FOR: Record<FlowSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/**
 * Four source and four target handles per node, all invisible. The layout
 * picks which pair an edge uses, so every side has to exist even though a
 * given chart uses two of them.
 */
function Handles({ slots, connectable = false }: { slots: HandleSlot[]; connectable?: boolean }) {
  return (
    <>
      {SIDES.map(({ side, position }) => (
        <Handle
          key={`s-${side}`}
          id={`s-${side}`}
          type="source"
          position={position}
          isConnectable={false}
          className="!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
        />
      ))}
      {SIDES.map(({ side, position }) => (
        <Handle
          key={`t-${side}`}
          id={`t-${side}`}
          type="target"
          position={position}
          isConnectable={false}
          className="!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
        />
      ))}

      {/* The editor's connect ports: four grab dots, hidden until the box is
          hovered or selected so an idle chart stays a chart. Separate ids
          from the invisible anchor handles above, which the layout owns. */}
      {connectable &&
        SIDES.map(({ side, position }) => (
          <Handle
            key={`c-${side}`}
            id={`c-${side}`}
            type="source"
            position={position}
            isConnectable
            className="fc-port"
          />
        ))}

      {/* One drop target covering the whole box, because aiming at a 9px dot
          to *finish* an arrow is a different and much harder task than
          grabbing one to start it. React Flow resolves a drop with
          elementFromPoint, so this has to be a real handle sitting on top -
          which is why it only takes pointer events while a connection is
          actually in flight (see .fc-connecting in globals.css). */}
      {connectable && (
        <Handle
          id="c-in"
          type="target"
          position={Position.Left}
          isConnectable
          className="fc-drop"
          style={{
            left: 0,
            top: 0,
            right: "auto",
            bottom: "auto",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            transform: "none",
            border: 0,
            borderRadius: 10,
            background: "transparent",
          }}
        />
      )}

      {/* The per-edge attachment points, as real elements at their real
          coordinates. React Flow measures a node's handles out of the DOM
          once it mounts and *replaces* whatever the node declared with what
          it found there. Declaring these without rendering them meant every
          arrow using one vanished the moment that measurement ran, and came
          back only when some interaction rebuilt the node list from the
          declaration again - which is why arrows appeared to need a click. */}
      {slots.map((slot) => (
        <Handle
          key={slot.id}
          id={slot.id}
          type={slot.type}
          position={POSITION_FOR[slot.side]}
          isConnectable={false}
          className="!min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0"
          style={{
            left: slot.x,
            top: slot.y,
            right: "auto",
            bottom: "auto",
            width: 1,
            height: 1,
            transform: "none",
          }}
        />
      ))}
    </>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="absolute -left-2 -top-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
      style={{ background: color, color: "var(--surface-card)" }}
    >
      {text}
    </span>
  );
}

function NoteDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full"
      style={{ background: color }}
    />
  );
}

function Label({ text, mono, color }: { text: string; mono: boolean; color: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none relative z-[2] whitespace-pre text-center text-[11px] font-semibold leading-[16px]",
        mono && "font-mono tracking-tight",
      )}
      style={{ color }}
    >
      {text}
    </span>
  );
}

/**
 * Rename in place, on double-click.
 *
 * The alternative - select the box, cross the canvas, find the text field in
 * a panel - is the single most repeated action in building a chart, and
 * making it a round trip is most of why editing one felt like paperwork.
 *
 * `nodrag`/`nowheel` are load-bearing: without them React Flow treats a
 * text selection drag as a node drag and a scroll as a canvas zoom.
 */
function LabelEditor({
  id,
  text,
  mono,
  color,
  onChange,
  onDone,
}: {
  id: string;
  text: string;
  mono: boolean;
  color: string;
  onChange?: (id: string, text: string) => void;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => onChange?.(id, e.target.value)}
      onBlur={() => onDone?.()}
      onKeyDown={(e) => {
        e.stopPropagation();
        // Enter commits, shift+Enter is a line break - a flowchart box is
        // usually one line, so the common case should not need a modifier.
        if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
          e.preventDefault();
          onDone?.();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      rows={Math.max(1, text.split("\n").length)}
      spellCheck={false}
      className={cn(
        "nodrag nowheel relative z-[3] w-[86%] resize-none rounded border border-copper bg-surface-card px-1 py-0.5 text-center text-[11px] font-semibold leading-[16px] outline-none",
        mono && "font-mono tracking-tight",
      )}
      style={{ color }}
    />
  );
}

/** Shared wrapper: sizing, focus ring, dim/active state, handles, badge. */
function Shell({
  data,
  selected,
  children,
  className,
  style,
}: {
  data: FlowNodeData;
  selected: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const accent = ACCENT[data.accent];
  return (
    <div
      className={cn(
        "group/node relative flex h-full w-full items-center justify-center transition-[opacity,filter] duration-200",
        data.clickable && "cursor-pointer",
        data.dimmed && "opacity-25",
        className,
      )}
      style={style}
      title={data.spec.note && !data.editing ? data.spec.note : undefined}
    >
      <Handles slots={data.slots} connectable={data.connectable} />
      {data.spec.badge && <Badge text={data.spec.badge} color={accent.line} />}
      {children}
      {(selected || data.active) && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[5px] rounded-[10px] border-2"
          style={{ borderColor: data.active ? "var(--copper)" : "var(--ink)" }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Shapes
 * ---------------------------------------------------------------------- */

/** Start and end. A pill, which is the flowchart convention for a terminal. */
export function TerminalNode({ data, selected }: NodeProps<FlowchartNode>) {
  const accent = ACCENT[data.accent];
  return (
    <Shell data={data} selected={Boolean(selected)}>
      <span
        className="absolute inset-0 rounded-full border-2"
        style={{ background: accent.fill, borderColor: accent.line }}
      />
      {data.spec.note && <NoteDot color={accent.line} />}
      {data.editing ? (
        <LabelEditor
          id={data.spec.id}
          text={data.spec.text}
          mono={data.mono}
          color={accent.text}
          onChange={data.onTextChange}
          onDone={data.onTextDone}
        />
      ) : (
        <Label text={data.spec.text} mono={data.mono} color={accent.text} />
      )}
    </Shell>
  );
}

/** The default box. */
export function ProcessNode({ data, selected }: NodeProps<FlowchartNode>) {
  const accent = ACCENT[data.accent];
  return (
    <Shell data={data} selected={Boolean(selected)}>
      <span
        className="absolute inset-0 rounded-lg border-2"
        style={{
          background: accent.fill,
          borderColor: accent.line,
          opacity: data.visited ? 1 : undefined,
        }}
      />
      {data.spec.note && <NoteDot color={accent.line} />}
      {data.editing ? (
        <LabelEditor
          id={data.spec.id}
          text={data.spec.text}
          mono={data.mono}
          color={accent.text}
          onChange={data.onTextChange}
          onDone={data.onTextDone}
        />
      ) : (
        <Label text={data.spec.text} mono={data.mono} color={accent.text} />
      )}
    </Shell>
  );
}

/**
 * A diamond, drawn as SVG rather than a CSS clip-path: clipping also clips
 * the border, which leaves the outline half its stated width on the diagonals.
 */
export function DecisionNode({ data, selected }: NodeProps<FlowchartNode>) {
  const accent = ACCENT[data.accent];
  return (
    <Shell data={data} selected={Boolean(selected)}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <polygon
          points="50,2 98,50 50,98 2,50"
          fill={accent.fill}
          stroke={accent.line}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      {data.spec.note && <NoteDot color={accent.line} />}
      {data.editing ? (
        <LabelEditor
          id={data.spec.id}
          text={data.spec.text}
          mono={data.mono}
          color={accent.text}
          onChange={data.onTextChange}
          onDone={data.onTextDone}
        />
      ) : (
        <Label text={data.spec.text} mono={data.mono} color={accent.text} />
      )}
    </Shell>
  );
}

/** Input/output, drawn as the conventional skewed parallelogram. */
export function IoNode({ data, selected }: NodeProps<FlowchartNode>) {
  const accent = ACCENT[data.accent];
  return (
    <Shell data={data} selected={Boolean(selected)}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <polygon
          points="14,2 98,2 86,98 2,98"
          fill={accent.fill}
          stroke={accent.line}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      {data.spec.note && <NoteDot color={accent.line} />}
      {data.editing ? (
        <LabelEditor
          id={data.spec.id}
          text={data.spec.text}
          mono={data.mono}
          color={accent.text}
          onChange={data.onTextChange}
          onDone={data.onTextDone}
        />
      ) : (
        <Label text={data.spec.text} mono={data.mono} color={accent.text} />
      )}
    </Shell>
  );
}

/**
 * A labelled container. Children are real React Flow nodes positioned inside
 * it, so this component only draws the border and the header strip; it must
 * not capture pointer events or the boxes inside it stop being clickable.
 */
export function GroupNode({ data, selected }: NodeProps<FlowchartNode>) {
  const accent = ACCENT[data.accent];
  return (
    <div
      className={cn(
        "relative h-full w-full transition-opacity duration-200",
        data.dimmed && "opacity-25",
      )}
    >
      <Handles slots={data.slots} connectable={data.connectable} />
      {data.spec.badge && <Badge text={data.spec.badge} color={accent.line} />}
      <span
        className="absolute inset-0 rounded-xl border-2"
        style={{
          background: accent.fill,
          borderColor: accent.line,
          opacity: data.accent === "neutral" ? 0.45 : 0.28,
        }}
      />
      <span
        className="absolute inset-0 rounded-xl border-2"
        style={{ borderColor: accent.line, background: "transparent" }}
      />
      {data.spec.text.trim() && (
        <span
          className="absolute left-3 top-2 z-[2] text-[11px] font-bold tracking-wide"
          style={{ color: accent.text }}
        >
          {data.spec.text}
        </span>
      )}
      {(selected || data.active) && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[5px] rounded-2xl border-2"
          style={{ borderColor: data.active ? "var(--copper)" : "var(--ink)" }}
        />
      )}
    </div>
  );
}

export const FLOW_NODE_TYPES = {
  terminal: TerminalNode,
  process: ProcessNode,
  decision: DecisionNode,
  io: IoNode,
  group: GroupNode,
};

/** Maps a spec node type onto the React Flow component that draws it. */
export function rendererFor(type: FlowNode["type"]): keyof typeof FLOW_NODE_TYPES {
  if (type === "start" || type === "end") return "terminal";
  if (type === "decision") return "decision";
  if (type === "io") return "io";
  if (type === "group") return "group";
  return "process";
}

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { NodeHandle, Position } from "./node-handle";
import { useHandleClick } from "@/hooks/use-handle-click";
import { usePreferencesStore } from "@/store/preferences-store";
import type { ClockNodeData, EditorNode } from "@/types/editor";

const LABEL_HEIGHT = 13;
const LABEL_GAP = 3;

/** A free-running square-wave source: one output pin, no inputs. Same
 *  square-box shape as io-node.tsx's Input/Output (a single pin needs no
 *  more height than `minHeight`), with a static square-wave glyph instead
 *  of a toggle/readout,  the actual HIGH/LOW state is already visible on
 *  the wire it drives (see wire-edge.tsx), so the node itself doesn't need
 *  to duplicate that. Half-period shows in the outside caption, same
 *  "label sits below the box" pattern every other node type uses. */
function ClockNodeImpl({ id, data, selected }: NodeProps<EditorNode>) {
  const clockData = data as ClockNodeData;
  const { onHandleClick, onHandleMouseEnter, onHandleMouseLeave } = useHandleClick();

  const { margin, minHeight } = usePreferencesStore(
    useShallow((s) => ({
      margin: s.gateNodeTopMargin,
      minHeight: s.gateNodeMinHeight,
    })),
  );
  const boxHeight = Math.max(minHeight, margin * 2);
  const nodeHeight = boxHeight + LABEL_GAP + LABEL_HEIGHT;
  const halfPeriod = clockData.halfPeriod ?? 5;

  return (
    <div style={{ height: `${nodeHeight}px`, width: `${boxHeight}px` }} className="relative">
      <NodeHandle
        id="out-0"
        type="source"
        position={Position.Right}
        style={{ top: `${boxHeight / 2}px` }}
        onClick={(event) => onHandleClick(id, "out-0", "source", event)}
        onMouseEnter={(event) => onHandleMouseEnter(id, "source", event)}
        onMouseLeave={onHandleMouseLeave}
      />

      <div
        style={{ top: 0, height: `${boxHeight}px`, width: `${boxHeight}px` }}
        className={`absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-lg border bg-surface-card shadow-sm transition-[box-shadow,border-color] duration-150 ${
          selected ? "border-copper ring-2 ring-copper/30" : "border-copper/40"
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-copper" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2 14h4V6h4v8h4V6h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <span
        style={{ top: `${boxHeight + LABEL_GAP}px`, height: `${LABEL_HEIGHT}px`, width: `${boxHeight}px` }}
        className="absolute left-1/2 -translate-x-1/2 truncate text-center text-[9px] font-semibold text-slate"
        title={`Half-period ${halfPeriod}`}
      >
        ±{halfPeriod}
      </span>
    </div>
  );
}

export const ClockNode = memo(ClockNodeImpl);

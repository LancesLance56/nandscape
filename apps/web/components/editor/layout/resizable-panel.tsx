"use client";

import type React from "react";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

type Edge = "left" | "right" | "top";

interface ResizablePanelProps {
  edge: Edge;
  size: number;
  onResize: (size: number) => void;
  min: number;
  max: number;
  className?: string;
  children: ReactNode;
}

export function ResizablePanel({
  edge,
  size,
  onResize,
  min,
  max,
  className = "",
  children,
}: ResizablePanelProps) {
  const dragState = useRef<{
    startPos: number;
    startSize: number;
  } | null>(null);

  const pointerMoveRef = useRef<(event: PointerEvent) => void>(() => {});

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      const pos = edge === "top" ? event.clientY : event.clientX;
      const delta = pos - drag.startPos;

      const signedDelta =
        edge === "top" || edge === "left"
          ? -delta
          : delta;

      const next = Math.max(
        min,
        Math.min(max, drag.startSize + signedDelta),
      );

      onResize(next);
    },
    [edge, max, min, onResize],
  );

  useEffect(() => {
    pointerMoveRef.current = handlePointerMove;
  }, [handlePointerMove]);

  const cleanup = useCallback(() => {
    dragState.current = null;

    window.removeEventListener("pointermove", pointerMoveRef.current);
    window.removeEventListener("pointerup", cleanup);

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      event.currentTarget.setPointerCapture(event.pointerId);

      dragState.current = {
        startPos: edge === "top" ? event.clientY : event.clientX,
        startSize: size,
      };

      window.addEventListener("pointermove", pointerMoveRef.current);
      window.addEventListener("pointerup", cleanup);

      document.body.style.cursor =
        edge === "top" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    },
    [cleanup, edge, size],
  );

  const isHorizontal = edge !== "top";

  const style = isHorizontal
    ? { width: size }
    : { height: size };

  const handlePosition =
    edge === "left"
      ? "left-0 top-0 -translate-x-1/2 h-full w-3 cursor-col-resize"
      : edge === "right"
        ? "right-0 top-0 translate-x-1/2 h-full w-3 cursor-col-resize"
        : "top-0 w-full h-3 cursor-row-resize";

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={style}
    >
      {children}

      <div
        role="separator"
        aria-orientation={
          isHorizontal ? "vertical" : "horizontal"
        }
        onPointerDown={handlePointerDown}
        className={`group absolute z-20 touch-none ${handlePosition}`}
      >
        <div
          className={
            isHorizontal
              ? "mx-auto h-full w-px bg-border transition-colors group-hover:bg-copper group-active:bg-copper"
              : "my-auto h-px w-full bg-border transition-colors group-hover:bg-copper group-active:bg-copper"
          }
        />
      </div>
    </div>
  );
}
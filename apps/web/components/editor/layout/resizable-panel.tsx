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

  const moveHandlerRef = useRef<(event: PointerEvent) => void>(() => {});
  const upHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    moveHandlerRef.current = (event: PointerEvent) => {
      if (!dragState.current) return;

      const isHorizontal = edge !== "top";
      const position = isHorizontal ? event.clientX : event.clientY;

      const delta = position - dragState.current.startPos;
      const signedDelta =
        edge === "right" || edge === "top" ? -delta : delta;

      const nextSize = Math.min(
        max,
        Math.max(min, dragState.current.startSize + signedDelta)
      );

      onResize(nextSize);
    };

    upHandlerRef.current = () => {
      dragState.current = null;

      window.removeEventListener(
        "pointermove",
        moveHandlerRef.current
      );
      window.removeEventListener(
        "pointerup",
        upHandlerRef.current
      );

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [edge, max, min, onResize]);

  useEffect(() => {
    return () => {
      window.removeEventListener(
        "pointermove",
        moveHandlerRef.current
      );
      window.removeEventListener(
        "pointerup",
        upHandlerRef.current
      );

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragState.current = {
        startPos: edge === "top" ? event.clientY : event.clientX,
        startSize: size,
      };

      window.addEventListener(
        "pointermove",
        moveHandlerRef.current
      );

      window.addEventListener(
        "pointerup",
        upHandlerRef.current
      );

      document.body.style.cursor =
        edge === "top" ? "row-resize" : "col-resize";

      document.body.style.userSelect = "none";
    },
    [edge, size]
  );

  const isHorizontal = edge !== "top";

  const style = isHorizontal
    ? { width: size }
    : { height: size };

  const handlePositionClass =
    edge === "left"
      ? "left-0 -translate-x-1/2 h-full w-2 cursor-col-resize"
      : edge === "right"
      ? "right-0 translate-x-1/2 h-full w-2 cursor-col-resize"
      : "top-0 h-2 w-full cursor-row-resize";

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
        className={`group absolute z-20 ${handlePositionClass}`}
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
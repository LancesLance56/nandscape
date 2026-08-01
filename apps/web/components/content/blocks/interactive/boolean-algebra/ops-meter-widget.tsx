"use client";

import { useEffect, useRef, useState } from "react";
import { useOpsMeterStore } from "@/store/ops-meter-store";

export function OpsMeterWidget(_props: { data: Record<string, unknown> }) {
  const count = useOpsMeterStore((s) => s.count);
  const reset = useOpsMeterStore((s) => s.reset);
  const [bumped, setBumped] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (count === prevCount.current) return;
    prevCount.current = count;
    setBumped(true);
    const t = setTimeout(() => setBumped(false), 300);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div
      className={`fixed right-3 top-3 z-40 rounded-lg border bg-surface-card px-3.5 py-2 text-right shadow-lg transition-transform duration-300 ${
        bumped ? "scale-105 border-copper" : "border-border"
      }`}
    >
      <span className="hidden font-mono text-[11px] text-slate sm:block">expensive calls skipped</span>
      <span className="block font-mono text-lg font-semibold text-copper sm:text-xl">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

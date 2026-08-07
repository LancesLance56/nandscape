"use client";

import { useState } from "react";
import type { ContentBlock } from "@/types/content-block";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";

function readClassName(block: ContentBlock): string {
  const value = (block as unknown as { className?: unknown }).className;
  return typeof value === "string" ? value : "";
}

export function BlockInspector({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate transition-colors hover:text-ink"
      >
        Advanced
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 max-w-sm">
          <Field label="Custom class name (optional)">
            <input
              className={`${fieldInputClass} font-mono`}
              value={readClassName(block)}
              onChange={(e) => onChange({ className: e.target.value || undefined })}
              placeholder="text-copper-dark"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Field, fieldInputClass } from "@/components/blog-editor/fields/field";
import { RawJsonField } from "@/components/blog-editor/fields/raw-json-field";
import { isCircuitEmbedData, type CircuitEmbedData } from "@/components/content/blocks/circuit/circuit-embed";
import type { WidgetEditorProps } from "@/lib/blog-editor/widget-registry";

function validateInlineCircuit(data: unknown): string[] {
  return isCircuitEmbedData(data as Record<string, unknown>) ? [] : ["Needs `nodes` and `edges` arrays."];
}

type Mode = "link" | "json";

/** Accepts a bare slug, a "/projects/slug" path, or a full project URL. */
function extractProjectSlug(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed, "https://placeholder.invalid");
    const match = /\/projects\/([^/?#]+)/.exec(url.pathname);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL - fall through and treat it as a bare slug/path.
  }
  return trimmed.replace(/^\/*projects\/?/, "").replace(/\/+$/, "");
}

function withoutKeys(data: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (!keys.includes(key)) next[key] = data[key];
  }
  return next;
}

export function CircuitEmbedWidgetEditor({ data, onChange }: WidgetEditorProps) {
  const circuit = data as CircuitEmbedData;
  const [mode, setMode] = useState<Mode>(circuit.projectSlug ? "link" : "json");
  const [linkInput, setLinkInput] = useState(circuit.projectSlug ?? "");
  const [checking, setChecking] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const checkAndApplyLink = async (rawInput: string) => {
    const version = ++requestVersionRef.current;
    const slug = extractProjectSlug(rawInput);
    setLinkInput(slug);
    if (!slug) {
      setResolvedName(null);
      setLinkError(null);
      onChange(withoutKeys(data, ["projectSlug"]));
      return;
    }

    setChecking(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(slug)}`);
      if (version !== requestVersionRef.current) return;
      if (!res.ok) {
        setResolvedName(null);
        setLinkError("No public or unlisted circuit found at that link.");
        return;
      }
      const body = (await res.json()) as { project: { name: string } };
      if (version !== requestVersionRef.current) return;
      setResolvedName(body.project.name);
      onChange({ ...withoutKeys(data, ["nodes", "edges"]), projectSlug: slug });
    } catch {
      if (version !== requestVersionRef.current) return;
      setResolvedName(null);
      setLinkError("Couldn't check that link.");
    } finally {
      if (version === requestVersionRef.current) setChecking(false);
    }
  };

  const switchMode = (next: Mode) => {
    requestVersionRef.current++;
    setMode(next);
    if (next === "json") onChange(withoutKeys(data, ["projectSlug"]));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-0.5 self-start rounded-lg border border-border bg-surface-2 p-0.5">
        {(["link", "json"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors ${
              mode === m ? "bg-surface-card text-ink shadow-sm" : "text-slate hover:text-ink-soft"
            }`}
          >
            {m === "link" ? "Link a circuit" : "Raw JSON"}
          </button>
        ))}
      </div>

      {mode === "link" ? (
        <>
          <Field label="Circuit link or slug">
            <input
              className={fieldInputClass}
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onBlur={(e) => void checkAndApplyLink(e.target.value)}
              placeholder="e.g. half-adder-x7q2p or a full /projects/... link"
            />
          </Field>
          {checking && <p className="text-xs text-slate">Checking…</p>}
          {!checking && resolvedName && <p className="text-xs text-signal-green">Linked to &ldquo;{resolvedName}&rdquo;.</p>}
          {!checking && linkError && <p className="text-xs text-signal-coral">{linkError}</p>}
          <p className="text-xs text-slate">
            Only public and unlisted circuits can be linked. The embed always shows the circuit&rsquo;s current state
            - editing the original updates every post that links to it.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Title (optional)">
              <input
                className={fieldInputClass}
                value={typeof circuit.title === "string" ? circuit.title : ""}
                onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
                placeholder={resolvedName ?? "Circuit"}
              />
            </Field>
            <Field label="Height (px)">
              <input
                type="number"
                min={120}
                className={fieldInputClass}
                value={typeof circuit.height === "number" ? circuit.height : ""}
                onChange={(e) => onChange({ ...data, height: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="280"
              />
            </Field>
          </div>
        </>
      ) : (
        <RawJsonField data={data} onChange={onChange} validate={validateInlineCircuit} />
      )}
    </div>
  );
}

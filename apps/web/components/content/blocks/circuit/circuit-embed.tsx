"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSandboxProgressStore } from "@/store/sandbox-progress-store";
import { makeScope } from "@/lib/editor/make-scope";
import { CircuitStage } from "./circuit-stage";
import type { EditorNode, EditorEdge } from "@/types/editor";

/**
 * Either an inline snapshot (`nodes`/`edges` pasted or built into the block
 * directly) or a live link to a saved circuit (`projectSlug`) resolved at
 * render time via GET /api/projects/[slug] - editing the source project
 * afterwards updates every embed pointing at it, the same way a link would.
 * `projectSlug` wins if both are present (see isCircuitEmbedData).
 */
export interface CircuitEmbedData {
  title?: string;
  height?: number;
  projectSlug?: string;
  nodes?: EditorNode[];
  edges?: EditorEdge[];
  [key: string]: unknown | undefined;
}

export function isCircuitEmbedData(data: Record<string, unknown>): data is CircuitEmbedData {
  const hasLink = typeof data.projectSlug === "string" && data.projectSlug.trim() !== "";
  const hasInlineCircuit = Array.isArray(data.nodes) && Array.isArray(data.edges);
  return hasLink || hasInlineCircuit;
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

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface LinkedCircuit {
  nodes: EditorNode[];
  edges: EditorEdge[];
  name: string;
}

/**
 * Resolves a projectSlug link to its circuit data client-side, so this
 * works identically whether the widget is rendering on a published page or
 * in the admin editor's live preview - both just mount this component, no
 * separate server-side resolution path to keep in sync. Editing the source
 * project later changes what every embed pointing at it shows, same as any
 * other link.
 */
function useLinkedCircuit(projectSlug: string | undefined) {
  const [circuit, setCircuit] = useState<LinkedCircuit | null>(null);
  const [loading, setLoading] = useState(Boolean(projectSlug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug) {
      setCircuit(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/projects/${encodeURIComponent(projectSlug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { project: { nodes: EditorNode[]; edges: EditorEdge[]; name: string } };
        if (!cancelled) setCircuit({ nodes: body.project.nodes, edges: body.project.edges, name: body.project.name });
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Couldn't load circuit "${projectSlug}" - it may be private, unshared, or no longer exist.`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  return { circuit, loading, error };
}

export function CircuitEmbedWidget({ data }: { data: Record<string, unknown> }) {
  const router = useRouter();
  const mounted = useMounted();
  const [expanded, setExpanded] = useState(false);
  const saveSandbox = useSandboxProgressStore((s) => s.save);

  const valid = isCircuitEmbedData(data);
  const projectSlug = valid ? data.projectSlug : undefined;
  const { circuit: linked, loading, error: linkError } = useLinkedCircuit(projectSlug);

  if (!valid) {
    return (
      <div className="my-2 rounded-xl border border-dashed border-border-strong p-4 text-sm text-slate">
        Circuit embed is missing node/edge data.
      </div>
    );
  }

  const height = data.height ?? 280;

  if (projectSlug) {
    if (loading) {
      return (
        <div
          style={{ height }}
          className="my-8 flex animate-pulse items-center justify-center rounded-2xl border border-border bg-surface-card"
        >
          <span className="font-mono text-xs text-slate">Loading circuit…</span>
        </div>
      );
    }
    if (linkError || !linked) {
      return (
        <div className="my-2 rounded-xl border border-dashed border-border-strong p-4 text-sm text-slate">
          {linkError ?? "Circuit link is missing node/edge data."}
        </div>
      );
    }
  }

  const nodes = projectSlug ? linked!.nodes : (data.nodes ?? []);
  const edges = projectSlug ? linked!.edges : (data.edges ?? []);
  const title = data.title ?? (projectSlug ? linked!.name : undefined) ?? "Circuit";

  const handleOpenSandbox = () => {
    // Replaces the sandbox's tabs entirely with this one circuit, same as
    // the old flat-save behavior did before tabs existed.
    const scope = makeScope(title, nodes, edges);
    saveSandbox([scope], scope.id);
    router.push("/nandbox");
  };

  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-surface-card shadow-[0_16px_40px_rgba(21,27,24,0.08)]">
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-coral" />
        <span className="h-2.5 w-2.5 rounded-full bg-copper" />
        <span className="h-2.5 w-2.5 rounded-full bg-signal-green" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">{title}</span>
        {projectSlug && (
          <Link
            href={`/projects/${projectSlug}`}
            className="font-mono text-[10px] font-medium text-slate underline decoration-border-strong underline-offset-2 hover:text-copper-dark"
          >
            View original
          </Link>
        )}
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
          <CircuitStage nodes={nodes} edges={edges} />
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
                  <CircuitStage nodes={nodes} edges={edges} allowScrollZoom />
                </ReactFlowProvider>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

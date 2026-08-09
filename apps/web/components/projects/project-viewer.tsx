"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { ProjectRecord } from "@/lib/projects/projects";

export function ProjectViewer({
  project,
  canFork,
  canDelete,
}: {
  project: ProjectRecord;
  canFork: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [forking, setForking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFork = async () => {
    setForking(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.slug}/fork`, { method: "POST" });
    if (!res.ok) {
      setForking(false);
      setError(res.status === 401 ? "Log in to fork this circuit." : "Couldn't fork this circuit.");
      return;
    }
    const { project: fork } = (await res.json()) as { project: { slug: string } };
    router.push(`/projects/${fork.slug}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.slug}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Couldn't delete this circuit.");
      return;
    }
    router.push("/community");
    router.refresh();
  };

  return (
    <main className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col px-6 pb-10 pt-32">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-ink">{project.name}</h1>
          <p className="font-mono text-xs text-slate">by {project.ownerUsername}</p>
          {project.description && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{project.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {error && <span className="text-xs text-signal-coral">{error}</span>}
          {canFork && (
            <button
              type="button"
              onClick={handleFork}
              disabled={forking}
              className="rounded-lg bg-copper px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-copper-dark disabled:opacity-60"
            >
              {forking ? "Forking…" : "Fork to your account"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-signal-coral hover:text-signal-coral disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface-card">
        <ReactFlowProvider>
          <CircuitStage nodes={project.nodes} edges={project.edges} allowScrollZoom />
        </ReactFlowProvider>
      </div>
    </main>
  );
}

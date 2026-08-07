"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { CircuitStage } from "@/components/content/blocks/circuit/circuit-stage";
import type { ProjectRecord } from "@/lib/projects/projects";

export function ProjectViewer({ project, canFork }: { project: ProjectRecord; canFork: boolean }) {
  const router = useRouter();
  const [forking, setForking] = useState(false);
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

  return (
    <main className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl flex-col px-6 pb-10 pt-32">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{project.name}</h1>
          <p className="font-mono text-xs text-slate">by {project.ownerUsername}</p>
        </div>
        <div className="flex items-center gap-2">
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

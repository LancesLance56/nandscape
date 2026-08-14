"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUiStore } from "@/store/ui-store";
import { useProjectStore } from "@/store/project-store";
import type { ProjectSummary } from "@/lib/projects/projects";

type FetchStatus = "loading" | "unauthenticated" | "error" | "ready";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The sandbox's default left-sidebar tab (see sidebar.tsx and editor/index.tsx):
 *  a compact list of the signed-in user's saved circuits, mirroring
 *  /projects but sized for the narrow panel instead of a full page. Saving
 *  goes through the existing Share dialog (see share-dialog.tsx) rather than
 *  a second save path here,  that dialog already handles create-vs-update
 *  and setting useProjectStore's active project. */
export function ProjectsPanel() {
  const openDialog = useUiStore((s) => s.openDialog);
  const active = useProjectStore((s) => s.active);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch("/api/projects")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setStatus("unauthenticated");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const { projects } = (await res.json()) as { projects: ProjectSummary[] };
        setProjects(projects);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // Re-fetches whenever the currently open project changes (including a
    // fresh save from the Share dialog), so a newly saved project shows up
    // here without needing a manual refresh.
  }, [active]);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between px-1">
        <span className=" text-[11px] font-semibold text-slate">
          My projects
        </span>
        <button
          type="button"
          onClick={() => openDialog("share")}
          className="rounded-md border border-border-strong px-2 py-0.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
        >
          + Save current
        </button>
      </div>

      {status === "loading" && <p className="px-1 text-xs text-ink-soft">Loading…</p>}

      {status === "unauthenticated" && (
        <p className="px-1 text-xs text-ink-soft">
          <Link href="/login" className="text-copper-dark underline">
            Log in
          </Link>{" "}
          to save circuits to your account and see them here.
        </p>
      )}

      {status === "error" && (
        <p className="px-1 text-xs text-signal-coral">Couldn&apos;t load your projects.</p>
      )}

      {status === "ready" && projects.length === 0 && (
        <p className="px-1 text-xs text-ink-soft">
          Nothing saved yet,  build something, then hit &ldquo;Save current&rdquo;.
        </p>
      )}

      {status === "ready" &&
        projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
              active?.slug === project.slug
                ? "border-copper/50 bg-copper-bg/40"
                : "border-border bg-surface-card hover:border-border-strong"
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{project.name}</span>
            <span className="shrink-0 text-[10px] text-slate">{formatDate(project.updatedAt)}</span>
          </Link>
        ))}

      {status === "ready" && projects.length > 0 && (
        <Link
          href="/projects"
          className="mt-1 px-1 text-xs font-medium text-copper-dark hover:text-copper"
        >
          See all →
        </Link>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectSummary, ProjectVisibility } from "@/lib/projects/projects";

const VISIBILITY_LABEL: Record<ProjectVisibility, string> = {
  PRIVATE: "Private",
  UNLISTED: "Unlisted",
  PUBLIC: "Public",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ProjectsList({ initial }: { initial: ProjectSummary[] }) {
  const [projects, setProjects] = useState(initial);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startRename = (project: ProjectSummary) => {
    setRenamingId(project.id);
    setDraftName(project.name);
    setError(null);
  };

  const commitRename = async (project: ProjectSummary) => {
    const name = draftName.trim();
    setRenamingId(null);
    if (!name || name === project.name) return;

    const res = await fetch(`/api/projects/${project.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Couldn't rename that project.");
      return;
    }
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, name } : p)));
  };

  const changeVisibility = async (project: ProjectSummary, visibility: ProjectVisibility) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, visibility } : p)));
    const res = await fetch(`/api/projects/${project.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    if (!res.ok) {
      setError("Couldn't change visibility.");
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, visibility: project.visibility } : p)));
    }
  };

  const remove = async (project: ProjectSummary) => {
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/projects/${project.slug}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete that project.");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  if (projects.length === 0) {
    return <p className="text-sm text-ink-soft">No saved circuits yet. Build something in the sandbox and save it here.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="mb-2 text-xs text-signal-coral">{error}</p>}

      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2/60"
        >
          {renamingId === project.id ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => commitRename(project)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(project);
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-copper"
            />
          ) : (
            <Link href={`/projects/${project.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-copper-dark">
              {project.name}
            </Link>
          )}

          <span className="font-mono text-[11px] text-slate">{formatDate(project.updatedAt)}</span>

          <select
            value={project.visibility}
            onChange={(e) => changeVisibility(project, e.target.value as ProjectVisibility)}
            className="rounded-md border border-border-strong bg-surface px-1.5 py-1 font-mono text-[11px] font-semibold text-ink-soft outline-none"
          >
            {(Object.keys(VISIBILITY_LABEL) as ProjectVisibility[]).map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABEL[v]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => startRename(project)}
            className="rounded-md px-1.5 py-1 text-xs text-ink-soft hover:text-ink"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => remove(project)}
            className="rounded-md px-1.5 py-1 text-xs text-ink-soft hover:text-signal-coral"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

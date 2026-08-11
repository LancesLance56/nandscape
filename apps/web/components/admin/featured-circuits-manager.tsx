"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminFeaturedCircuitRow {
  id: string;
  projectSlug: string;
  projectName: string;
  active: boolean;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function FeaturedCircuitsManager({ featured }: { featured: AdminFeaturedCircuitRow[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/featured-circuits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to add project");
        return;
      }
      setSlug("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/featured-circuits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to activate");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/featured-circuits/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to remove");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Project slug"
          className="flex-1 rounded-md border border-border-strong bg-surface-card px-3 py-2 font-mono text-xs text-ink outline-none focus:border-copper"
        />
        <button
          type="submit"
          disabled={adding || !slug.trim()}
          className="rounded-md bg-copper px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Add candidate
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-signal-coral">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-slate">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {featured.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{row.projectName}</span>
                  <span className="ml-2 font-mono text-xs text-slate">/{row.projectSlug}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3">
                  {row.active ? (
                    <span className="rounded-full bg-copper/15 px-2 py-0.5 text-xs font-semibold text-copper-dark">
                      Live on homepage
                    </span>
                  ) : (
                    <span className="text-xs text-slate">Candidate</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {!row.active && (
                      <button
                        onClick={() => handleActivate(row.id)}
                        disabled={pendingId === row.id}
                        className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-semibold text-ink hover:border-copper disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(row.id)}
                      disabled={pendingId === row.id}
                      className="rounded-md border border-border-strong px-2.5 py-1 text-xs font-semibold text-signal-coral hover:border-signal-coral disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {featured.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate">
                  No candidates yet. Add a project slug above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

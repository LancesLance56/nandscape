"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/blog-editor/types";
import type { TutorialPageSummary, TutorialSection } from "@/types/tutorial";

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PageRow({ page }: { page: TutorialPageSummary }) {
  return (
    <Link
      href={`/admin/tutorials/${page.slug}`}
      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2"
    >
      <span className="truncate font-medium text-ink">{page.title}</span>
      <span className="font-mono text-xs text-slate">{page.status}</span>
      <span className="w-20 text-right font-mono text-xs text-slate">{formatDate(page.publishedAt)}</span>
    </Link>
  );
}

/** Inline "+ New section" row - title + auto-derived slug, same follow-until-diverged pattern metadata-panel.tsx uses for post/page slugs. */
function NewSectionForm({
  nextPosition,
  onCreated,
  onCancel,
}: {
  nextPosition: number;
  onCreated: (section: TutorialSection) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugFollowsTitle = slug === slugify(title);

  const submit = async () => {
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedTitle || !trimmedSlug) {
      setError("Title and slug are both required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tutorial-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, slug: trimmedSlug, position: nextPosition }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Couldn't create that section.");
        return;
      }
      onCreated(body.section as TutorialSection);
    } catch {
      setError("Couldn't create that section.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border-strong p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => {
            const nextTitle = e.target.value;
            setTitle(nextTitle);
            if (slugFollowsTitle) setSlug(slugify(nextTitle));
          }}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
          placeholder="Section title, e.g. Sequential logic"
          className="min-w-40 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-copper"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          placeholder="slug"
          className="w-40 rounded-md border border-border-strong bg-surface px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-copper"
        />
      </div>
      {error && <p className="text-xs text-signal-coral">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-md bg-copper px-3 py-1.5 text-xs font-semibold text-white hover:bg-copper-dark disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create section"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Chapter/section tree, mirroring tutorial-sidebar.tsx's collapsible-section
 * pattern (same chevron, same border-l indent) so the admin list reads as
 * the same hierarchy readers actually see, instead of a flat table with a
 * "Section" column you had to scan and mentally regroup. Sections are local
 * state seeded from the server-fetched prop (same pattern as
 * projects-list.tsx) so a newly created one shows up immediately.
 */
export function AdminTutorialTree({
  pages,
  sections: initialSections,
}: {
  pages: TutorialPageSummary[];
  sections: TutorialSection[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pagesBySection = new Map<string, TutorialPageSummary[]>();
  const standalone: TutorialPageSummary[] = [];
  for (const page of pages) {
    if (!page.sectionId) {
      standalone.push(page);
      continue;
    }
    const list = pagesBySection.get(page.sectionId);
    if (list) list.push(page);
    else pagesBySection.set(page.sectionId, [page]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-surface-card p-2">
        {sections.map((section) => {
          const sectionPages = pagesBySection.get(section.id) ?? [];
          const open = !collapsed.has(section.id);
          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-slate transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <span>
                  {section.title}
                  <span className="ml-2 font-mono text-[11px] font-normal normal-case tracking-normal text-border-strong">
                    {sectionPages.length} page{sectionPages.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronIcon open={open} />
              </button>
              {open && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border py-0.5 pl-3">
                  {sectionPages.length > 0 ? (
                    sectionPages.map((page) => <PageRow key={page.id} page={page} />)
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate">No pages in this section yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {standalone.length > 0 && (
          <div className={sections.length > 0 ? "mt-1" : undefined}>
            <div className="px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate">
              No section
            </div>
            <div className="flex flex-col gap-0.5">
              {standalone.map((page) => (
                <PageRow key={page.id} page={page} />
              ))}
            </div>
          </div>
        )}

        {sections.length === 0 && pages.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate">No tutorial pages yet.</p>
        )}
      </div>

      {creating ? (
        <NewSectionForm
          nextPosition={sections.length}
          onCreated={(section) => {
            setSections((prev) => [...prev, section]);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="self-start rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-semibold text-slate transition-colors hover:border-copper hover:text-copper-dark"
        >
          + New section
        </button>
      )}
    </div>
  );
}

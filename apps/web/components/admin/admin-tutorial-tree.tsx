"use client";

import { useState } from "react";
import Link from "next/link";
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

/**
 * Chapter/section tree, mirroring tutorial-sidebar.tsx's collapsible-section
 * pattern (same chevron, same border-l indent) so the admin list reads as
 * the same hierarchy readers actually see, instead of a flat table with a
 * "Section" column you had to scan and mentally regroup.
 */
export function AdminTutorialTree({
  pages,
  sections,
}: {
  pages: TutorialPageSummary[];
  sections: TutorialSection[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (pages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong px-4 py-10 text-center text-sm text-slate">
        No tutorial pages yet.
      </div>
    );
  }

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
    </div>
  );
}

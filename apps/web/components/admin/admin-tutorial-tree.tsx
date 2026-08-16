"use client";

import { useState } from "react";
import Link from "next/link";
import { slugify } from "@/lib/blog-editor/types";
import type { TutorialPageSummary, TutorialSection, TutorialTrack } from "@/types/tutorial";

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

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Up/down pair reused for tracks, sections, and pages - the three levels
 *  that carry a `position` column. Both buttons live outside any enclosing
 *  <Link> (see PageRow) since a button nested inside an anchor is invalid
 *  HTML and eats the click before stopPropagation can run in some browsers. */
function MoveButtons({
  label,
  isFirst,
  isLast,
  disabled,
  onUp,
  onDown,
}: {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const btnClass =
    "rounded p-1 text-slate transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUp();
        }}
        disabled={disabled || isFirst}
        aria-label={`Move ${label} up`}
        className={btnClass}
      >
        <ArrowIcon direction="up" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDown();
        }}
        disabled={disabled || isLast}
        aria-label={`Move ${label} down`}
        className={btnClass}
      >
        <ArrowIcon direction="down" />
      </button>
    </div>
  );
}

function PageRow({
  page,
  isFirst,
  isLast,
  disabled,
  onMove,
}: {
  page: TutorialPageSummary;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-surface-2">
      <Link href={`/admin/tutorials/${page.slug}`} className="truncate font-medium text-ink">
        {page.title}
      </Link>
      <span className="text-xs text-slate">{page.status}</span>
      <span className="w-20 text-right text-xs text-slate">{formatDate(page.publishedAt)}</span>
      <MoveButtons label={page.title} isFirst={isFirst} isLast={isLast} disabled={disabled} onUp={() => onMove("up")} onDown={() => onMove("down")} />
    </div>
  );
}

/** Inline "+ New section" row - title + auto-derived slug, same follow-until-diverged pattern metadata-panel.tsx uses for post/page slugs. */
function NewSectionForm({
  nextPosition,
  tracks,
  onCreated,
  onCancel,
}: {
  nextPosition: number;
  tracks: TutorialTrack[];
  onCreated: (section: TutorialSection) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [trackId, setTrackId] = useState<string>(tracks[0]?.id ?? "");
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
        body: JSON.stringify({
          title: trimmedTitle,
          slug: trimmedSlug,
          position: nextPosition,
          trackId: trackId || null,
        }),
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
          className="w-40 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
        />
        <select
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          aria-label="Track"
          className="rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-copper"
        >
          <option value="">No track</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </select>
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

const byPosition = <T extends { position: number; title: string }>(a: T, b: T): number =>
  a.position - b.position || a.title.localeCompare(b.title);

/** Swaps two rows' `position` values on the server and returns both rows with
 *  their new positions, or null if either request failed. Existing positions
 *  are spaced 10 apart (see tutorial seed files), so a plain swap between two
 *  already-adjacent rows is enough to flip their order - no renumbering of
 *  the rest of the list needed. */
async function swapPositions<T extends { slug: string; position: number }>(
  apiPath: string,
  a: T,
  b: T,
): Promise<[T, T] | null> {
  const patch = (item: T, position: number) =>
    fetch(`${apiPath}/${item.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });

  const [resA, resB] = await Promise.all([patch(a, b.position), patch(b, a.position)]);
  if (!resA.ok || !resB.ok) return null;
  return [
    { ...a, position: b.position },
    { ...b, position: a.position },
  ];
}

/**
 * Chapter/section tree, mirroring tutorial-sidebar.tsx's collapsible-section
 * pattern (same chevron, same border-l indent) so the admin list reads as
 * the same hierarchy readers actually see, instead of a flat table with a
 * "Section" column you had to scan and mentally regroup. Sections, pages,
 * and tracks are all local state seeded from server-fetched props (same
 * pattern as projects-list.tsx) so a newly created section, or a reorder,
 * shows up immediately without a full page refetch.
 *
 * Reordering swaps `position` between adjacent siblings within the same
 * parent (a track's sections, or a section's pages) rather than any
 * free-form drag - it's the smallest interaction that satisfies "move this
 * section above that one," and it maps directly onto the existing PATCH
 * endpoints without adding a bulk-reorder API.
 */
export function AdminTutorialTree({
  pages: initialPages,
  sections: initialSections,
  tracks: initialTracks = [],
}: {
  pages: TutorialPageSummary[];
  sections: TutorialSection[];
  tracks?: TutorialTrack[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [pages, setPages] = useState(initialPages);
  const [tracks, setTracks] = useState(initialTracks);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runMove = async <T extends { slug: string; position: number }>(
    apiPath: string,
    list: T[],
    item: T,
    direction: "up" | "down",
    apply: (updater: (prev: T[]) => T[]) => void,
  ) => {
    const idx = list.findIndex((x) => x.slug === item.slug);
    const neighbor = list[direction === "up" ? idx - 1 : idx + 1];
    if (!neighbor) return;

    setMoving(true);
    setMoveError(null);
    const result = await swapPositions(apiPath, item, neighbor);
    setMoving(false);
    if (!result) {
      setMoveError("Couldn't save that reorder. Try again.");
      return;
    }
    const [updatedItem, updatedNeighbor] = result;
    apply((prev) =>
      prev
        .map((x) => (x.slug === updatedItem.slug ? updatedItem : x.slug === updatedNeighbor.slug ? updatedNeighbor : x))
        .sort(byPosition as (a: T, b: T) => number),
    );
  };

  const moveTrack = (track: TutorialTrack, direction: "up" | "down") =>
    runMove("/api/tutorial-tracks", tracks, track, direction, setTracks);

  const moveSection = (section: TutorialSection, group: TutorialSection[], direction: "up" | "down") =>
    runMove("/api/tutorial-sections", group, section, direction, setSections);

  const movePage = (page: TutorialPageSummary, group: TutorialPageSummary[], direction: "up" | "down") =>
    runMove("/api/tutorials", group, page, direction, setPages);

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
      {moveError && <p className="text-xs text-signal-coral">{moveError}</p>}

      <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-surface-card p-2">
        {renderSections(
          sections.filter((s) => !s.trackId),
          "No track",
        )}
        {tracks.map((track, i) =>
          renderSections(sections.filter((s) => s.trackId === track.id), track.title, {
            track,
            isFirst: i === 0,
            isLast: i === tracks.length - 1,
          }),
        )}

        {standalone.length > 0 && (
          <div className="mb-1">
            <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate">
              No section
            </div>
            <div className="flex flex-col gap-0.5">
              {standalone.map((page, i) => (
                <PageRow
                  key={page.id}
                  page={page}
                  isFirst={i === 0}
                  isLast={i === standalone.length - 1}
                  disabled={moving}
                  onMove={(direction) => movePage(page, standalone, direction)}
                />
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
          tracks={tracks}
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

  function renderSections(
    list: TutorialSection[],
    label: string,
    trackMove?: { track: TutorialTrack; isFirst: boolean; isLast: boolean },
  ) {
    if (list.length === 0) return null;
    return (
      <div key={label} className="mb-1">
        <div className="flex items-center justify-between px-3 pb-1 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-copper-dark">{label}</span>
          {trackMove && (
            <MoveButtons
              label={label}
              isFirst={trackMove.isFirst}
              isLast={trackMove.isLast}
              disabled={moving}
              onUp={() => moveTrack(trackMove.track, "up")}
              onDown={() => moveTrack(trackMove.track, "down")}
            />
          )}
        </div>
        {list.map((section, i) => {
          const sectionPages = pagesBySection.get(section.id) ?? [];
          const open = !collapsed.has(section.id);
          return (
            <div key={section.id}>
              <div className="flex items-center gap-1 rounded-lg pr-2 transition-colors hover:bg-surface-2">
                <button
                  type="button"
                  onClick={() => toggle(section.id)}
                  className="flex flex-1 items-center justify-between px-3 py-2 text-left text-[11px] font-semibold text-slate hover:text-ink"
                >
                  <span>
                    {section.title}
                    <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-border-strong">
                      {sectionPages.length} page{sectionPages.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronIcon open={open} />
                </button>
                <MoveButtons
                  label={section.title}
                  isFirst={i === 0}
                  isLast={i === list.length - 1}
                  disabled={moving}
                  onUp={() => moveSection(section, list, "up")}
                  onDown={() => moveSection(section, list, "down")}
                />
              </div>
              {open && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border py-0.5 pl-3">
                  {sectionPages.length > 0 ? (
                    sectionPages.map((page, j) => (
                      <PageRow
                        key={page.id}
                        page={page}
                        isFirst={j === 0}
                        isLast={j === sectionPages.length - 1}
                        disabled={moving}
                        onMove={(direction) => movePage(page, sectionPages, direction)}
                      />
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate">No pages in this section yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

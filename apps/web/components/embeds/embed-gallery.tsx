"use client";

import { useMemo, useState } from "react";
import { EmbedBuilder } from "./embed-builder";
import { embedPath, type EmbedCatalogEntry } from "@/lib/embeds/embeddable";
import { cn } from "@/lib/cn";

/**
 * Pick something from the list, watch it run, then copy the code.
 *
 * The catalog is passed in rather than imported, so this stays a dumb list.
 * The registries (TOOLS, ALL_CHARTS) decide what is embeddable; otherwise this
 * component would be a second place to keep in step with them.
 */
export function EmbedGallery({ catalog }: { catalog: EmbedCatalogEntry[] }) {
  const [selectedId, setSelectedId] = useState(`${catalog[0]?.kind}:${catalog[0]?.id}`);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => catalog.find((entry) => `${entry.kind}:${entry.id}` === selectedId) ?? catalog[0],
    [catalog, selectedId],
  );

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? catalog.filter((entry) => entry.title.toLowerCase().includes(needle) || entry.id.includes(needle))
      : catalog;

    const byGroup = new Map<string, EmbedCatalogEntry[]>();
    for (const entry of matching) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup.entries()];
  }, [catalog, query]);

  if (!selected) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
      {/* The menu. */}
      <div className="flex max-h-[36rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface-card">
        <div className="border-b border-border p-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${catalog.length} embeddables…`}
            className="w-full rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-slate focus:border-copper"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {groups.length === 0 && <p className="px-2 py-3 text-xs text-slate">Nothing matches that.</p>}

          {groups.map(([group, entries]) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate">
                {group}
              </p>
              {entries.map((entry) => {
                const id = `${entry.kind}:${entry.id}`;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={cn(
                      "block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                      id === selectedId
                        ? "bg-copper/12 font-semibold text-copper-dark"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {entry.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* The thing, running, plus its snippet. */}
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="truncate text-[11px] font-semibold text-ink">{selected.title}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-slate">{embedPath(selected)}</span>
          </div>
          <iframe
            key={`${selected.kind}:${selected.id}`}
            src={embedPath(selected)}
            title={`${selected.title} embed preview`}
            loading="lazy"
            style={{ height: Math.min(selected.height, 460), border: 0 }}
            className="w-full bg-surface"
          />
        </div>

        <EmbedBuilder
          variant="inline"
          target={{ kind: selected.kind, id: selected.id }}
          title={selected.title}
          defaultHeight={selected.height}
        />
      </div>
    </div>
  );
}

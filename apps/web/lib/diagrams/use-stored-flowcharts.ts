"use client";

import { useEffect, useState } from "react";
import { isFlowchartSpec, type FlowchartSpec } from "@/lib/flowchart/types";

export interface StoredFlowchart {
  slug: string;
  title: string;
  group: string | null;
  position: number;
  spec: FlowchartSpec;
}

export interface StoredFlowchartGroup {
  label: string;
  charts: { id: string; label: string }[];
}

interface ApiDiagram {
  slug: string;
  title: string;
  group: string | null;
  position: number;
  spec: unknown;
}

/**
 * The stored flowcharts, for the admin editor's picker and preview.
 *
 * The reading side of the site resolves these on the server, so it never
 * needs this. The editor does: it runs in the browser, and a preset the
 * author picks has to be fetched rather than read out of a compiled table -
 * otherwise the preview would show a stale copy of a diagram they had just
 * edited in the database.
 */
export function useStoredFlowcharts(): {
  bySlug: Map<string, FlowchartSpec>;
  groups: StoredFlowchartGroup[];
  loading: boolean;
  error: string | null;
} {
  const [charts, setCharts] = useState<StoredFlowchart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/diagrams?kind=flowchart")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { diagrams: ApiDiagram[] };
        if (cancelled) return;
        setCharts(
          body.diagrams
            .filter((d) => isFlowchartSpec(d.spec))
            .map((d) => ({
              slug: d.slug,
              title: d.title,
              group: d.group,
              position: d.position,
              spec: d.spec as FlowchartSpec,
            })),
        );
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the stored diagrams.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const bySlug = new Map(charts.map((c) => [c.slug, c.spec]));

  const byGroup = new Map<string, StoredFlowchart[]>();
  for (const c of charts) {
    const label = c.group ?? "Other";
    byGroup.set(label, [...(byGroup.get(label) ?? []), c]);
  }
  const groups: StoredFlowchartGroup[] = [...byGroup.entries()].map(([label, list]) => ({
    label,
    charts: [...list]
      .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
      .map((c) => ({ id: c.slug, label: c.title })),
  }));

  return { bySlug, groups, loading, error };
}

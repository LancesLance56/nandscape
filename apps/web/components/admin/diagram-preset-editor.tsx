"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";
import { FlowchartWorkbench } from "@/components/flowchart/workbench";
import { useFlowchartDoc } from "@/components/flowchart/use-flowchart-doc";
import { STARTER_CHART } from "@/lib/flowchart/charts";
import { isFlowchartSpec, type FlowchartSpec } from "@/lib/flowchart/types";
import type { DiagramKind } from "@/lib/diagrams/diagram-records";
import { cn } from "@/lib/cn";

/**
 * Editing a stored diagram preset in place.
 *
 * The flowchart editor itself is not new - it is the same component the blog
 * editor already mounts for a *custom* chart. What was missing was a way to
 * point it at a shared preset: in the blog editor, "Built-in chart" only picks
 * and previews one, and switching to "Custom chart" copies the spec into that
 * one block and detaches it, which is the documented behaviour and the exact
 * opposite of fixing the shared diagram. So this screen reuses the editor and
 * changes only where the result is written - back to `diagram_presets`, where
 * every page reading that slug picks it up.
 *
 * Graph presets get a JSON field rather than a canvas. There is no graph
 * equivalent of the flowchart workbench, and the honest answer is a text area that
 * validates rather than a half-built canvas that quietly mangles a spec.
 */

/**
 * The canvas, wired to this form's state.
 *
 * The workbench owns the document so that undo and the coalescing of a drag
 * into a single history step behave the same here as in the studio; this
 * publishes each version back to the form, one way only, because syncing the
 * other direction would fight every keystroke.
 */
function ChartField({
  initial,
  onChange,
}: {
  initial: FlowchartSpec;
  onChange: (spec: FlowchartSpec) => void;
}) {
  const doc = useFlowchartDoc(initial);

  useEffect(() => {
    onChange(doc.spec);
    // `onChange` is a fresh setter identity on each parent render, so
    // depending on it would publish in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.spec]);

  return <FlowchartWorkbench doc={doc} variant="embedded" />;
}

export interface DiagramPresetFormValues {
  slug: string;
  kind: DiagramKind;
  title: string;
  group: string;
  position: number;
  spec: unknown;
}

export interface DiagramPresetEditorProps {
  /** Null when creating. Present when editing, and then the slug is fixed. */
  initial: DiagramPresetFormValues | null;
  /** Pages that render this preset today. Empty when creating. */
  usage: { tutorials: { slug: string; title: string }[]; posts: { slug: string; title: string }[] };
}

const KINDS: { value: DiagramKind; label: string }[] = [
  { value: "flowchart", label: "Flowchart" },
  { value: "graph", label: "Graph" },
];

const inputClass =
  "rounded-lg border border-border-strong bg-surface-card px-3 py-2 text-sm text-ink outline-none focus:border-copper";
const labelClass = "text-xs font-medium text-ink-soft";

export function DiagramPresetEditor({ initial, usage }: DiagramPresetEditorProps) {
  const router = useRouter();
  const creating = initial === null;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [kind, setKind] = useState<DiagramKind>(initial?.kind ?? "flowchart");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [position, setPosition] = useState(initial?.position ?? 0);

  const [chart, setChart] = useState<FlowchartSpec>(() =>
    initial && isFlowchartSpec(initial.spec) ? (initial.spec as FlowchartSpec) : STARTER_CHART,
  );
  const [json, setJson] = useState(() =>
    JSON.stringify(initial?.spec ?? { nodes: [], edges: [] }, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const useCount = usage.tutorials.length + usage.posts.length;

  function currentSpec(): unknown | undefined {
    if (kind === "flowchart") return chart;
    try {
      const parsed = JSON.parse(json);
      setJsonError(null);
      return parsed;
    } catch (parseError) {
      setJsonError(parseError instanceof Error ? parseError.message : "Invalid JSON");
      return undefined;
    }
  }

  async function save() {
    setError(null);
    setSaved(false);

    const spec = currentSpec();
    if (spec === undefined) return;

    if (!slug.trim() || !title.trim()) {
      setError("Slug and title are both required.");
      return;
    }

    setSaving(true);
    try {
      // POST creates, PATCH updates - and PATCH is keyed by the slug in the
      // path, which the API has no way to change, so the slug field is locked
      // once a preset exists (see the note beside it).
      const response = await fetch(
        creating ? "/api/diagrams" : `/api/diagrams/${encodeURIComponent(initial.slug)}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: slug.trim(),
            kind,
            title: title.trim(),
            group: group.trim() === "" ? null : group.trim(),
            position,
            spec,
          }),
        },
      );

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? `Save failed (${response.status})`);
        return;
      }

      setSaved(true);
      if (creating) {
        router.push(`/admin/diagrams/${encodeURIComponent(slug.trim())}`);
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/diagrams/${encodeURIComponent(initial.slug)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? `Delete failed (${response.status})`);
        return;
      }
      router.push("/admin/diagrams");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Shared presets are shared: say how far a change reaches before it is
          made, not after. */}
      {!creating && (
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5 text-xs",
            useCount > 0
              ? "border-copper bg-copper-bg text-copper-dark"
              : "border-border text-slate",
          )}
        >
          {useCount === 0 ? (
            "Not shown on any page yet. Editing this changes nothing until a page uses it."
          ) : (
            <>
              <span className="font-medium">
                Shown on {useCount} {useCount === 1 ? "page" : "pages"}.
              </span>{" "}
              Saving changes every one of them:{" "}
              {[
                // Kept apart rather than concatenated: the two live under
                // different routes, and one list of links half of which 404 is
                // worse than no links.
                ...usage.tutorials.map((page) => ({ ...page, href: `/tutorials/${page.slug}` })),
                ...usage.posts.map((page) => ({ ...page, href: `/blog/${page.slug}` })),
              ].map((page, index) => (
                <span key={page.href}>
                  {index > 0 && ", "}
                  <Link href={page.href} className="underline">
                    {page.title}
                  </Link>
                </span>
              ))}
              .
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Slug</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            readOnly={!creating}
            placeholder="bubble-sort"
            className={cn(inputClass, !creating && "cursor-not-allowed bg-surface-2 text-slate")}
          />
          <span className="text-xxs text-slate">
            {creating
              ? "Lowercase and hyphens. This is what a block's `preset:` points at."
              : "Fixed once created - blocks reference a preset by slug, and the update endpoint is keyed by it, so renaming here would orphan every page using it."}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bubble sort"
            className={inputClass}
          />
          <span className="text-xxs text-slate">Shown in the block editor&rsquo;s picker.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Group</span>
          <input
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            placeholder="Sorting"
            className={inputClass}
          />
          <span className="text-xxs text-slate">
            Optional. Becomes an optgroup heading in the picker.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Position</span>
            <input
              type="number"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value) || 0)}
              className={inputClass}
            />
            <span className="text-xxs text-slate">Order within the group.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Kind</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as DiagramKind)}
              className={inputClass}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {kind === "flowchart" ? (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Diagram</span>
          <ChartField initial={chart} onChange={setChart} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Spec (JSON)</span>
          {/* Said plainly rather than discovered later: the schema, the API and
              this form all accept `graph`, but nothing on the reading side
              resolves a graph preset yet - resolve-block-diagrams only maps the
              flowchart widget families - so a graph preset saved here will not
              appear on any page until that map grows an entry. */}
          <p className="flex items-start gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xxs text-ink-soft">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-copper-dark" />
            <span>
              Graph presets store fine, but no widget reads one yet - the graph widgets only take an
              inline spec. Until{" "}
              <code className="font-mono">lib/diagrams/resolve-block-diagrams.ts</code> maps a graph
              widget family, this will not render on a page.
            </span>
          </p>
          <textarea
            value={json}
            onChange={(event) => {
              setJson(event.target.value);
              setJsonError(null);
            }}
            spellCheck={false}
            rows={20}
            className={cn(inputClass, "font-mono text-xs leading-relaxed")}
          />
          {jsonError && (
            <p role="alert" className="text-xs text-signal-coral-strong">
              {jsonError}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-copper px-5 py-2.5 text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark disabled:opacity-60"
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          {saving ? "Saving…" : creating ? "Create diagram" : "Save changes"}
        </button>

        {saved && (
          <span
            role="status"
            className="flex items-center gap-1 text-xs font-medium text-signal-green-strong"
          >
            <Check className="size-3.5" />
            Saved
          </span>
        )}

        {error && (
          <span role="alert" className="text-xs text-signal-coral-strong">
            {error}
          </span>
        )}

        <span className="flex-1" />

        {!creating &&
          // Deleting something nine lessons render is not a thing to offer
          // casually, so the button is simply not there while it is in use.
          // The API enforces the same rule; this only saves a round-trip.
          (useCount > 0 ? (
            <span className="text-xxs text-slate">In use - cannot be deleted.</span>
          ) : confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">Delete permanently?</span>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="rounded-lg bg-signal-coral px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-signal-coral-strong disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-ink-soft"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-slate transition-colors hover:border-signal-coral hover:text-signal-coral-strong"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          ))}
      </div>
    </div>
  );
}

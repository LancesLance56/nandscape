"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReactFlow } from "@xyflow/react";
import { useScopesStore } from "@/store/scopes-store";
import { useProjectStore } from "@/store/project-store";
import type { ProjectRecord, ProjectVisibility } from "@/lib/projects/projects";
import { downloadDataUrl, exportCircuitImage } from "@/lib/editor/export-image";
import { circuitToJsonDataUrl } from "@/lib/editor/circuit-file";
import { resolveBlockClosure, flattenSubcircuits } from "@/lib/editor/subcircuit-flatten";
import { createScopeAwareResolver } from "@/lib/editor/scope-block";
import { compileEditorGraph } from "@/lib/editor/compile-circuit";
import { generateVerilog } from "@/lib/editor/export-verilog";

interface CurrentUser {
  id: string;
  username: string;
}

const VISIBILITY_OPTIONS: { value: ProjectVisibility; label: string; hint: string }[] = [
  { value: "PRIVATE", label: "Private", hint: "Only you can open it" },
  { value: "UNLISTED", label: "Unlisted", hint: "Anyone with the link can open it" },
  { value: "PUBLIC", label: "Public", hint: "Anyone can find, open, and fork it" },
];

export function ShareDialog({ onCloseAction }: { onCloseAction: () => void }) {
  const router = useRouter();
  const active = useProjectStore((s) => s.active);
  const setActive = useProjectStore((s) => s.setActive);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const setSaveStatus = useProjectStore((s) => s.setSaveStatus);
  const reactFlow = useReactFlow();

  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [name, setName] = useState(active?.name ?? "Untitled circuit");
  const [description, setDescription] = useState(active?.description ?? "");
  const [visibility, setVisibility] = useState<ProjectVisibility>(active?.visibility ?? "PRIVATE");
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setUser(body.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setName(active?.name ?? "Untitled circuit");
    setDescription(active?.description ?? "");
    setVisibility(active?.visibility ?? "PRIVATE");
  }, [active]);

  const handleSave = async () => {
    // Fold whatever's on screen back into its tab before reading "all
    // scopes" - see scopes-store.ts's commitActive doc comment.
    useScopesStore.getState().commitActive();
    const scopes = useScopesStore.getState().scopes;
    if (scopes.every((s) => s.nodes.length === 0)) {
      setError("Build something on the canvas first.");
      return;
    }
    setSaveStatus("saving");
    setError(null);

    const isNew = !active;
    const scopeIds = new Set(scopes.map((s) => s.id));
    // Snapshot every non-builtin block any tab's subcircuits reference
    // (transitively) so the saved project stays self-contained - a fork, an
    // unlisted-link visitor, or an embed shouldn't depend on anything in
    // this browser's local block library. See subcircuit-flatten.ts. Tabs
    // referencing other tabs are walked into (to find real external
    // dependencies) but not collected themselves - they're already part of
    // `scopes`, see resolveBlockClosure's skipCollecting param.
    const { blocks } = resolveBlockClosure(
      scopes.flatMap((s) => s.nodes),
      createScopeAwareResolver(),
      (id) => scopeIds.has(id),
    );
    const res = await fetch(isNew ? "/api/projects" : `/api/projects/${active.slug}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Untitled circuit",
        description: description.trim() || null,
        // Mirror scopes[0] into the back-compat flat columns, same as
        // CircuitEditor's project-load effect reads them.
        nodes: scopes[0]?.nodes ?? [],
        edges: scopes[0]?.edges ?? [],
        scopes,
        blocks,
        visibility,
      }),
    });

    if (!res.ok) {
      setSaveStatus("error");
      setError(isNew ? "Couldn't save this circuit." : "Couldn't save your changes.");
      return;
    }

    const { project } = (await res.json()) as { project: ProjectRecord };
    setActive({
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      visibility: project.visibility,
    });
    setSaveStatus("saved");
    if (isNew) router.replace(`/projects/${project.slug}`);
  };

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
    if (!active) return;
    const res = await fetch(`/api/projects/${active.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (res.ok) {
      const { project } = (await res.json()) as { project: ProjectRecord };
      setActive({
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        visibility: project.visibility,
      });
    }
  };

  const handleDownloadImage = async () => {
    setExporting(true);
    setError(null);
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--surface-card").trim() || "#ffffff";
      const dataUrl = await exportCircuitImage(reactFlow, bg);
      downloadDataUrl(dataUrl, `${(active?.name ?? name).trim().replace(/\s+/g, "-") || "circuit"}.png`);
    } catch {
      setError("Couldn't export an image,  is there anything on the canvas?");
    } finally {
      setExporting(false);
    }
  };

  const copy = (text: string, which: "link" | "embed") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleExportJson = () => {
    useScopesStore.getState().commitActive();
    const scopes = useScopesStore.getState().scopes;
    if (scopes.every((s) => s.nodes.length === 0)) {
      setError("Build something on the canvas first.");
      return;
    }
    setError(null);
    const circuitName = (active?.name ?? name).trim() || "circuit";
    const scopeIds = new Set(scopes.map((s) => s.id));
    const { blocks } = resolveBlockClosure(
      scopes.flatMap((s) => s.nodes),
      createScopeAwareResolver(),
      (id) => scopeIds.has(id),
    );
    const dataUrl = circuitToJsonDataUrl(circuitName, scopes[0]?.nodes ?? [], scopes[0]?.edges ?? [], blocks, scopes);
    downloadDataUrl(dataUrl, `${circuitName.replace(/\s+/g, "-")}.json`);
  };

  const handleExportVerilog = () => {
    useScopesStore.getState().commitActive();
    const { scopes, activeScopeId } = useScopesStore.getState();
    const activeScope = scopes.find((s) => s.id === activeScopeId) ?? scopes[0];
    if (!activeScope || activeScope.nodes.length === 0) {
      setError("Build something on the canvas first.");
      return;
    }
    setError(null);

    // Verilog needs a fully self-contained netlist - inline every
    // subcircuit/tab instance on this tab first, exactly like the real
    // Play/compile pipeline does (see simulation-store.ts's compile()).
    const flattened = flattenSubcircuits(activeScope.nodes, activeScope.edges, createScopeAwareResolver());
    if (!flattened.ok) {
      setError(flattened.issues[0] ?? "Couldn't resolve this circuit's subcircuits.");
      return;
    }
    const compiled = compileEditorGraph(flattened.nodes, flattened.edges);
    if (!compiled.ok) {
      setError(compiled.issues[0] ?? "This circuit isn't valid yet.");
      return;
    }

    const circuitName = (active?.name ?? name).trim() || "circuit";
    const moduleName = circuitName.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(?=[0-9])/, "_") || "circuit";
    const { verilog, warnings } = generateVerilog(flattened.nodes, compiled.result, moduleName);
    if (warnings.length > 0) setError(warnings[0]);
    downloadDataUrl(`data:text/plain;charset=utf-8,${encodeURIComponent(verilog)}`, `${circuitName.replace(/\s+/g, "-")}.v`);
  };

  const shareUrl = active ? `${window.location.origin}/projects/${active.slug}` : null;
  const embedUrl = active ? `${window.location.origin}/embed/${active.slug}` : null;
  const embedCode = embedUrl
    ? `<iframe src="${embedUrl}" width="800" height="500" style="border:0;border-radius:12px;" allowfullscreen></iframe>`
    : null;

  return (
    <div
      className="w-96 rounded-2xl border border-border bg-surface-card p-5 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="mb-4 font-display text-base font-bold text-ink">Share</h2>

      {user === undefined ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : !user ? (
        <div>
          <p className="text-sm text-ink-soft">Log in to save circuits to your account and share them.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onCloseAction} className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-ink">
              Cancel
            </button>
            <a href="/login" className="rounded-lg bg-copper px-3 py-1.5 text-sm font-semibold text-white hover:bg-copper-dark">
              Log in
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this circuit do?"
              className="resize-y rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-copper"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Who can see it</span>
            <div className="flex flex-col gap-1">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === opt.value}
                    onChange={() => handleVisibilityChange(opt.value)}
                    className="accent-copper"
                  />
                  <span className="text-sm text-ink">{opt.label}</span>
                  <span className="text-xs text-slate">{opt.hint}</span>
                </label>
              ))}
            </div>
          </div>

          {active && shareUrl && embedCode && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface-2/60 p-3">
              <div className="flex items-center gap-2">
                <input readOnly value={shareUrl} className="min-w-0 flex-1 truncate rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-[11px] text-ink-soft" />
                <button type="button" onClick={() => copy(shareUrl, "link")} className="shrink-0 rounded-md border border-border-strong px-2 py-1 font-mono text-[10px] font-semibold text-ink-soft hover:bg-surface-card">
                  {copied === "link" ? "Copied" : "Copy link"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={embedCode} className="min-w-0 flex-1 truncate rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-[11px] text-ink-soft" />
                <button type="button" onClick={() => copy(embedCode, "embed")} className="shrink-0 rounded-md border border-border-strong px-2 py-1 font-mono text-[10px] font-semibold text-ink-soft hover:bg-surface-card">
                  {copied === "embed" ? "Copied" : "Copy embed"}
                </button>
              </div>
              {visibility === "PRIVATE" && (
                <p className="text-[11px] text-signal-coral">Private circuits can&apos;t be opened via link or embed,  switch visibility above first.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={exporting}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              {exporting ? "Exporting…" : "Download as image"}
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Export as JSON
            </button>
            <button
              type="button"
              onClick={handleExportVerilog}
              title="Structural export of the active tab only, with its subcircuits inlined"
              className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              Export as Verilog
            </button>
          </div>

          {error && <p className="text-xs text-signal-coral">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onCloseAction} className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:text-ink">
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="rounded-lg bg-copper px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-copper-dark disabled:opacity-60"
            >
              {saveStatus === "saving" ? "Saving…" : active ? "Save changes" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

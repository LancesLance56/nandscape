import { create } from "zustand";
import { useEditorStore } from "./editor-store";
import { makeScope } from "@/lib/editor/make-scope";
import type { CircuitScope } from "@/types/scope";
import type { SubcircuitNodeData } from "@/types/editor";

export { makeScope };

export interface ScopesState {
  scopes: CircuitScope[];
  activeScopeId: string;

  /** Replaces the whole scope list (project load, sandbox restore, import).
   *  Always leaves at least one scope - callers that have nothing yet
   *  should pass a single freshly-made "Main" scope, not []. Also pushes
   *  the active scope's content into editor-store, exactly like the load
   *  effects that already call editor-store.loadGraph() directly. */
  loadScopes: (scopes: CircuitScope[], activeScopeId?: string) => void;
  /** Writes editor-store's current (live) nodes/edges back into the scopes
   *  array entry for whichever scope is active, WITHOUT switching anything.
   *  Every other action below that reads "all scopes" (switching away,
   *  deleting, autosaving, saving/exporting, compiling) calls this first -
   *  editor-store is the single live source of truth for whatever's on
   *  screen, and this is the one place that reconciles it back. */
  commitActive: () => void;
  switchTo: (scopeId: string) => void;
  addScope: (name?: string) => string;
  renameScope: (id: string, name: string) => void;
  /** Refuses to delete the last remaining scope, or one still referenced by
   *  a subcircuit node in ANY scope (including the active one's live,
   *  uncommitted content) - mirrors CircuitVerse's own "can't delete a
   *  scope something still depends on" dependency-graph check. Returns an
   *  error string on refusal, undefined on success. */
  deleteScope: (id: string) => string | undefined;
  resolveScope: (id: string) => CircuitScope | undefined;
}

export const useScopesStore = create<ScopesState>((set, get) => ({
  scopes: [],
  activeScopeId: "",

  loadScopes: (scopes, activeScopeId) => {
    const active = scopes.find((s) => s.id === activeScopeId) ?? scopes[0];
    set({ scopes, activeScopeId: active?.id ?? "" });
    useEditorStore.getState().loadGraph(active?.nodes ?? [], active?.edges ?? []);
  },

  commitActive: () => {
    const { scopes, activeScopeId } = get();
    const { nodes, edges } = useEditorStore.getState();
    set({ scopes: scopes.map((s) => (s.id === activeScopeId ? { ...s, nodes, edges } : s)) });
  },

  switchTo: (scopeId) => {
    get().commitActive();
    const target = get().scopes.find((s) => s.id === scopeId);
    if (!target) return;
    set({ activeScopeId: scopeId });
    useEditorStore.getState().loadGraph(target.nodes, target.edges);
  },

  addScope: (name) => {
    get().commitActive();
    const scope = makeScope(name?.trim() || `Circuit ${get().scopes.length + 1}`);
    set((state) => ({ scopes: [...state.scopes, scope], activeScopeId: scope.id }));
    useEditorStore.getState().loadGraph(scope.nodes, scope.edges);
    return scope.id;
  },

  renameScope: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({ scopes: state.scopes.map((s) => (s.id === id ? { ...s, name: trimmed } : s)) }));
  },

  deleteScope: (id) => {
    get().commitActive();
    const { scopes } = get();
    if (scopes.length <= 1) return "A project needs at least one circuit.";

    const dependents = scopes.filter((s) =>
      s.nodes.some((n) => n.data.kind === "subcircuit" && (n.data as SubcircuitNodeData).circuitId === id),
    );
    if (dependents.length > 0) {
      return `"${dependents.map((s) => s.name).join('", "')}" still use${dependents.length === 1 ? "s" : ""} this as a subcircuit - remove those instances first.`;
    }

    const remaining = scopes.filter((s) => s.id !== id);
    const wasActive = get().activeScopeId === id;
    const nextActive = wasActive ? remaining[0] : remaining.find((s) => s.id === get().activeScopeId);
    set({ scopes: remaining, activeScopeId: nextActive?.id ?? remaining[0].id });
    if (wasActive) useEditorStore.getState().loadGraph(remaining[0].nodes, remaining[0].edges);
    return undefined;
  },

  resolveScope: (id) => get().scopes.find((s) => s.id === id),
}));

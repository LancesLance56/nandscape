import type { EditorNode, EditorEdge } from "@/types/editor";

/**
 * In-app clipboard: a plain module-level variable, not a store. Nothing
 * needs to react to it changing (no component renders "what's on the
 * clipboard"), it's write-once-read-later imperative state read exactly
 * once, by clipboard.paste's execute() - a Zustand store here would just be
 * ceremony around a value nothing subscribes to. Doesn't touch the real OS
 * clipboard (navigator.clipboard): that would need permissions/HTTPS and
 * buys nothing for an in-app-only paste target.
 */
let clipboard: { nodes: EditorNode[]; edges: EditorEdge[] } | null = null;

export function setClipboard(nodes: EditorNode[], edges: EditorEdge[]): void {
  clipboard = { nodes, edges };
}

export function getClipboard(): { nodes: EditorNode[]; edges: EditorEdge[] } | null {
  return clipboard;
}

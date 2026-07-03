/**
 * shortcut-registry.ts
 * ---------------------------------------------------------------------------
 * Maps a normalized key combo string ("mod+z", "delete", "shift+mod+z") to
 * a command id. Kept separate from the actual DOM event listener
 * (hooks/use-keyboard-shortcuts.ts) so shortcuts can be introspected —
 * e.g. a future "Keyboard Shortcuts" dialog can just render this table.
 *
 * "mod" abstracts Cmd on macOS vs Ctrl elsewhere; normalizeKeyEvent below
 * resolves it per-platform at handling time.
 */

export interface ShortcutBinding {
  combo: string;
  commandId: string;
  /** Set false to register a binding without it appearing in shortcut help UI (rare). */
  visible?: boolean;
}

export class ShortcutRegistry {
  private bindings = new Map<string, ShortcutBinding>();

  register(binding: ShortcutBinding): void {
    this.bindings.set(binding.combo, binding);
  }

  registerAll(bindings: ShortcutBinding[]): void {
    for (const binding of bindings) this.register(binding);
  }

  resolve(combo: string): ShortcutBinding | undefined {
    return this.bindings.get(combo);
  }

  list(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }
}

export const shortcutRegistry = new ShortcutRegistry();

/** Turns a KeyboardEvent into the same combo-string shape used by ShortcutBinding.combo. */
export function normalizeKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const modPressed = isMac ? event.metaKey : event.ctrlKey;

  if (modPressed) parts.push("mod");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (!["control", "meta", "shift", "alt"].includes(key)) {
    parts.push(key === " " ? "space" : key);
  }

  return parts.join("+");
}

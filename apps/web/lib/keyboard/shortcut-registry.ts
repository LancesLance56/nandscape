export interface ShortcutBinding {
  combo: string;
  commandId: string;
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

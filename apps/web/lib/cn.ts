/**
 * Minimal classname joiner. No dependency on clsx/tailwind-merge so this
 * drops into any project as-is.
 *
 * If you already have a `cn` helper (e.g. from shadcn's `@/lib/utils`),
 * delete this file and repoint the imports in the widget/block files below
 * at that one instead — the call signature (variadic strings/falsy values)
 * is compatible.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

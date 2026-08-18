import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The single class-name joiner for the app.
 *
 * tailwind-merge is the part that matters. Without it, passing two conflicting
 * utilities (say `bg-surface` and `bg-copper`) leaves both in the class list
 * and the browser picks by stylesheet order rather than by the order they were
 * written, which has already caused at least one "why is this cell the wrong
 * colour" bug. With it, the last one written wins, which is what every caller
 * assumes anyway.
 *
 * shadcn generates components importing `@/lib/utils`; components.json points
 * that alias here so there is one implementation rather than two.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

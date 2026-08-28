import { gateTypeToString } from "@nandscape/engine";
import { cn } from "@/lib/cn";
import type { PuzzleSpec } from "@/types/puzzle";

/**
 * A logic problem drawn as the chip it asks you to build.
 *
 * Every puzzle on the site is the same shape of question: here are the pins,
 * here is what you are allowed to use - now fill in the package. A list of
 * titles and difficulty badges says none of that, so this draws the package
 * instead: named pins down both sides, and the part name and its budget on
 * the lid. Nothing else. What the chip has to *do* is the puzzle page's job;
 * the tile only has to say which chip it is and what you may build it from.
 *
 * Rendering is pure markup: no client JavaScript, no canvas, so a grid of
 * these costs nothing.
 */

/** Pins beyond this are summarised, so a wide bus does not stretch the chip. */
const MAX_PINS = 5;

/** The gate restriction, in the words the puzzle page uses. */
function restriction(puzzle: PuzzleSpec): string | null {
  if (puzzle.allowedGateTypes?.length) return `${puzzle.allowedGateTypes.map(gateTypeToString).join("/")} only`;
  if (puzzle.disallowedGateTypes?.length) return `no ${puzzle.disallowedGateTypes.map(gateTypeToString).join("/")}`;
  return null;
}

function Pin({ name, side }: { name: string; side: "in" | "out" }) {
  const label = (
    <span className="min-w-0 truncate font-mono text-[9px] leading-none text-slate">{name}</span>
  );
  const wire = (
    <span
      aria-hidden
      className="h-px w-3 shrink-0 bg-border-strong transition-colors duration-300 group-hover/chip:bg-copper/70"
    />
  );
  const pad = (
    <span
      aria-hidden
      className="h-2 w-1 shrink-0 rounded-[1px] bg-border-strong transition-colors duration-300 group-hover/chip:bg-copper"
    />
  );

  return (
    <span className={cn("flex items-center gap-1", side === "in" ? "justify-end" : "flex-row-reverse justify-end")}>
      {label}
      {wire}
      {pad}
    </span>
  );
}

function PinColumn({ ports, side }: { ports: { name: string }[]; side: "in" | "out" }) {
  const shown = ports.slice(0, MAX_PINS);
  const rest = ports.length - shown.length;

  return (
    <span className={cn("flex w-12 flex-col justify-around gap-1 py-3", side === "out" && "items-start")}>
      {shown.map((port) => (
        <Pin key={port.name} name={port.name} side={side} />
      ))}
      {rest > 0 && (
        <span className={cn("font-mono text-[9px] leading-none text-slate/70", side === "in" && "text-right")}>
          +{rest}
        </span>
      )}
    </span>
  );
}

export function PuzzleChip({ puzzle, className }: { puzzle: PuzzleSpec; className?: string }) {
  const limit = restriction(puzzle);
  const budget = puzzle.gateBudget !== null ? `${puzzle.gateBudget} gates` : "any size";

  return (
    <div className={cn("group/chip flex items-stretch", className)}>
      <PinColumn ports={puzzle.inputs} side="in" />

      {/* The package. */}
      <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg border border-border-strong bg-gradient-to-b from-surface-2 to-surface-3 px-3 py-4 text-center transition-colors duration-300 group-hover/chip:border-copper/50">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{puzzle.title}</h3>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate">
          &le;{budget}
          {limit ? ` · ${limit}` : ""}
        </p>
      </div>

      <PinColumn ports={puzzle.outputs} side="out" />
    </div>
  );
}

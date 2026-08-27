import { cn } from "@/lib/cn";

export function DividerBlockView({ block }: { block?: { className?: string } } = {}) {
  return (
    <hr className={cn("h-px border-0 bg-linear-to-r from-transparent via-border to-transparent", block?.className)} />
  );
}

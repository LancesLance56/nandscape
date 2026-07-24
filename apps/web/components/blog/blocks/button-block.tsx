import { safeHref } from "@/lib/blog/safe-href";
import type { ButtonBlock } from "@/types/blog";

export function ButtonBlockView({ block }: { block: ButtonBlock }) {
  const href = safeHref(block.href);
  const isExternal = !href.startsWith("/") && !href.startsWith("#");

  const styleClass =
    block.style === "secondary"
      ? "border border-border-strong bg-surface-card text-ink hover:bg-surface-2"
      : "bg-copper text-white hover:bg-copper-dark";

  return (
    <div className="my-2">
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.97] ${styleClass}`}
      >
        {block.label}
      </a>
    </div>
  );
}

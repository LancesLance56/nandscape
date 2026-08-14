import Link from "next/link";
import type { ReactNode } from "react";

const BASE = "rounded-2xl border border-border bg-surface-card shadow-sm transition-all duration-200";
const INTERACTIVE =
  "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:translate-y-0 active:scale-[0.99]";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${BASE} ${className}`}>{children}</div>;
}

export function CardLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`group block ${BASE} ${INTERACTIVE} ${className}`}>
      {children}
    </Link>
  );
}

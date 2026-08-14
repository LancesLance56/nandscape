import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function AdminBreadcrumb({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate">
      <Link href="/" className="transition-colors hover:text-copper-dark">
        Nandscape
      </Link>
      <span>/</span>
      <Link href="/admin" className="transition-colors hover:text-copper-dark">
        Admin
      </Link>
      {trail.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-copper-dark">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-soft">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TutorialNavTree } from "@/types/tutorial";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-copper-bg font-semibold text-copper-dark" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

export function TutorialSidebar({ tree }: { tree: TutorialNavTree }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <nav className="sticky top-32 flex h-fit w-64 shrink-0 flex-col gap-1 overflow-y-auto px-3 py-4">
      {tree.standalone.map((page) => (
        <NavLink key={page.slug} href={`/tutorials/${page.slug}`} label={page.title} />
      ))}

      {tree.sections.map((section) => {
        const open = !collapsed.has(section.id);
        return (
          <div key={section.id} className="mt-2">
            <button
              type="button"
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-slate hover:text-ink"
            >
              {section.title}
              <ChevronIcon open={open} />
            </button>
            {open && (
              <div className="mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                {section.pages.map((page) => (
                  <NavLink key={page.slug} href={`/tutorials/${page.slug}`} label={page.title} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
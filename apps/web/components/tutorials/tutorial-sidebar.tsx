"use client";

import { useEffect, useState } from "react";
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
  // Below lg the sidebar collapses into a toggleable panel instead of its
  // own sticky column - there's no room for both a 256px rail and readable
  // tutorial text on a phone-width screen. Closed by default there; the
  // lg+ nav below ignores this state entirely (always visible, see the
  // className below).
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggle = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <div className="lg:mr-4">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-semibold text-ink lg:hidden"
      >
        Contents
        <ChevronIcon open={mobileOpen} />
      </button>

      {/* The lg max-height is what makes this rail scroll on its own. A
          sticky element taller than the viewport can't stay put - the browser
          drags it along with the page until its bottom edge arrives - so the
          height is capped to the space below `top-32` and overflow-y-auto
          takes over from there. */}
      <nav
        className={`${mobileOpen ? "flex" : "hidden"} mt-2 max-h-[60vh] w-full flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-card px-3 py-3 lg:sticky lg:top-32 lg:mt-0 lg:flex lg:h-fit lg:max-h-[calc(100vh-9rem)] lg:w-64 lg:shrink-0 lg:border-0 lg:bg-transparent lg:px-3 lg:py-4`}
      >
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
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold text-slate hover:text-ink"
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
    </div>
  );
}
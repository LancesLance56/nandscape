"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToolbarButton } from "./toolbar-button";
import { Menu } from "lucide-react";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Practice", href: "/puzzles" },
  { label: "Logic Editor", href: "/logic-editor" },
  { label: "Blog", href: "/blog" },
];

/**
 * The editor's toolbar previously had no way to reach anything but Home
 * (via the logo). This is the same link set as the marketing navbar, just
 * tucked into a dropdown so it doesn't compete with the editor controls.
 */
export function SiteNavMenu() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ left: rect.left, top: rect.bottom + 6 });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className="relative">
      <ToolbarButton icon={<Menu className="h-4 w-4" />} label="Site navigation" active={open} onClick={() => setOpen((o) => !o)} />

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: coords.left, top: coords.top, zIndex: 999 }}
            className="w-52 rounded-xl border border-border bg-surface-card py-1.5 shadow-[0_16px_40px_rgba(21,27,24,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          >
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-2 ${
                    active ? "text-copper-dark" : "text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

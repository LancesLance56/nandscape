"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import {
  BookOpen,
  Braces,
  ChevronDown,
  CircuitBoard,
  Cpu,
  FolderKanban,
  Menu,
  Users,
  Workflow,
  Wrench,
  X,
} from "lucide-react";

import { LogoLockup } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/auth-status";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

type NavEntry =
  | { kind: "link"; item: NavItem }
  | { kind: "group"; label: string; items: NavItem[] };

const TUTORIALS: NavItem = {
  label: "Tutorials",
  href: "/tutorials",
  description: "Lessons from logic gates to algorithms",
  icon: BookOpen,
};
const TOOLS: NavItem = {
  label: "Tools",
  href: "/tools",
  description: "K-map solver, base converter, truth tables",
  icon: Wrench,
};
const COMMUNITY: NavItem = {
  label: "Community",
  href: "/community",
  description: "Discussion, shared circuits and rankings",
  icon: Users,
};

// Eight destinations are too many for one row at tablet widths, so the two
// families that belong together sit behind a group: the problem sets (named
// for what you build in each - gates on one, functions on the other; both use
// components/problems) and the editors. "Home" is intentionally omitted: the
// logo already links there.
const PRACTICE: NavItem[] = [
  {
    label: "Logic Problems",
    href: "/puzzles",
    description: "Wire real gates to meet a spec",
    icon: Cpu,
  },
  {
    label: "Coding Problems",
    href: "/practices",
    description: "Write a function, submit for hidden tests",
    icon: Braces,
  },
];
const BUILD: NavItem[] = [
  {
    label: "Logic Editor",
    href: "/logic-editor",
    description: "Design and simulate circuits",
    icon: CircuitBoard,
  },
  {
    label: "Flowcharts",
    href: "/flowchart",
    description: "Draw algorithm diagrams",
    icon: Workflow,
  },
  {
    label: "Projects",
    href: "/projects",
    description: "Circuits you and others have built",
    icon: FolderKanban,
  },
];

const NAV: NavEntry[] = [
  { kind: "link", item: TUTORIALS },
  { kind: "group", label: "Practice", items: PRACTICE },
  { kind: "group", label: "Build", items: BUILD },
  { kind: "link", item: TOOLS },
  { kind: "link", item: COMMUNITY },
];

// The mobile menu has room for headings, so every entry gets one.
const MOBILE_SECTIONS: { label: string; items: NavItem[] }[] = [
  { label: "Learn", items: [TUTORIALS, TOOLS] },
  { label: "Practice", items: PRACTICE },
  { label: "Build", items: BUILD },
  { label: "Connect", items: [COMMUNITY] },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();

  // Both menus remember the path they were opened on, and count as open only
  // while that is still the current path - so any navigation closes them
  // without an effect that sets state after the fact.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileOpen = menuPath === pathname;
  const [group, setGroup] = useState<{ label: string; path: string } | null>(null);
  const openGroup = group?.path === pathname ? group.label : null;

  const setOpenGroup = (label: string | null) =>
    setGroup(label ? { label, path: pathname } : null);

  const navRef = useRef<HTMLElement>(null);

  // Escape closes whichever menu is open; a press outside the bar closes a
  // dropdown.
  useEffect(() => {
    if (!mobileOpen && !openGroup) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuPath(null);
      setGroup(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (navRef.current?.contains(event.target as Node)) return;
      setGroup(null);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mobileOpen, openGroup]);

  // The mobile menu covers the page, so the page must not scroll under it.
  // Rotating an iPad into the desktop layout hides the menu, so close it
  // then too rather than leave the scroll lock behind.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (desktop.matches) setMenuPath(null);
    };
    desktop.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [mobileOpen]);

  return (
    <header
      ref={navRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-md"
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 w-full max-w-330 items-center gap-6 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10"
      >
        {/* From lg the bar is three columns - logo, links, actions - with the
            outer two sharing the leftover width equally, so the links sit on
            the true centre line of the page rather than wherever the logo's
            width happens to push them. */}
        <Link href="/" className="flex shrink-0 items-center justify-self-start rounded-md">
          <LogoLockup className="h-9 w-auto shrink-0 text-ink" />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((entry) =>
            entry.kind === "link" ? (
              <li key={entry.item.href}>
                <TopLink item={entry.item} active={isActive(pathname, entry.item.href)} />
              </li>
            ) : (
              <li key={entry.label}>
                <NavGroup
                  label={entry.label}
                  items={entry.items}
                  pathname={pathname}
                  open={openGroup === entry.label}
                  onOpenChange={(open) => setOpenGroup(open ? entry.label : null)}
                />
              </li>
            ),
          )}
        </ul>

        <div className="ml-auto flex items-center gap-3 justify-self-end sm:gap-4 lg:ml-0">
          <ThemeToggle />
          {/* AuthStatus hides its logged-out Log in / Start solving buttons
              below md; the mobile menu carries them there instead. A
              logged-in avatar shows at every width. */}
          <AuthStatus />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuPath(mobileOpen ? null : pathname)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border-strong text-ink transition-colors hover:bg-surface-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-20 bottom-0 overflow-y-auto overscroll-contain border-t border-border bg-surface lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8">
            {MOBILE_SECTIONS.map((section) => (
              <section key={section.label}>
                <h2 className="mb-2 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                  {section.label}
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <ItemCard item={item} active={isActive(pathname, item.href)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {/* Log in / Start solving for the widths where the bar hides
                them. Renders nothing for a signed-in reader. */}
            <div className="md:hidden">
              <AuthStatus variant="menu" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-soft hover:bg-surface-2 hover:text-ink",
        active && "after:absolute after:inset-x-3 after:-bottom-[19px] after:h-0.5 after:bg-copper",
      )}
    >
      {item.label}
    </Link>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  open,
  onOpenChange,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const panelId = useId();
  const active = items.some((item) => isActive(pathname, item.href));
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  // Hover opens for a mouse only. A tap on an iPad fires pointerenter just
  // before the click, and opening on both would toggle the panel shut again.
  return (
    <div
      className="relative"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        onOpenChange(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        closeTimer.current = window.setTimeout(() => onOpenChange(false), 140);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "relative flex h-10 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors",
          active || open ? "text-ink" : "text-ink-soft hover:text-ink",
          open ? "bg-surface-2" : "hover:bg-surface-2",
          active && "after:absolute after:inset-x-3 after:-bottom-[19px] after:h-0.5 after:bg-copper",
        )}
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        // pt-3 is a bridge: the pointer crosses it on the way down without
        // leaving the group and closing the panel.
        <div id={panelId} className="absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3">
          <ul className="w-[22rem] rounded-xl border border-border bg-surface-card p-2 shadow-(--shadow-lift)">
            {items.map((item) => (
              <li key={item.href}>
                <ItemCard
                  item={item}
                  active={isActive(pathname, item.href)}
                  onNavigate={() => onOpenChange(false)}
                  bare
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** An icon, a label and one line saying what is there. Used by both menus. */
function ItemCard({
  item,
  active,
  onNavigate,
  bare = false,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  /** Inside a dropdown the panel is the card, so rows drop their border. */
  bare?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-start gap-3 rounded-lg p-3 transition-colors",
        !bare && "border bg-surface-card",
        active
          ? cn("bg-copper-bg", !bare && "border-copper/40")
          : cn("hover:bg-surface-2", !bare && "border-border"),
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
          active ? "bg-copper text-copper-ink" : "bg-copper-bg text-copper group-hover:bg-copper group-hover:text-copper-ink",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{item.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate">{item.description}</span>
      </span>
    </Link>
  );
}

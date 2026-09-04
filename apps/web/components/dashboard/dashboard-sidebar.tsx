"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronsUpDown,
  CircuitBoard,
  Database,
  FileText,
  Gauge,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  Puzzle,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Star,
  TrendingUp,
  User as UserIcon,
  Users,
  Workflow, Code2} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { isActive } from "./nav";
import { cn } from "@/lib/cn";

/**
 * The dashboard's left rail.
 *
 * Structurally this is Watermelon's agndex sidebar - the same grouped menu, the
 * same footer account switcher, the same "logo, then a badge naming the area"
 * header. Three things changed, and each had to:
 *
 * 1. Its navigation was a module-level constant of mock links. Here the tree
 *    arrives as a prop, so one component serves both the reader's dashboard and
 *    the admin's.
 * 2. Its `DashboardLink` drove a fake in-memory router, because a registry
 *    block cannot assume yours. These are real `next/link`s reading a real
 *    `usePathname`.
 * 3. Its footer showed a hard-coded person (name, email, dicebear avatar) and a
 *    Logout button wired to nothing. This one shows the signed-in user and
 *    posts to the real session endpoint.
 */

/**
 * Icons cross the server/client boundary as names, not components.
 *
 * The nav trees are built in server components, and a Lucide icon is a
 * function - React cannot serialise one into a client component's props. So the
 * server names an icon and this record resolves it, which also keeps the icon
 * vocabulary of the dashboard to a list you can read in one place.
 */
const ICONS = {
  analytics: BarChart3,
  back: ArrowLeft,
  circuits: CircuitBoard,
  code: Code2,
  database: Database,
  diagrams: Workflow,
  featured: Star,
  overview: Gauge,
  posts: FileText,
  preferences: Sliders,
  profile: UserIcon,
  progress: TrendingUp,
  puzzles: Puzzle,
  security: Shield,
  settings: Settings,
  sparkles: Sparkles,
  tracks: LayoutGrid,
  tutorials: BookOpen,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type DashboardIconName = keyof typeof ICONS;

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: DashboardIconName;
  badge?: string | number;
  external?: boolean;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export interface DashboardUser {
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}

export interface DashboardSidebarProps {
  /** Shown beside the mark, e.g. "Admin" or "Your account". */
  areaLabel: string;
  /** The section root, so its own row does not stay lit on every child page. */
  areaRoot: string;
  groups: SidebarNavGroup[];
  user: DashboardUser;
}

/**
 * `h-auto` because the variant's default size pins the row to `h-8`, which is
 * too tight for this type scale. Everything else here overrides a variant
 * default; `cn` runs the result through tailwind-merge, so last wins.
 */
const ROW_CLASS =
  "h-auto gap-2.5 rounded-lg px-3 py-2 text-xsm tracking-tight text-(--sidebar-muted-foreground) transition-colors " +
  "hover:text-ink aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium " +
  "aria-[current=page]:text-sidebar-accent-foreground";

function NavRow({ item, areaRoot }: { item: SidebarNavItem; areaRoot: string }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = ICONS[item.icon];
  const active = !item.external && isActive(pathname, item.href, areaRoot);

  return (
    // `render`, not a nested <Link>. SidebarMenuButton is the flex row that
    // lays the icon out beside the label - put a link *inside* it and the link
    // is an ordinary block child, so the icon and the text stack. (It also
    // emitted a <button> wrapping an <a>, which is invalid.) base-ui's
    // useRender merges the button's props and classes onto the anchor instead,
    // so the anchor *is* the row.
    <SidebarMenuButton
      render={<Link href={item.href} />}
      aria-current={active ? "page" : undefined}
      // A tap on mobile navigates *and* closes the drawer; leaving it open
      // would cover the page it just took you to.
      onClick={() => isMobile && setOpenMobile(false)}
      className={ROW_CLASS}
    >
      <Icon />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span className="text-xxs tabular-nums text-slate">{item.badge}</span>
      )}
    </SidebarMenuButton>
  );
}

export function DashboardSidebar({ areaLabel, areaRoot, groups, user }: DashboardSidebarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const initials = (user.name ?? user.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Hard navigation rather than router.push: every cached server component
      // above this one was rendered for a signed-in reader.
      window.location.href = "/";
    } catch {
      setSigningOut(false);
      router.refresh();
    }
  }

  return (
    <Sidebar className="h-full border-none">
      <SidebarHeader className="flex-row items-center justify-between gap-2 px-4 pt-6 pb-0">
        <Link href="/" className="flex items-center gap-2">
          <CircuitBoard className="size-5 text-copper" />
          <span className="font-display text-lg font-bold tracking-tight text-ink">Nandscape</span>
        </Link>
        <span className="rounded-md bg-(--sidebar-badge) px-2 py-1.5 text-xxs text-ink-soft">
          {areaLabel}
        </span>
      </SidebarHeader>

      <SidebarContent className="mt-8 gap-7 px-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="mb-1 h-auto px-0 py-2 text-xxs font-medium tracking-wide text-(--sidebar-muted) uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavRow item={item} areaRoot={areaRoot} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 pb-6">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />} className={ROW_CLASS}>
              <ArrowLeft />
              <span className="flex-1">Back to site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className={cn(
                "h-auto gap-2.5 rounded-lg px-3 py-2 text-xsm tracking-tight text-(--sidebar-muted-foreground)",
                "hover:bg-signal-coral-bg hover:text-signal-coral-strong",
                "active:bg-signal-coral-bg active:text-signal-coral-strong",
              )}
            >
              <LogOut className="-rotate-90" />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="peer/menu-button flex h-auto w-full items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2 text-left text-xsm tracking-tight outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent [&>svg]:size-4 [&>svg]:shrink-0">
                <Avatar size="sm">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {user.name ?? user.username}
                </span>
                <ChevronsUpDown className="text-slate" />
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-ink">
                        {user.name ?? user.username}
                      </p>
                      <p className="truncate text-xs text-slate">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/account/settings" />}>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/settings/security" />}>
                  <Shield />
                  Security
                </DropdownMenuItem>
                {/* Only an admin sees the way into the admin area, and the
                    server enforces the same rule - this is a convenience, not
                    the access control. */}
                {user.role === "ADMIN" && (
                  <DropdownMenuItem render={<Link href="/admin" />}>
                    <BarChart3 />
                    Admin dashboard
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

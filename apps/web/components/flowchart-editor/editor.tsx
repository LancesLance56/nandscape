"use client";

/**
 * The application shell.
 *
 * Ribbon across the top, a narrow rail and the SmartPanel down the left, the
 * page and its tabs in the middle, the zoom control bottom-right. That is
 * SmartDraw's arrangement, and it is worth copying exactly: the panel is where
 * you *get* things, the ribbon is where you *change* things, and keeping those
 * two jobs on different edges of the window is why either can be scanned.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Database,
  HelpCircle,
  List,
  Map,
  Moon,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Logo } from "@/components/icons";
import { emptyDoc } from "@/lib/flowchart-editor/model";
import { isDoc } from "@/lib/flowchart-editor/export";
import { useEditor } from "@/lib/flowchart-editor/store";
import { TEMPLATES } from "@/lib/flowchart-editor/templates";
import { Canvas } from "./canvas";
import { Ribbon } from "./ribbon";
import { SmartPanel } from "./panel";
import { Menu, MenuItem, MenuLabel, useDismiss } from "./ui";
import { HelpDrawer } from "./help";

const DRAFT_KEY = "nandscape:flowchart-editor-doc";
const SAVE_DEBOUNCE_MS = 600;

export function FlowchartEditor() {
  const [help, setHelp] = useState(false);
  useAutosave();

  return (
    <div className="fe-root flex h-dvh flex-col overflow-hidden bg-fe-shell text-fe-ink">
      <Ribbon />
      <div className="flex min-h-0 flex-1">
        <Rail onHelp={() => setHelp(true)} />
        <SmartPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          <PageTabs />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <Canvas />
            <ZoomBar />
          </div>
        </main>
      </div>
      {help && <HelpDrawer onClose={() => setHelp(false)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Rail
 * ---------------------------------------------------------------------- */

function Rail({ onHelp }: { onHelp: () => void }) {
  const [open, setOpen] = useState<"templates" | null>(null);
  const ref = useDismiss(open !== null, () => setOpen(null));
  const replaceDoc = useEditor((s) => s.replaceDoc);
  const setTitle = useEditor((s) => s.setTitle);

  return (
    <nav className="flex w-[50px] shrink-0 flex-col items-center gap-1 border-r border-fe-line bg-fe-panel py-2">
      <Link
        href="/"
        title="Back to Nandscape"
        className="flex h-8 w-8 items-center justify-center rounded text-fe-icon hover:bg-fe-hover"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
      </Link>
      <Link
        href="/"
        title="Nandscape"
        className="flex h-8 w-8 items-center justify-center rounded text-fe-icon hover:bg-fe-hover"
      >
        <Logo className="h-4.5 w-4.5" />
      </Link>

      <div ref={ref} className="relative">
        <RailButton icon={<Briefcase className="h-4.5 w-4.5" />} label="Templates" onClick={() => setOpen(open ? null : "templates")} />
        {open === "templates" && (
          <Menu className="left-full top-0 ml-1 w-56">
            <MenuLabel>Start from</MenuLabel>
            {TEMPLATES.map((t) => (
              <MenuItem
                key={t.name}
                onClick={() => {
                  replaceDoc(t.build());
                  setTitle(t.name);
                  setOpen(null);
                }}
              >
                {t.name}
              </MenuItem>
            ))}
          </Menu>
        )}
      </div>

      <RailButton
        icon={<Plus className="h-4.5 w-4.5" />}
        label="New drawing"
        onClick={() => {
          if (confirm("Start a new drawing? The current one will be replaced.")) replaceDoc(emptyDoc());
        }}
      />
      <RailButton
        icon={<Database className="h-4.5 w-4.5" />}
        label="Open a .json drawing"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json,.json";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const parsed: unknown = JSON.parse(await file.text());
              if (isDoc(parsed)) replaceDoc(parsed);
              else alert("That file is not a drawing this editor wrote.");
            } catch {
              alert("That file could not be read as JSON.");
            }
          };
          input.click();
        }}
      />

      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeButton />
        <RailButton icon={<HelpCircle className="h-4.5 w-4.5" />} label="Help and shortcuts" onClick={onHelp} />
      </div>
    </nav>
  );
}

/**
 * The site's theme switch is a 56px pill built for a navbar; the rail is 50px
 * wide. Same behaviour, rail-sized.
 *
 * Which icon shows is decided by CSS from the `.dark` class rather than by a
 * mounted flag, so it is right on the very first paint - next-themes sets that
 * class in a blocking script - and there is no server/client mismatch to guard
 * against.
 */
function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <RailButton
      icon={
        <>
          <Moon className="h-4.5 w-4.5 dark:hidden" />
          <Sun className="hidden h-4.5 w-4.5 dark:block" />
        </>
      }
      label="Switch between light and dark"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    />
  );
}

function RailButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded text-fe-icon hover:bg-fe-hover"
    >
      {icon}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Page tabs
 * ---------------------------------------------------------------------- */

function PageTabs() {
  const doc = useEditor((s) => s.doc);
  const index = useEditor((s) => s.pageIndex);
  const goto = useEditor((s) => s.gotoPage);
  const addPage = useEditor((s) => s.addPage);
  const removePage = useEditor((s) => s.removePage);
  const renamePage = useEditor((s) => s.renamePage);
  const setTitle = useEditor((s) => s.setTitle);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const listRef = useDismiss(listOpen, () => setListOpen(false));

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-fe-line bg-fe-panel px-1.5 py-1">
      <div ref={listRef} className="relative">
        <button
          type="button"
          title="All pages"
          onClick={() => setListOpen((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <List className="h-4 w-4" />
        </button>
        {listOpen && (
          <Menu>
            <MenuLabel>Pages</MenuLabel>
            {doc.pages.map((p, i) => (
              <MenuItem key={p.id} active={i === index} onClick={() => { goto(i); setListOpen(false); }}>
                {p.name}
              </MenuItem>
            ))}
          </Menu>
        )}
      </div>

      <button
        type="button"
        aria-label="Previous page"
        disabled={index === 0}
        onClick={() => goto(index - 1)}
        className="flex h-6 w-6 items-center justify-center rounded text-fe-muted enabled:hover:bg-fe-hover disabled:text-fe-disabled"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next page"
        disabled={index >= doc.pages.length - 1}
        onClick={() => goto(index + 1)}
        className="flex h-6 w-6 items-center justify-center rounded text-fe-muted enabled:hover:bg-fe-hover disabled:text-fe-disabled"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="flex items-end gap-0.5">
        {doc.pages.map((p, i) =>
          renaming === i ? (
            <input
              key={p.id}
              autoFocus
              defaultValue={p.name}
              onBlur={(e) => {
                renamePage(i, e.target.value.trim() || p.name);
                setRenaming(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setRenaming(null);
              }}
              className="h-6 w-28 rounded-t border border-fe-line bg-fe-field px-2 text-[11px] outline-none"
            />
          ) : (
            <button
              key={p.id}
              type="button"
              onClick={() => goto(i)}
              onDoubleClick={() => setRenaming(i)}
              title={`${p.name} — double-click to rename`}
              className={cn(
                "group relative flex h-6 min-w-24 items-center justify-center gap-1 rounded-t border border-b-0 px-3 text-[11px] transition-colors",
                i === index
                  ? "border-fe-line bg-fe-canvas font-medium text-fe-ink"
                  : "border-transparent text-fe-muted hover:bg-fe-hover",
              )}
            >
              {p.name}
              {doc.pages.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Delete ${p.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(i);
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              )}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        aria-label="Add a page"
        title="Add a page"
        onClick={addPage}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
      >
        <Plus className="h-4 w-4" />
      </button>

      <input
        value={doc.title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Drawing title"
        placeholder="Untitled drawing"
        className="ml-auto h-6 w-56 rounded border border-transparent bg-transparent px-2 text-[11px] font-medium text-fe-ink outline-none hover:border-fe-line focus:border-fe-accent"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Zoom
 * ---------------------------------------------------------------------- */

function ZoomBar() {
  const viewport = useEditor((s) => s.viewport);
  const zoomTo = useEditor((s) => s.zoomTo);
  const setViewport = useEditor((s) => s.setViewport);
  const page = useEditor((s) => s.doc.pages[s.pageIndex]);

  const fit = () => {
    const host = document.querySelector<HTMLElement>(".fe-root main");
    if (!host) return;
    const w = host.clientWidth - 64;
    const h = host.clientHeight - 96;
    const zoom = Math.max(0.1, Math.min(2, Math.min(w / page.width, h / page.height)));
    setViewport({ zoom, x: (w + 64 - page.width * zoom) / 2, y: 24 });
  };

  return (
    <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded border border-fe-line bg-fe-panel/95 px-2 py-1 shadow-sm backdrop-blur-sm">
        <input
          type="range"
          min={10}
          max={400}
          step={5}
          value={Math.round(viewport.zoom * 100)}
          onChange={(e) => zoomTo(Number(e.target.value) / 100)}
          aria-label="Zoom"
          className="h-1 w-32 cursor-pointer accent-[var(--fe-accent)]"
        />
        <button
          type="button"
          onClick={() => zoomTo(1)}
          title="Reset to 100%"
          className="w-11 text-right text-[11px] tabular-nums text-fe-ink hover:underline"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={fit}
          title="Fit the page in the window"
          className="flex h-5 w-5 items-center justify-center rounded text-fe-muted hover:bg-fe-hover hover:text-fe-ink"
        >
          <Map className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Autosave
 * ---------------------------------------------------------------------- */

/**
 * The drawing is kept in this browser as you work.
 *
 * There is no account and no save button, so a refresh used to cost everything
 * on the page. Restoring happens in an effect rather than in the store's
 * initial state so the server and the first client render agree.
 */
function useAutosave() {
  const doc = useEditor((s) => s.doc);
  const revision = useEditor((s) => s.revision);
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (isDoc(parsed)) useEditor.setState({ doc: parsed, pageIndex: 0 });
    } catch {
      // A corrupt draft is not worth surfacing; a blank page is a fine thing
      // to open with.
    }
  }, []);

  useEffect(() => {
    if (!restored.current || revision === 0) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
      } catch {
        // Quota, or a browser with storage switched off. Nothing to do, and
        // nothing worth interrupting the drawing to say.
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [doc, revision]);
}

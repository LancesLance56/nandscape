"use client";

/**
 * The tool dock.
 *
 * Every mode-changing tool in one vertical strip on the far left, and nothing
 * else: no commands, no properties, no library. That separation is the spine
 * of the layout - the dock says *what the pointer does*, the top bar says
 * *what to do to the selection*, the right panel says *what the selection is*.
 * Three questions, three edges, and none of them shares a surface with
 * another.
 */

import Link from "next/link";
import { useState } from "react";
import {
  FolderOpen,
  Hand,
  HelpCircle,
  LayoutTemplate,
  Minus,
  Moon,
  MousePointer2,
  Square,
  Sun,
  Type,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/cn";
import { Logo } from "@/components/icons";
import { emptyDoc, type LineKind } from "@/lib/flowchart-editor/model";
import { isDoc } from "@/lib/flowchart-editor/export";
import { TEMPLATES } from "@/lib/flowchart-editor/templates";
import { useEditor, type ToolKind } from "@/lib/flowchart-editor/store";
import { Menu, MenuItem, MenuLabel, MenuSeparator, useDismiss } from "./ui";

const LINE_KINDS: { id: LineKind; name: string }[] = [
  { id: "straight", name: "Straight" },
  { id: "orthogonal", name: "Right-angled" },
  { id: "rounded", name: "Right-angled, rounded" },
  { id: "curved", name: "Curved through bends" },
  { id: "arc", name: "Single arc" },
];

const TOOLS: { kind: ToolKind; icon: typeof Square; label: string; key: string }[] = [
  { kind: "select", icon: MousePointer2, label: "Select", key: "V" },
  { kind: "shape", icon: Square, label: "Shape", key: "S" },
  { kind: "line", icon: Minus, label: "Line", key: "L" },
  { kind: "text", icon: Type, label: "Text", key: "T" },
  { kind: "pan", icon: Hand, label: "Pan", key: "H" },
];

export function Dock({ onHelp }: { onHelp: () => void }) {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const replaceDoc = useEditor((s) => s.replaceDoc);
  const setTitle = useEditor((s) => s.setTitle);
  const { resolvedTheme, setTheme } = useTheme();

  const [menu, setMenu] = useState<"line" | "templates" | null>(null);
  const ref = useDismiss(menu !== null, () => setMenu(null));

  return (
    <nav
      aria-label="Tools"
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-fe-line bg-fe-panel py-2"
    >
      <Link
        href="/"
        title="Nandscape"
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-fe-ink transition-colors hover:bg-fe-hover"
      >
        <Logo className="h-5 w-5" />
      </Link>

      <Divider />

      <div ref={ref} className="flex flex-col items-center gap-1">
        {TOOLS.map((t) => (
          <DockButton
            key={t.kind}
            icon={<t.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
            label={`${t.label}  (${t.key})`}
            active={tool.kind === t.kind}
            onClick={() => setTool({ kind: t.kind })}
            // The Line tool is the one with real options behind it, so it is
            // the one that gets a chevron.
            onLongPress={t.kind === "line" ? () => setMenu(menu === "line" ? null : "line") : undefined}
          />
        ))}
        {menu === "line" && (
          <Menu className="left-full top-[74px] ml-1 w-56">
            <MenuLabel>Line type</MenuLabel>
            {LINE_KINDS.map((k) => (
              <MenuItem
                key={k.id}
                active={tool.lineKind === k.id}
                onClick={() => {
                  setTool({ kind: "line", lineKind: k.id });
                  setMenu(null);
                }}
              >
                {k.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              active={tool.sticky}
              shortcut="Shift"
              onClick={() => {
                setTool({ sticky: !tool.sticky });
                setMenu(null);
              }}
            >
              Keep the tool armed
            </MenuItem>
          </Menu>
        )}
      </div>

      <Divider />

      <div className="relative flex flex-col items-center gap-1">
        <DockButton
          icon={<LayoutTemplate className="h-[18px] w-[18px]" strokeWidth={1.8} />}
          label="Templates"
          onClick={() => setMenu(menu === "templates" ? null : "templates")}
          active={menu === "templates"}
        />
        {menu === "templates" && (
          <Menu className="left-full top-0 ml-1 w-56">
            <MenuLabel>Start from</MenuLabel>
            {TEMPLATES.map((t) => (
              <MenuItem
                key={t.name}
                onClick={() => {
                  replaceDoc(t.build());
                  setTitle(t.name);
                  setMenu(null);
                }}
              >
                {t.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              onClick={() => {
                if (confirm("Start a new drawing? The current one will be replaced.")) {
                  replaceDoc(emptyDoc());
                }
                setMenu(null);
              }}
            >
              Blank drawing
            </MenuItem>
          </Menu>
        )}
        <DockButton
          icon={<FolderOpen className="h-[18px] w-[18px]" strokeWidth={1.8} />}
          label="Open a .json drawing"
          onClick={() => openFile(replaceDoc)}
        />
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        <DockButton
          icon={
            <>
              <Moon className="h-[18px] w-[18px] dark:hidden" strokeWidth={1.8} />
              <Sun className="hidden h-[18px] w-[18px] dark:block" strokeWidth={1.8} />
            </>
          }
          label="Switch between light and dark"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
        <DockButton
          icon={<HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.8} />}
          label="Help and shortcuts"
          onClick={onHelp}
        />
      </div>
    </nav>
  );
}

function Divider() {
  return <span className="my-1 h-px w-6 bg-fe-line" />;
}

function DockButton({
  icon,
  label,
  active,
  onClick,
  onLongPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  /** Right-click or a press on the corner opens this tool's options. */
  onLongPress?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onContextMenu={
        onLongPress
          ? (e) => {
              e.preventDefault();
              onLongPress();
            }
          : undefined
      }
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-fe-accent text-fe-accent-ink"
          : "text-fe-icon hover:bg-fe-hover hover:text-fe-ink",
      )}
    >
      {icon}
      {onLongPress && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onLongPress();
          }}
          className={cn(
            "absolute bottom-0.5 right-0.5 h-0 w-0 border-b-[5px] border-l-[5px] border-b-transparent",
            active ? "border-l-fe-accent-ink" : "border-l-fe-muted",
          )}
        />
      )}
    </button>
  );
}

function openFile(replaceDoc: (doc: ReturnType<typeof emptyDoc>) => void): void {
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
}

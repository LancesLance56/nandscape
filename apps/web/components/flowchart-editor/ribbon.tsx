"use client";

/**
 * The ribbon.
 *
 * Command groups in the order SmartDraw puts them: get it out, move it around,
 * take it back, style it, set the type, arrange it. The order is not decorative
 * - it runs left to right in the sequence you actually work in, and everything
 * that acts on a selection sits at the end where the eye already is once
 * something is selected.
 */

import {
  AlignHorizontalSpaceAround,
  AlignHorizontalJustifyCenter,
  BringToFront,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus,
  FlipHorizontal2,
  Group,
  PaintBucket,
  Paintbrush,
  Palette,
  PenLine,
  Redo2,
  RotateCw,
  Ruler,
  Scissors,
  SendToBack,
  Sparkles,
  SwatchBook,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { isShape, type ArrowHead, type LineKind } from "@/lib/flowchart-editor/model";
import { useEditor } from "@/lib/flowchart-editor/store";
import { SYMBOL_CATEGORIES } from "@/lib/flowchart-editor/symbols";
import {
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MiniButton,
  RibbonButton,
  RibbonDivider,
  RibbonGroup,
  fieldCls,
} from "./ui";
import { exportPng, exportSvg, exportJson } from "@/lib/flowchart-editor/export";

const FONTS = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Trebuchet MS"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const PALETTE = [
  "#1b2434", "#2b3a55", "#4b5c78", "#7d8ba3", "#b9c2d0", "#ffffff",
  "#2b8341", "#5bb974", "#c9e7d1", "#b8860b", "#e8b93c", "#faf0d4",
  "#b33f2a", "#e1543b", "#fbe3dd", "#2f6fd0", "#5b9bf5", "#e2ecfb",
];

const DASHES: { label: string; value: string }[] = [
  { label: "Solid", value: "" },
  { label: "Dashed", value: "6 4" },
  { label: "Dotted", value: "1.5 3" },
  { label: "Dash-dot", value: "8 3 2 3" },
];

const ARROWS: { label: string; value: ArrowHead }[] = [
  { label: "None", value: "none" },
  { label: "Arrow", value: "arrow" },
  { label: "Open arrow", value: "open" },
  { label: "Circle", value: "circle" },
  { label: "Diamond", value: "diamond" },
  { label: "Bar", value: "bar" },
];

const LINE_KINDS: { id: LineKind; name: string }[] = [
  { id: "straight", name: "Straight Line" },
  { id: "orthogonal", name: "Shape Connector" },
  { id: "rounded", name: "Rounded Connector" },
  { id: "curved", name: "Curved Connector" },
  { id: "arc", name: "Curved Line" },
];

export function Ribbon() {
  const s = useEditor();
  const page = s.doc.pages[Math.min(s.pageIndex, s.doc.pages.length - 1)];
  const selection = s.selection;
  const selected = page.elements.filter((e) => selection.includes(e.id));
  const shapes = selected.filter(isShape);
  const lines = selected.filter((e) => e.kind === "line");
  const none = selection.length === 0;
  const style = shapes[0]?.style;

  const setShapeStyle = (patch: Parameters<typeof s.styleShapes>[1]) => s.styleShapes(selection, patch);
  const setLineStyle = (patch: Parameters<typeof s.styleLines>[1]) => s.styleLines(selection, patch);

  return (
    <div className="flex shrink-0 items-stretch gap-0 overflow-x-auto border-b border-fe-line bg-fe-panel px-1.5 py-0.5">
      <RibbonGroup>
        <RibbonButton
          icon={<Download className="h-5 w-5" />}
          label="Export"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { exportPng(page, s.doc.title); close(); }}>PNG image</MenuItem>
              <MenuItem onClick={() => { exportSvg(page, s.doc.title); close(); }}>SVG vector</MenuItem>
              <MenuItem onClick={() => { exportJson(s.doc); close(); }}>JSON (this drawing)</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { window.print(); close(); }} shortcut="Ctrl+P">Print</MenuItem>
            </>
          )}
        />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup>
        <RibbonButton
          icon={<ClipboardPaste className="h-5 w-5" />}
          label="Paste"
          splitAction
          disabled={s.clipboard.length === 0}
          onClick={() => s.paste()}
          menu={(close) => (
            <>
              <MenuItem onClick={() => { s.paste(); close(); }} shortcut="Ctrl+V">Paste</MenuItem>
              <MenuItem onClick={() => { s.duplicateSelection(); close(); }} shortcut="Ctrl+D">Duplicate</MenuItem>
            </>
          )}
        />
        <RibbonButton icon={<Copy className="h-5 w-5" />} label="Copy" disabled={none} onClick={s.copy} />
        <RibbonButton icon={<Scissors className="h-5 w-5" />} label="Cut" disabled={none} onClick={s.cut} />
        <RibbonButton
          icon={<Paintbrush className="h-5 w-5" />}
          label="Format Painter"
          disabled={shapes.length === 0}
          title="Copy this shape's formatting onto the rest of the selection"
          onClick={() => {
            if (shapes.length < 2) return;
            const model = shapes[0].style;
            s.styleShapes(shapes.slice(1).map((x) => x.id), { ...model });
          }}
        />
        <RibbonButton
          icon={<FilePlus className="h-5 w-5" />}
          label="Insert"
          menu={(close) => (
            <>
              <MenuLabel>Add a shape</MenuLabel>
              {SYMBOL_CATEGORIES[1].symbols.slice(0, 8).map((sym) => (
                <MenuItem
                  key={sym.key}
                  onClick={() => {
                    s.setTool({ kind: "shape", symbol: sym.key });
                    close();
                  }}
                >
                  {sym.name}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem onClick={() => { s.addPage(); close(); }}>New page</MenuItem>
            </>
          )}
        />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup>
        <RibbonButton icon={<Undo2 className="h-5 w-5" />} label="Undo" disabled={s.past.length === 0} onClick={s.undo} />
        <RibbonButton icon={<Redo2 className="h-5 w-5" />} label="Redo" disabled={s.future.length === 0} onClick={s.redo} />
      </RibbonGroup>

      <RibbonDivider />

      <RibbonGroup>
        <RibbonButton
          icon={<Palette className="h-5 w-5" />}
          label="Styles"
          disabled={none}
          menu={(close) => (
            <>
              <MenuLabel>Quick styles</MenuLabel>
              {QUICK_STYLES.map((q) => (
                <MenuItem
                  key={q.name}
                  onClick={() => {
                    setShapeStyle(q.shape);
                    setLineStyle({ stroke: q.shape.stroke });
                    close();
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-6 rounded-sm border"
                      style={{ background: q.shape.fill, borderColor: q.shape.stroke }}
                    />
                    {q.name}
                  </span>
                </MenuItem>
              ))}
            </>
          )}
        />
        <RibbonButton
          icon={<SwatchBook className="h-5 w-5" />}
          label="Themes"
          menu={(close) => (
            <>
              <MenuLabel>Apply to the whole page</MenuLabel>
              {THEMES.map((t) => (
                <MenuItem
                  key={t.name}
                  onClick={() => {
                    const ids = page.elements.map((e) => e.id);
                    s.styleShapes(ids, t.shape);
                    s.styleLines(ids, { stroke: t.line });
                    close();
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-6 rounded-sm border"
                      style={{ background: t.shape.fill, borderColor: t.shape.stroke }}
                    />
                    {t.name}
                  </span>
                </MenuItem>
              ))}
            </>
          )}
        />
        <RibbonButton
          icon={<PaintBucket className="h-5 w-5" />}
          label="Fill"
          disabled={shapes.length === 0}
          menu={(close) => (
            <ColorGrid
              onPick={(c) => {
                setShapeStyle({ fill: c });
                close();
              }}
              extra={
                <MenuItem onClick={() => { setShapeStyle({ fill: "transparent" }); close(); }}>
                  No fill
                </MenuItem>
              }
            />
          )}
        />
        <RibbonButton
          icon={<PenLine className="h-5 w-5" />}
          label="Line Style"
          disabled={none}
          menu={(close) => (
            <>
              <MenuLabel>Weight</MenuLabel>
              {[0.75, 1, 1.5, 2, 3, 4].map((w) => (
                <MenuItem
                  key={w}
                  onClick={() => {
                    setShapeStyle({ strokeWidth: w });
                    setLineStyle({ strokeWidth: w });
                    close();
                  }}
                >
                  <span className="inline-flex w-full items-center gap-2">
                    <span className="inline-block flex-1" style={{ borderTop: `${w}px solid currentColor` }} />
                    {w}px
                  </span>
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Dash</MenuLabel>
              {DASHES.map((d) => (
                <MenuItem
                  key={d.label}
                  onClick={() => {
                    setShapeStyle({ dash: d.value });
                    setLineStyle({ dash: d.value });
                    close();
                  }}
                >
                  {d.label}
                </MenuItem>
              ))}
              {lines.length > 0 && (
                <>
                  <MenuSeparator />
                  <MenuLabel>Line type</MenuLabel>
                  {LINE_KINDS.map((k) => (
                    <MenuItem key={k.id} onClick={() => { s.updateLines(selection, { lineKind: k.id }); close(); }}>
                      {k.name}
                    </MenuItem>
                  ))}
                  <MenuSeparator />
                  <MenuLabel>Arrowheads</MenuLabel>
                  {ARROWS.map((a) => (
                    <MenuItem key={a.value} onClick={() => { setLineStyle({ endArrow: a.value }); close(); }}>
                      End: {a.label}
                    </MenuItem>
                  ))}
                  {ARROWS.map((a) => (
                    <MenuItem key={`s-${a.value}`} onClick={() => { setLineStyle({ startArrow: a.value }); close(); }}>
                      Start: {a.label}
                    </MenuItem>
                  ))}
                </>
              )}
              <MenuSeparator />
              <MenuLabel>Outline colour</MenuLabel>
              <ColorGrid
                onPick={(c) => {
                  setShapeStyle({ stroke: c });
                  setLineStyle({ stroke: c });
                  close();
                }}
              />
            </>
          )}
        />
        <RibbonButton
          icon={<Sparkles className="h-5 w-5" />}
          label="Effects"
          disabled={shapes.length === 0}
          menu={(close) => (
            <>
              <MenuItem active={style?.shadow} onClick={() => { setShapeStyle({ shadow: !style?.shadow }); close(); }}>
                Drop shadow
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Opacity</MenuLabel>
              {[1, 0.75, 0.5, 0.25].map((o) => (
                <MenuItem key={o} onClick={() => { setShapeStyle({ opacity: o }); setLineStyle({ opacity: o }); close(); }}>
                  {Math.round(o * 100)}%
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuLabel>Corner rounding</MenuLabel>
              {[0, 4, 8, 16, 28].map((r) => (
                <MenuItem key={r} onClick={() => { setShapeStyle({ radius: r }); setLineStyle({ radius: r }); close(); }}>
                  {r}px
                </MenuItem>
              ))}
            </>
          )}
        />
      </RibbonGroup>

      <RibbonDivider />

      {/* Character formatting. Two rows, like every ribbon since 2007. */}
      <div className="flex flex-col justify-center gap-1 px-1.5 py-1.5">
        <div className="flex items-center gap-1">
          <select
            value={style?.fontFamily ?? "Arial"}
            disabled={none}
            onChange={(e) => setShapeStyle({ fontFamily: e.target.value })}
            aria-label="Font"
            className={cn(fieldCls, "w-36")}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={style?.fontSize ?? 12}
            disabled={none}
            onChange={(e) => {
              setShapeStyle({ fontSize: Number(e.target.value) });
              setLineStyle({ fontSize: Number(e.target.value) });
            }}
            aria-label="Font size"
            className={cn(fieldCls, "w-14")}
          >
            {SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <MiniButton title="Bold" disabled={none} active={style?.bold} onClick={() => setShapeStyle({ bold: !style?.bold })}>
            <span className="font-bold">B</span>
          </MiniButton>
          <MiniButton title="Italic" disabled={none} active={style?.italic} onClick={() => setShapeStyle({ italic: !style?.italic })}>
            <span className="font-serif italic">I</span>
          </MiniButton>
          <MiniButton title="Underline" disabled={none} active={style?.underline} onClick={() => setShapeStyle({ underline: !style?.underline })}>
            <span className="underline">U</span>
          </MiniButton>
          <span className="mx-0.5 h-4 w-px bg-fe-line" />
          <MiniButton title="Align left" disabled={none} active={style?.align === "left"} onClick={() => setShapeStyle({ align: "left" })}>
            <AlignGlyph align="left" />
          </MiniButton>
          <MiniButton title="Align centre" disabled={none} active={style?.align === "center"} onClick={() => setShapeStyle({ align: "center" })}>
            <AlignGlyph align="center" />
          </MiniButton>
          <MiniButton title="Align right" disabled={none} active={style?.align === "right"} onClick={() => setShapeStyle({ align: "right" })}>
            <AlignGlyph align="right" />
          </MiniButton>
          <span className="mx-0.5 h-4 w-px bg-fe-line" />
          <MiniButton
            title="Text colour"
            disabled={none}
            menu={(close) => (
              <ColorGrid
                onPick={(c) => {
                  setShapeStyle({ textColor: c });
                  setLineStyle({ textColor: c });
                  close();
                }}
              />
            )}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[11px] font-bold">A</span>
              <span className="mt-px h-[3px] w-3.5 rounded-sm" style={{ background: style?.textColor ?? "#1b2434" }} />
            </span>
          </MiniButton>
        </div>
      </div>

      <RibbonDivider />

      <RibbonGroup>
        <RibbonButton
          icon={<AlignHorizontalJustifyCenter className="h-5 w-5" />}
          label="Align"
          disabled={shapes.length < 2}
          menu={(close) => (
            <>
              {([
                ["Left edges", "left"], ["Centres (vertical)", "hcenter"], ["Right edges", "right"],
                ["Top edges", "top"], ["Middles (horizontal)", "vcenter"], ["Bottom edges", "bottom"],
              ] as const).map(([label, how]) => (
                <MenuItem key={how} onClick={() => { s.align(selection, how); close(); }}>{label}</MenuItem>
              ))}
            </>
          )}
        />
        <RibbonButton
          icon={<Group className="h-5 w-5" />}
          label="Group"
          disabled={selection.length < 1}
          menu={(close) => (
            <>
              <MenuItem disabled={selection.length < 2} onClick={() => { s.group(selection); close(); }} shortcut="Ctrl+G">Group</MenuItem>
              <MenuItem onClick={() => { s.ungroup(selection); close(); }} shortcut="Ctrl+Shift+G">Ungroup</MenuItem>
            </>
          )}
        />
        <RibbonButton
          icon={<RotateCw className="h-5 w-5" />}
          label="Rotate"
          disabled={shapes.length === 0}
          menu={(close) => (
            <>
              <MenuItem onClick={() => { s.rotateBy(selection, 90); close(); }}>Rotate 90° right</MenuItem>
              <MenuItem onClick={() => { s.rotateBy(selection, -90); close(); }}>Rotate 90° left</MenuItem>
              <MenuItem onClick={() => { s.rotateBy(selection, 180); close(); }}>Rotate 180°</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { s.updateShapes(selection, { rotation: 0 }); close(); }}>Reset rotation</MenuItem>
            </>
          )}
        />
        <RibbonButton
          icon={<FlipHorizontal2 className="h-5 w-5" />}
          label="Flip"
          disabled={none}
          menu={(close) => (
            <>
              <MenuItem onClick={() => { s.flip(selection, "h"); close(); }}>Flip horizontally</MenuItem>
              <MenuItem onClick={() => { s.flip(selection, "v"); close(); }}>Flip vertically</MenuItem>
            </>
          )}
        />
        <RibbonButton
          icon={<BringToFront className="h-5 w-5" />}
          label="Bring to Front"
          disabled={none}
          onClick={() => s.order(selection, "front")}
        />
        <RibbonButton
          icon={<SendToBack className="h-5 w-5" />}
          label="Send to Back"
          disabled={none}
          onClick={() => s.order(selection, "back")}
        />
        <RibbonButton
          icon={<Ruler className="h-5 w-5" />}
          label="Make Same"
          disabled={shapes.length < 2}
          title="Resize the rest of the selection to match the first shape you picked"
          menu={(close) => (
            <>
              <MenuItem onClick={() => { s.makeSame(selection, "width"); close(); }}>Same width</MenuItem>
              <MenuItem onClick={() => { s.makeSame(selection, "height"); close(); }}>Same height</MenuItem>
              <MenuItem onClick={() => { s.makeSame(selection, "both"); close(); }}>Same size</MenuItem>
            </>
          )}
        />
        <RibbonButton
          icon={<AlignHorizontalSpaceAround className="h-5 w-5" />}
          label="Space Evenly"
          disabled={shapes.length < 3}
          menu={(close) => (
            <>
              <MenuItem onClick={() => { s.distribute(selection, "h"); close(); }}>Across</MenuItem>
              <MenuItem onClick={() => { s.distribute(selection, "v"); close(); }}>Down</MenuItem>
            </>
          )}
        />
      </RibbonGroup>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Bits
 * ---------------------------------------------------------------------- */

function ColorGrid({ onPick, extra }: { onPick: (c: string) => void; extra?: React.ReactNode }) {
  return (
    <div className="p-1">
      <div className="grid grid-cols-6 gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onPick(c)}
            className="h-5 w-5 rounded border border-fe-line"
            style={{ background: c }}
          />
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[11px] text-fe-ink">
        Custom
        <input type="color" onChange={(e) => onPick(e.target.value)} className="h-6 w-10 cursor-pointer bg-transparent" />
      </label>
      {extra}
    </div>
  );
}

function AlignGlyph({ align }: { align: "left" | "center" | "right" }) {
  const rows = align === "left" ? [12, 8, 12, 8] : align === "right" ? [12, 8, 12, 8] : [12, 8, 12, 8];
  return (
    <svg viewBox="0 0 14 12" className="h-3 w-3.5" aria-hidden>
      {rows.map((w, i) => {
        const x = align === "left" ? 1 : align === "right" ? 13 - w : (14 - w) / 2;
        return <rect key={i} x={x} y={1 + i * 3} width={w} height={1.6} fill="currentColor" />;
      })}
    </svg>
  );
}

const QUICK_STYLES = [
  { name: "Outline", shape: { fill: "#ffffff", stroke: "#2b3a55", textColor: "#1b2434" } },
  { name: "Ink", shape: { fill: "#eef1f6", stroke: "#2b3a55", textColor: "#1b2434" } },
  { name: "Green", shape: { fill: "#e0efe2", stroke: "#2b8341", textColor: "#1f6b33" } },
  { name: "Amber", shape: { fill: "#faf0d4", stroke: "#b8860b", textColor: "#8a6508" } },
  { name: "Coral", shape: { fill: "#fbe3dd", stroke: "#b33f2a", textColor: "#8c3220" } },
  { name: "Blue", shape: { fill: "#e2ecfb", stroke: "#2f6fd0", textColor: "#24559f" } },
] as const;

const THEMES = [
  { name: "Classic", shape: { fill: "#ffffff", stroke: "#2b3a55", textColor: "#1b2434" }, line: "#2b3a55" },
  { name: "Blueprint", shape: { fill: "#e2ecfb", stroke: "#2f6fd0", textColor: "#24559f" }, line: "#2f6fd0" },
  { name: "Sage", shape: { fill: "#e0efe2", stroke: "#2b8341", textColor: "#1f6b33" }, line: "#2b8341" },
  { name: "Mono", shape: { fill: "#f2f2f2", stroke: "#3f3f3f", textColor: "#1f1f1f" }, line: "#3f3f3f" },
] as const;

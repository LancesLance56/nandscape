"use client";

/**
 * Getting a drawing out of the tool.
 *
 * The SVG is generated from the model rather than scraped out of the DOM, so
 * an export is not hostage to whatever the canvas happened to be showing -
 * selection handles, connection dots, the grid and the current zoom are simply
 * not part of it. PNG is that same SVG rasterised, so the two can never
 * disagree about what the drawing looks like.
 */

import {
  isShape,
  type Doc,
  type Line,
  type Page,
  type Point,
  type Shape,
} from "./model";
import { lineLabelAnchor, linePath, linePoints } from "./geometry";
import { symbolFor } from "./symbols";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function arrowGeometry(kind: string, tip: Point, from: Point, size: number): { d: string; filled: boolean } | null {
  if (kind === "none") return null;
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const at = (d: number, spread: number) => ({
    x: tip.x - Math.cos(angle - spread) * d,
    y: tip.y - Math.sin(angle - spread) * d,
  });
  if (kind === "arrow") {
    const a = at(size, 0.42);
    const b = at(size, -0.42);
    return { d: `M${tip.x},${tip.y} L${a.x},${a.y} L${b.x},${b.y} Z`, filled: true };
  }
  if (kind === "open") {
    const a = at(size, 0.5);
    const b = at(size, -0.5);
    return { d: `M${a.x},${a.y} L${tip.x},${tip.y} L${b.x},${b.y}`, filled: false };
  }
  if (kind === "circle") {
    const r = size * 0.34;
    const c = { x: tip.x - Math.cos(angle) * r, y: tip.y - Math.sin(angle) * r };
    return { d: `M${c.x - r},${c.y} a${r},${r} 0 1 0 ${r * 2},0 a${r},${r} 0 1 0 ${-r * 2},0`, filled: true };
  }
  if (kind === "diamond") {
    const back = { x: tip.x - Math.cos(angle) * size, y: tip.y - Math.sin(angle) * size };
    const mid = { x: (tip.x + back.x) / 2, y: (tip.y + back.y) / 2 };
    const half = size * 0.3;
    const nx = -Math.sin(angle) * half;
    const ny = Math.cos(angle) * half;
    return {
      d: `M${tip.x},${tip.y} L${mid.x + nx},${mid.y + ny} L${back.x},${back.y} L${mid.x - nx},${mid.y - ny} Z`,
      filled: true,
    };
  }
  const half = size * 0.45;
  const nx = -Math.sin(angle) * half;
  const ny = Math.cos(angle) * half;
  return { d: `M${tip.x + nx},${tip.y + ny} L${tip.x - nx},${tip.y - ny}`, filled: false };
}

/** Text laid out by hand, because SVG has no box model and no word wrap. */
function textBlock(
  text: string,
  box: { x: number; y: number; width: number; height: number },
  style: { fontFamily: string; fontSize: number; bold: boolean; italic: boolean; underline: boolean; align: string; valign: string; textColor: string },
): string {
  if (!text.trim()) return "";
  const charW = style.fontSize * 0.55;
  const perLine = Math.max(1, Math.floor(box.width / charW));
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.length <= perLine) {
      lines.push(paragraph);
      continue;
    }
    let current = "";
    for (const word of paragraph.split(" ")) {
      if ((current + " " + word).trim().length > perLine && current) {
        lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
  }

  const lh = style.fontSize * 1.25;
  const blockHeight = lines.length * lh;
  const top =
    style.valign === "top" ? box.y : style.valign === "bottom" ? box.y + box.height - blockHeight : box.y + (box.height - blockHeight) / 2;
  const anchor = style.align === "left" ? "start" : style.align === "right" ? "end" : "middle";
  const x = style.align === "left" ? box.x : style.align === "right" ? box.x + box.width : box.x + box.width / 2;

  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${top + i * lh + lh * 0.72}" text-anchor="${anchor}" font-family="${esc(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${style.bold ? 700 : 400}" font-style="${style.italic ? "italic" : "normal"}" text-decoration="${style.underline ? "underline" : "none"}" fill="${style.textColor}">${esc(line)}</text>`,
    )
    .join("");
}

function shapeSvg(shape: Shape): string {
  const def = symbolFor(shape.symbol);
  const geo = def.geometry(shape.width, shape.height, shape.style.radius);
  const s = shape.style;
  const inset = def.textInset?.(shape.width, shape.height) ?? { top: 6, right: 8, bottom: 6, left: 8 };
  const transform = shape.rotation
    ? ` rotate(${shape.rotation} ${shape.width / 2} ${shape.height / 2})`
    : "";

  const body = `<path d="${geo.outline}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round"/>`;
  const details = (geo.details ?? [])
    .map((d) => `<path d="${d}" fill="none" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"/>`)
    .join("");
  const label = textBlock(
    shape.text,
    {
      x: inset.left,
      y: inset.top,
      width: Math.max(4, shape.width - inset.left - inset.right),
      height: Math.max(4, shape.height - inset.top - inset.bottom),
    },
    s,
  );

  return `<g transform="translate(${shape.x} ${shape.y})${transform}" opacity="${s.opacity}">${body}${details}${label}</g>`;
}

function lineSvg(line: Line, page: Page): string {
  const pts = linePoints(line, page);
  if (pts.length < 2) return "";
  const s = line.style;
  const size = Math.max(8, s.strokeWidth * 5);
  const parts = [
    `<path d="${linePath(line, page)}" fill="none" stroke="${s.stroke}" stroke-width="${s.strokeWidth}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round"/>`,
  ];

  const end = arrowGeometry(s.endArrow, pts[pts.length - 1], pts[pts.length - 2], size);
  if (end) parts.push(`<path d="${end.d}" fill="${end.filled ? s.stroke : "none"}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"/>`);
  const start = arrowGeometry(s.startArrow, pts[0], pts[1], size);
  if (start) parts.push(`<path d="${start.d}" fill="${start.filled ? s.stroke : "none"}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"/>`);

  if (line.label) {
    const at = lineLabelAnchor(line, page);
    const w = line.label.length * s.fontSize * 0.58 + 8;
    parts.push(
      `<rect x="${at.x - w / 2}" y="${at.y - s.fontSize * 0.85}" width="${w}" height="${s.fontSize * 1.7}" rx="3" fill="${page.background}"/>`,
      `<text x="${at.x}" y="${at.y + s.fontSize * 0.35}" text-anchor="middle" font-family="${esc(s.fontFamily)}" font-size="${s.fontSize}" fill="${s.textColor}">${esc(line.label)}</text>`,
    );
  }

  return `<g opacity="${s.opacity}">${parts.join("")}</g>`;
}

export function pageToSvg(page: Page): string {
  const ordered = [...page.elements].sort((a, b) => a.z - b.z);
  const body = ordered.map((el) => (isShape(el) ? shapeSvg(el) : lineSvg(el as Line, page))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}"><rect width="${page.width}" height="${page.height}" fill="${page.background}"/>${body}</svg>`;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick rather than immediately: Safari has not started
  // reading the blob by the time click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "drawing";

export function exportSvg(page: Page, title: string): void {
  download(new Blob([pageToSvg(page)], { type: "image/svg+xml" }), `${slug(title)}.svg`);
}

export function exportPng(page: Page, title: string, scale = 2): void {
  const svg = pageToSvg(page);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = page.width * scale;
    canvas.height = page.height * scale;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = page.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) download(blob, `${slug(title)}.png`);
      }, "image/png");
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function exportJson(doc: Doc): void {
  download(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }), `${slug(doc.title)}.json`);
}

export function isDoc(value: unknown): value is Doc {
  if (!value || typeof value !== "object") return false;
  const d = value as Doc;
  return Array.isArray(d.pages) && d.pages.every((p) => Array.isArray(p.elements) && typeof p.width === "number");
}

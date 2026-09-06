/**
 * A drawing, re-inked for the dark theme.
 *
 * The model stores literal colours on purpose - they travel in saved JSON and
 * into an exported SVG, where a CSS variable resolves to nothing. That is right
 * for the document and wrong for the page it sits on: a white sheet in the
 * middle of a dark article is a torch pointed at the reader.
 *
 * So the *reading* surface re-inks a copy at render time and leaves the stored
 * drawing alone. Nothing here is ever saved, and an export deliberately runs
 * from the original, because a downloaded diagram is a document rather than a
 * view of one.
 *
 * Two mechanisms, in order:
 *
 *  1. An exact table for the palette the site actually uses. Every entry is a
 *     real token pair from globals.css - `--copper` in light against `--copper`
 *     in dark - so a converted diagram lands on the same greens and ambers the
 *     surrounding page uses, rather than on something merely darker.
 *  2. A lightness flip for anything else, so a colour someone picked by hand
 *     still reads. Hue and saturation survive; only the lightness turns over.
 */

import { isShape, type Page } from "./model";

/** Light value → dark value, both taken from the site's own tokens. */
const DARK_INK: Record<string, string> = {
  // Paper and the greys on it.
  "#ffffff": "#1e1e1e",
  "#f4f4f4": "#282828",
  "#ececec": "#303030",
  "#cfcfcf": "#4a4a4a",
  "#7d7d7d": "#8f8f8f",
  "#545454": "#a2a2a2",
  "#252525": "#d8d8d8",

  // Leaf green: --copper.
  "#e0efe2": "#163020",
  "#2b8341": "#52b869",
  "#1f6b33": "#78d38c",

  // Signal green.
  "#dff3e7": "#123324",
  "#1ca463": "#2ece86",
  "#0f7e4a": "#6ee7b0",

  // Coral.
  "#fbe3dd": "#3a1a14",
  "#e1543b": "#f0715a",
  "#b33f2a": "#f79683",

  // Diagram blue.
  "#e2ecfb": "#16233a",
  "#2f6fd0": "#5b9bf5",
  "#24559f": "#7ab0f7",

  // Diagram rose.
  "#f7e2ec": "#3a1f2b",
  "#c24a7c": "#e77ba6",
  "#98325c": "#ef9ec0",

  // Diagram amber.
  "#faf0d4": "#332a12",
  "#b8860b": "#e0b341",
  "#e8b93c": "#e8c76a",
  "#7a5a07": "#ecc76a",
  "#8a6508": "#ecc76a",

  "#3d2f26": "#d8cec6",
};

/* -------------------------------------------------------------------------
 * The generic fallback
 * ---------------------------------------------------------------------- */

function parseHex(colour: string): [number, number, number] | null {
  const hex = colour.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Flip lightness, keep hue and saturation. Enough to make any colour legible. */
function flipLightness(colour: string): string {
  const rgb = parseHex(colour);
  if (!rgb) return colour;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  // Not a plain 1 - l: pure white would become pure black, which is a harsher
  // ground than the theme's own surfaces. The range is squeezed toward the
  // middle at both ends.
  const flipped = Math.min(0.92, Math.max(0.08, 1 - l) * 0.92 + 0.04);

  const c = (1 - Math.abs(2 * flipped - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = flipped - c / 2;
  const [r2, g2, b2] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];

  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r2)}${to(g2)}${to(b2)}`;
}

/** One colour, re-inked. Anything without a colour value passes through. */
export function darkInk(colour: string): string {
  if (!colour || colour === "transparent" || colour === "none") return colour;
  const exact = DARK_INK[colour.toLowerCase()];
  if (exact) return exact;
  if (colour.startsWith("#")) return flipLightness(colour);
  return colour;
}

/* -------------------------------------------------------------------------
 * A whole page
 * ---------------------------------------------------------------------- */

/**
 * A copy of the page with every colour re-inked. The geometry is untouched -
 * this changes how a drawing looks, never where anything is.
 */
export function darkPage(page: Page): Page {
  return {
    ...page,
    background: darkInk(page.background || "#ffffff"),
    elements: page.elements.map((el) =>
      isShape(el)
        ? {
            ...el,
            style: {
              ...el.style,
              fill: darkInk(el.style.fill),
              stroke: darkInk(el.style.stroke),
              textColor: darkInk(el.style.textColor),
            },
          }
        : {
            ...el,
            style: {
              ...el.style,
              stroke: darkInk(el.style.stroke),
              textColor: darkInk(el.style.textColor),
            },
          },
    ),
  };
}

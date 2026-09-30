# Nandscape logo set (snap-blocks symbol)

Where it is used:
- `components/icons.tsx` `Logo` inlines the `mark.svg` paths (navbar, footer, flowchart dock, practice nav). Its fills use `var(--brand-blue)` / `var(--brand-red)`, which is possible because it is inline rather than an `<img>`.
- `app/layout.tsx` `metadata.icons` declares `/brand/favicon.svg`, `/favicon.ico` and `/apple-touch-icon.png`.
- `public/favicon.ico` (16/32/48, PNG-in-ICO) is rasterised from `favicon.svg`; `public/apple-touch-icon.png` (180×180) from `logo-square-dark.svg`. Re-rasterise both if the mark changes.

Symbol: two Scratch-style code blocks. The top one is full width with a tab on its bottom edge; the bottom one is indented and has the matching notch. The geometry is identical in every file; only the colours change.

| File | Use |
|---|---|
| favicon.svg | 32×32 favicon, Signal Blue symbol on an Ink Black rounded tile (2 colours) |
| favicon-transparent.svg | same, transparent background |
| logo-square-dark.svg | 512×512 app icon/avatar on #080708 |
| logo-square-light.svg | 512×512 app icon/avatar on #E6E8E6 |
| logo-horizontal-light.svg | lockup, #080708 wordmark, transparent bg (for #E6E8E6 or white) |
| logo-horizontal-dark.svg | lockup, #E6E8E6 wordmark, transparent bg (for #111012) |
| mark.svg | symbol only, blue + red |
| mark-mono-black.svg / mark-mono-white.svg | single flat colour |
| preview.png | render check at real sizes, not a production asset |

Colours are exact hex values from apps/web/app/globals.css (--brand-*). They are hardcoded because CSS variables don't resolve in an SVG loaded via <img> or as a favicon.

The wordmark is JetBrains Mono Bold converted to outlines, so it needs no font. The stripe under it is --brand-gradient.

Decisions and caveats:
- Yellow dot left out of the favicon. At 16px it would be about 1px, and there's no spot for it that doesn't clutter the symbol.
- At 16px the gap between the blocks is about 1px and the tab and notch are gone. It reads as two stacked blue bars, the lower one indented. It still reads as a distinct shape, but the "puzzle" detail only shows from 32px up.
- Blue #3772FF is ~4.2:1 on white. That's fine for a logo but not for text.
- No web-app manifest icons yet.

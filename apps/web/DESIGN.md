# Nandscape Design System

Context file for design tooling. Everything here is transcribed from
`apps/web/app/globals.css`, `app/layout.tsx` and `components/ui/*`. If a value
here disagrees with those files, those files win.

---

## 1. What this site is

Nandscape teaches computer science by making you build it: an interactive
digital-logic circuit editor and simulator, puzzles, coding practice problems,
a flowchart/diagram editor, tutorials and a blog.

**Design intent: an ink wash with one hue.** The page is grey paper and dark
ink. Exactly one colour, a leaf green, carries every accent. Everything on the
page is either structure (ink, surface, border) or signal (green, coral). A
second decorative hue is a bug, not a choice.

The visual language of the site is the visual language of its content: nodes
joined by wires. Lists are rails with nodes hanging off a spine, not stacks of
boxes. This is why the card is quiet and rare.

---

## 2. Non-negotiable rules

1. **Never write a raw colour value.** Every colour is a token from §3. There
   is no hex in a component, and no Tailwind palette colour (`slate-700`,
   `emerald-500`, `gray-200`) anywhere on this site.
2. **Never invent a token.** If nothing in §3 fits, the design is reaching for
   a colour the system does not have, and the answer is to use one it does.
3. **Aliases, never new colours.** A subsystem that needs its own names (the
   shadcn layer, the flowchart editor's `--fe-*`, Problem Studio's `.studio`)
   defines them as `var()` onto the tokens in §3. That is what lets those
   subsystems flip with the theme without owning a single dark rule.
4. **The paper family never flips.** See §5.
5. **No shadows.** The card deliberately lost its drop shadow. Elevation is
   expressed with a border and a surface step, never a shadow.
6. **Hover does not move things.** No lift, no scale, no translate on cards or
   list rows. Hover changes border colour and background tint only. A grid of
   cards must stay still while the pointer crosses it. (The one exception is
   the button's `active:translate-y-px` press.)
7. **Dark mode is a class**, `.dark` on `<html>`, set by `next-themes`. The
   custom variant is already declared: `@custom-variant dark (&:where(.dark, .dark *))`.

---

## 3. Colour tokens

Both themes define the same names. Use the Tailwind utility, e.g. `bg-surface-2`,
`text-ink-soft`, `border-border-strong`, `text-copper`.

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface` | `#f4f4f4` | `#1a1a1a` | Page ground. Set on `body`. |
| `--surface-card` | `#ffffff` | `#222222` | Card / panel fill. |
| `--surface-2` | `#ececec` | `#282828` | Hover fill, muted fill, sidebar. |
| `--surface-3` | `#e2e2e2` | `#323232` | Pressed, nested panel. |
| `--surface-4` | `#d6d6d6` | `#3d3d3d` | Deepest step. Rare. |

### Ink

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#252525` | `#cfcfcf` | Primary text, headings. |
| `--ink-soft` | `#545454` | `#9a9a9a` | Body copy, secondary text, icons. |
| `--slate` | `#7d7d7d` | `#7d7d7d` | Meta, labels, timestamps. Same both themes. |

### Borders

| Token | Light | Dark | Use |
|---|---|---|---|
| `--border` | `#dcdcdc` | `#303030` | Default. Applied to `*` in `@layer base`. |
| `--border-strong` | `#cfcfcf` | `#424242` | Hover border, input border, scrollbar thumb. |

### Accent (the one hue)

Named `--copper*` for historical reasons. The value is a leaf green.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--copper` | `#2b8341` | `#52b869` | Primary accent, focus ring, primary button fill. |
| `--copper-dark` | `#1f6b33` | `#78d38c` | The **higher-contrast** step in both themes. Links, hover text. |
| `--copper-bg` | `#e0efe2` | `#163020` | Tinted accent background. |
| `--copper-ink` | `#ffffff` | `#071a0d` | Text on an accent fill. |
| `--accent-display` | `#2f8d46` | `#5cc574` | Brighter green, headline size only. |

`--copper` clears AA both ways: about 4.75:1 on white, and white on it.
Note that `--copper-dark` is *lighter* than `--copper` in dark mode. The suffix
means "more contrast against the current ground", not "darker".

### Signal

State colours. Also the logic levels the simulator draws.

| Token | Light | Dark |
|---|---|---|
| `--signal-green` | `#1ca463` | `#2ece86` |
| `--signal-green-strong` | `#0f7e4a` | `#6ee7b0` |
| `--signal-green-bg` | `#dff3e7` | `#123324` |
| `--signal-coral` | `#e1543b` | `#f0715a` |
| `--signal-coral-strong` | `#b33f2a` | `#f79683` |
| `--signal-coral-bg` | `#fbe3dd` | `#3a1a14` |
| `--signal-unknown` | `#ff00ff` | `#ff00ff` |

Coral is the destructive/error colour. `--signal-unknown` is deliberate
magenta: it marks an undefined logic level and is meant to be alarming.

### Diagram accents

Scoped to diagrams **by convention**. Do not use these as UI colour. They exist
because a flowchart must be able to say "these two stages are different kinds
of thing", which a one-hue ramp cannot.

| Token | Light | Dark |
|---|---|---|
| `--diagram-blue` / `-bg` | `#2f6fd0` / `#e2ecfb` | `#5b9bf5` / `#16233a` |
| `--diagram-violet` / `-bg` | `#c24a7c` / `#f7e2ec` | `#e77ba6` / `#3a1f2b` |
| `--diagram-amber` / `-bg` | `#b8860b` / `#faf0d4` | `#e0b341` / `#332a12` |

`--diagram-violet` is a rose. The name is kept because code reads it; the
palette carries no purple.

### Folder stock

Four low-chroma pastels for the homepage folder stack only.

| Token | Light | Dark |
|---|---|---|
| `--folder-1` (sage) | `#d7e4c2` | `#2d3826` |
| `--folder-2` (manila) | `#f0dfb7` | `#3b331f` |
| `--folder-3` (clay) | `#eed4c3` | `#3d2f26` |
| `--folder-4` (mist) | `#d2e0ec` | `#263240` |

---

## 4. The paper family

A sheet of paper laid *on* a surface. **These are identical in both themes and
are deliberately not redefined under `.dark`.** Paper that went dark would stop
being paper.

| Token | Value |
|---|---|
| `--paper` | `#ffffff` |
| `--paper-ink` | `#252525` |
| `--paper-ink-soft` | `#545454` |
| `--paper-muted` | `#7d7d7d` |
| `--paper-line` | `#cfcfcf` |
| `--paper-accent` | `#1f6b33` |

**The rule: anything drawn on a sheet must use the paper tokens; anything drawn
on a surface must not.** The paper family carries its own ink, rule and accent
precisely so it never borrows the ones that flip. Used by the flowchart editor
page, published diagrams, and anything else that reads as a printed artefact.

---

## 5. Typography

Two faces, loaded via `next/font/google` in `app/layout.tsx`.

- **Inter** — weights 400, 500, 600, 700. Variable `--font-inter-sans`.
- **JetBrains Mono** — weights 400, 500, 600. Variable `--font-jetbrains-mono`.

Tailwind families:

| Utility | Resolves to |
|---|---|
| `font-display` | Inter |
| `font-body` | Inter |
| `font-heading` | Inter |
| `font-sans` | Inter (so shadcn components land on the site face) |
| `font-mono` | JetBrains Mono |

**Display and body are the same face.** Hierarchy comes from weight and size,
not from a second family. Do not introduce a display serif or a second sans.

Observed conventions:

- Page title: `font-display text-2xl font-bold text-ink`
- Section heading: `font-display text-lg font-bold text-ink`
- Body / description: `text-sm text-ink-soft`
- Meta and eyebrow labels: `text-[11px] font-bold uppercase tracking-wide text-slate`
- Footer and fine print: `text-xs text-ink-soft`

The site runs small. `text-sm` is the workhorse body size, not `text-base`.

---

## 6. Radius

`--radius: 0.75rem` (12px) is the root. The scale is computed from it.

| Utility | Multiplier | Value |
|---|---|---|
| `rounded-sm` | 0.6 | 7.2px |
| `rounded-md` | 0.8 | 9.6px |
| `rounded-lg` | 1.0 | 12px |
| `rounded-xl` | 1.4 | 16.8px |
| `rounded-2xl` | 1.8 | 21.6px |
| `rounded-3xl` | 2.2 | 26.4px |
| `rounded-4xl` | 2.6 | 31.2px |

In practice: `rounded-lg` for buttons and list rows, `rounded-xl` for cards,
`rounded-4xl` for badges (pill), `rounded-full` for avatars and icon buttons.

---

## 7. Layout

**Navbar** is fixed, full width, 80px tall (`h-20`), `z-50`, with
`border-b border-border bg-surface/90 backdrop-blur-md`. Its inner row is
`mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10`.

**The standard page shell**, used by most top-level routes:

```
<main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
```

`pt-32` clears the fixed navbar. `max-w-330` is Tailwind v4 spacing, so
82.5rem / 1320px. Narrow reading routes swap it for `max-w-2xl`.

Content widths in use, most common first: `max-w-2xl` (reading measure),
`max-w-330` (app width), `max-w-xl`, `max-w-5xl`, `max-w-4xl`, `max-w-3xl`.

**Footer**: `mt-24 border-t border-border bg-surface`, inner
`mx-auto max-w-330 px-6 py-12 sm:px-10`, link columns as
`grid grid-cols-2 gap-8 sm:grid-cols-4`.

Horizontal padding is always `px-6 sm:px-10`. Never anything else.

---

## 8. Components

`apps/web/components/ui/` holds the primitives. Built on **`@base-ui/react`,
not Radix.** Variants use `cva`. Class merging is `cn` from `@/lib/cn`. Icons
are `lucide-react`.

Available: `adaptive-slider`, `avatar`, `badge`, `button`, `card`, `dialog`,
`dropdown-menu`, `input`, `label`, `led`, `pagination`, `popover`, `rail`,
`scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`,
`table-frame`, `tabs`, `toggle`, `toggle-group`, `toggle-switch`, `tooltip`.

### Button

Variants: `default` (accent fill), `outline`, `secondary`, `ghost`,
`destructive` (tinted, not filled), `link`.

Sizes: `xs` (h-6), `sm` (h-7), `default` (h-8), `lg` (h-9), plus `icon`,
`icon-xs`, `icon-sm`, `icon-lg`. Two extra sizes exist for page-level calls to
action, since the shadcn scale tops out too timid for a form's primary button:

- `app` — `px-5 py-2.5 rounded-lg`
- `app-lg` — `px-7 py-3.5 text-base rounded-xl`

Focus is `focus-visible:ring-3 focus-visible:ring-ring/50`. Press is
`active:translate-y-px`.

### Card

```
rounded-xl border border-border bg-surface-card
```

**A card is only for framing something that genuinely needs a frame**: a live
widget, a demo canvas, an image preview. Lists of links are *not* cards. The
old card had a shadow, a 2xl radius and a lift-and-grow hover; six of them in a
grid competed with the page instead of sitting on it. All three were removed.

`CardLink` adds `hover:border-border-strong hover:bg-surface-2/40` and nothing
else.

### Rail — the primary list pattern

`components/ui/rail.tsx`. A copper spine with nodes hanging off it. **This
replaces the bordered card for anything ordered or nested**: a track holding
sections, a section holding lessons. A stack of identical rounded boxes said
none of that hierarchy, and the rail is the shape the rest of the site already
speaks in, since every widget on the site draws nodes joined by wires.

`RailItem` takes `href`, `title`, optional `meta` (right-aligned count),
optional `detail` (second line) and `filled` (a solid node marking a track's
entry point, so the eye lands on where to start rather than on the first row by
accident of position). Row hover is `hover:bg-copper-bg/40`.

`NodeGrid` is the same language for genuinely flat content: marker and hairline
stay, the connecting wire does not.

**When laying out a list, reach for the rail before the card.**

### Badge

Pill, `h-5 rounded-4xl px-2 text-xs font-medium`. Variants mirror the button's.

---

## 9. Article prose

Blog posts and tutorial lessons render a flat list of block components inside
`.article-prose`, which owns all vertical rhythm. **Block components carry no
margins of their own.**

| Relationship | Gap |
|---|---|
| Block to block | 1.25rem |
| Anything to `h2` | 2.75rem |
| Anything to `h3` | 2.25rem |
| Anything to `h4` | 1.75rem |
| Heading to whatever follows it | 0.6rem |
| Anything to a set-apart block | 2.25rem |
| Set-apart block to anything | 2.25rem |

Set-apart blocks are `figure, pre, table, hr, ul, ol, .not-prose`. Interactive
widgets carry `.not-prose`. Base colour is `--ink-soft` at `line-height: 1.65`.

A heading always hugs what it introduces, including a set-apart block.

---

## 10. Scoped subsystems

Both follow rule 3: aliases onto §3 tokens, so they inherit the palette and flip
with the theme without owning a dark rule.

**Flowchart editor** (`.fe-root`) aliases `--fe-shell`, `--fe-panel`,
`--fe-canvas`, `--fe-line`, `--fe-ink`, `--fe-accent` and friends onto the site
tokens, and exposes them as `bg-fe-panel`, `text-fe-ink` etc. Two do *not* flip,
because they must not: `--fe-page` is `--paper`, and `--fe-guide` is
`--signal-coral`, the one warning colour. One deliberate departure in dark mode:
`--fe-canvas` goes to `#101010`, darker than any site surface, because a white
sheet needs something to sit against and `--surface-3` leaves the paper glowing.

**Problem Studio** (`.studio`) aliases generic names (`--color-text`,
`--color-accent`) onto the real tokens, scoped to the class so the generic names
cannot collide.

---

## 11. Other conventions

**Scrollbars** are restyled globally: a 10px rounded hairline thumb in
`--border-strong` that darkens to `--slate` on hover, over an invisible track.
Every scroll container on the site matches. Do not restyle scrollbars locally.

**Motion is almost nonexistent.** There is exactly one keyframe on the site,
`nandscape-wire-flow`, which marches the hero wires' dashes when a signal is
high. Everything else is a plain CSS transition, typically `transition-colors`
at the default duration, or `120ms ease` in the editor. All motion is wrapped in
`prefers-reduced-motion` guards. Do not add entrance animations, parallax, or
scroll-triggered reveals.

**Code highlighting** is Shiki, dual-theme, via `lib/shiki-code.ts` — one
contract shared by the published code block, the blog editor preview, Problem
Studio and Markdown fences. Token spans carry `--shiki-light` / `--shiki-dark`
and the theme class picks one.

---

## 12. Stack facts that change generated code

- **Next.js 16 App Router**, React 19. Server components by default.
- **Tailwind v4, CSS-first.** There is no `tailwind.config.js`. Tokens are
  declared in `@theme inline` inside `globals.css`. To add a utility you add a
  `--color-*` line there.
- **`@base-ui/react`, not Radix**, under the shadcn-shaped primitives.
- `cva` for variants, `cn` from `@/lib/cn` for merging, `lucide-react` for icons.
- Path alias `@/*` maps to `apps/web/*`.
- Theme via `next-themes`, `attribute="class"`, `defaultTheme="system"`.
- The editor surfaces are built on React Flow (`@xyflow/react`). Per the
  project's own note: use React Flow for everything, including interactive
  components.

---

## 13. Quick anti-pattern list

Do not: use a hex value; use a Tailwind palette colour; add a second accent
hue; add a drop shadow; animate a hover into moving; put a list of links in a
card instead of a rail; let a paper surface flip in dark mode; write a dark-mode
colour rule in a component instead of aliasing a token; add `tailwind.config.js`;
reach for Radix; set `text-base` as body size; use horizontal padding other than
`px-6 sm:px-10`.

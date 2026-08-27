# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nandscape is a digital-logic (and, increasingly, data-structures & algorithms)
teaching site: an interactive circuit editor/simulator, puzzles, projects, a
blog, and tutorials. pnpm monorepo — `apps/web` (Next.js) plus three workspace
packages consumed as raw TypeScript source (no build step for the packages).

## Commands

Package manager is **pnpm 11** (pinned via `devEngines`; `corepack` will fetch
it). Node 22 in Docker, `>=18` for the engine.

| Task | Command |
|------|---------|
| Dev server (`web`, Next + Turbopack, :3000) | `pnpm dev` |
| Production build / start | `pnpm build` / `pnpm start` |
| Lint web app | `pnpm lint` |
| Prisma Studio | `pnpm studio` |
| Full stack in Docker (Postgres + web, hot reload) | `pnpm docker:dev` |
| Production image + Postgres in Docker | `pnpm docker:start` |
| Postgres only | `docker compose up postgres` |

There is **no test runner for `apps/web`** — only ESLint and `tsc`
(`cd apps/web && npx tsc --noEmit`).

### Database / Prisma (`packages/db`)

Run via `pnpm --filter @repo/db <script>`:

- `generate` — regenerate the client into `packages/db/generated/prisma/`
  (**committed to the repo**; run this after any `schema.prisma` change).
- `migrate:dev` — create + apply a migration in dev.
- `migrate:deploy` — apply pending migrations (prod).
- `reset` — drop and re-migrate (`--force`).

### Engine tests (`packages/engine`)

- All: `pnpm --filter @nandscape/engine test`
  (runs `node --test` via `tsx` over `src/simulation/tests/*.test.ts`).
- One file: `pnpm --filter @nandscape/engine exec tsx --test src/simulation/tests/simulator.test.ts`
- One test: append `--test-name-pattern "<name>"`.
- Typecheck: `pnpm --filter @nandscape/engine typecheck`.

### Seeding content

Requires the dev server running and (for most resources) `SEED_SECRET` set in
the root `.env`:

- `node seed/seed.mjs --base http://localhost:3000 [--force]` — POSTs the JSON
  files under `seed/*/` to the app's own API. Order matters (diagrams → posts →
  projects → tracks → sections → pages → puzzles); the script documents why.
- `node seed/export.mjs --base <url>` — the reverse: pulls content edited
  through the live admin UI back into the `seed/` JSON files.

## Environment

Copy `.env.example` → `.env` at the repo root. Key vars:

- `DATABASE_URL` — Postgres. Read by both `@repo/db` (Prisma) and the raw `pg`
  pool in the web app. `packages/db` loads `.env` itself via `prisma.config.ts`.
- `SEED_SECRET` — a seed-script-only credential the content-write API routes
  accept via an `x-seed-secret` header, so seeding needs no real login.
- `SITE_URL` — public origin; used to build the Google OAuth redirect URI and
  canonical URLs. Must match the reverse-proxy host in production.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google sign-in.
- `RESEND_API_KEY` / `EMAIL_FROM` — email-verification links. Without the key,
  links are logged to the server console instead of sent.
- `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` — one-time admin bootstrap
  via the seed script (`/api/admin/bootstrap`).

## Architecture

### Workspace layout

- **`apps/web`** (package name `web`) — Next.js 16 App Router, React 19,
  Tailwind v4, Zustand. Path alias `@/*` → `apps/web/*`.
- **`packages/engine`** (`@nandscape/engine`) — framework-agnostic digital
  circuit simulation engine. Imported as TS source (`main: src/index.ts`).
- **`packages/db`** (`@repo/db`) — Prisma 7 schema, committed generated client,
  migrations. Exports a singleton `prisma` (via `@prisma/adapter-pg`).
- **`packages/auth`** (`@repo/auth`) — session / password / email-verification /
  user logic. Depends on `@repo/db`. Imported as TS source.

### The simulation engine

**Read `packages/engine/ARCHITECTURE.md` before modifying anything here.** It is
data-oriented (Structure-of-Arrays), event-driven, and graph-based:

- `src/data/` — pure storage, no simulation logic: `CircuitData` (the netlist),
  `CircuitTopology` (a precompiled CSR dependency graph), `EventQueue` (binary
  min-heap of scheduled signal changes), `RuntimeState` (the mutable per-run
  state). Structure vs. derived graph vs. runtime state are deliberately
  separate objects so a circuit compiles once and can be reset/re-run cheaply.
- `src/simulation/` — algorithms over that data: `gate-evaluators.ts` (pure
  truth tables over **4-value logic**: `LOW`/`HIGH`/`FLOAT`/`UNKNOWN`),
  `compiler.ts`, `simulator.ts` (the delta-cycle main loop), `builder.ts`
  (ergonomic constructors), `subcircuit.ts`.
- There is **no `SUBCIRCUIT` gate type** — hierarchical designs are *flattened*
  into the parent's flat tables at construction time, so the simulator never
  knows subcircuits exist (ARCHITECTURE.md §11).
- External stimulus vs. gate-derived events use different staleness rules
  (`EXTERNAL_GENERATION` sentinel) — ARCHITECTURE.md §8.

### Web app data access — two paths to one Postgres

1. **Prisma** via `import { prisma } from "@repo/db"` — most routes.
2. **Raw `pg` pool** via `apps/web/lib/db/client.ts`'s `query()` — where hand-
   written SQL is preferred.

### Request / auth flow

- `apps/web/middleware.ts` — 308-redirects to HTTPS based on `x-forwarded-proto`
  (the app runs behind a reverse proxy that terminates TLS). Missing header or
  `localhost` = passthrough, so `pnpm dev` is unaffected.
- Route handlers in `app/api/**` authenticate via `getCurrentUser()`
  (`lib/auth/current-user.ts` → session cookie → `@repo/auth`). Sessions are
  opaque tokens, SHA-hashed in the `Session` table, 30-day expiry with sliding
  renewal under 15 days. Auth methods: email/password and Google OAuth.
- Content-write routes additionally accept the `x-seed-secret` header
  (`lib/auth/seed-secret.ts`); `resolveSeedOwnerId()` maps a seed request to an
  admin owner so `seed/seed.mjs` can create content without logging in.

### Circuit editor (`/logic-editor`, `/puzzles`, `/projects`, embeds)

- Built entirely on **React Flow** (`@xyflow/react`). Per `TODO.md`: "Use react
  flow for EVERYTHING including interactive components." Graphs are
  `EditorNode` / `EditorEdge` (`apps/web/types/editor.ts`).
- State lives in **Zustand** stores under `apps/web/store/` (barrel
  `store/index.ts`): `editor-store` (graph), `simulation-store`, `history-store`
  (undo/redo), `live-signals-store`, `subcircuit-blocks-store`, `scopes-store`, …
- `apps/web/lib/editor/compile-circuit.ts` translates a React Flow graph into an
  `@nandscape/engine` `CircuitData` + compiled topology.
  `hooks/use-engine-simulation.ts` runs a realtime rAF loop with debounced
  auto-compile.
- **Scopes** = project tabs (CircuitVerse-style). Any scope can be instantiated
  as a subcircuit block inside another. `Project.nodes`/`edges` always mirror
  `scopes[0]` for back-compat with embeds/thumbnails/sitemap; `Project.blocks`
  snapshots referenced custom block definitions so a project is self-contained
  (`lib/editor/subcircuit-flatten.ts`).
- `apps/web/components/editor/` (canvas, `nodes/`, `edges/`, `inspector/`,
  `toolbar/`, `sidebar/`, `context-menu/`, `dialogs/`) — per-node-type behavior
  is wired through `*-registry` modules rather than switch statements.

### Content system (blog + tutorials)

- `BlogPost.body` and `TutorialPage.body` are JSON **block arrays**, rendered by
  `apps/web/components/content/blocks/block-renderer.tsx`. Blocks include
  interactive widgets: circuit embeds, flowcharts, graph and sorting
  visualizers.
- Tutorial hierarchy: `TutorialTrack` → `TutorialSection` → `TutorialPage`
  (each layer resolves its parent by slug). `trackId` is nullable — untracked
  sections still render.
- Authored either through the in-app Lexical editor
  (`apps/web/components/blog-editor/`) or the `seed/` JSON files.
- `DiagramPreset` — named flowchart/graph specs looked up by slug, moved out of
  the bundle so fixing a teaching diagram isn't a code deploy.
- DS&A visualization logic lives in `apps/web/lib/` (`backtracking/`, `dp/`,
  `graph/`, `sorting/`, `kmap/`, `flowchart/`, `tree-layout.ts`).

## Gotchas

- **Regenerate the Prisma client** (`pnpm --filter @repo/db generate`) after
  editing `schema.prisma` — `packages/db/generated/` is committed.
- `next.config.ts`: `output: "standalone"`; `serverExternalPackages: ["shiki"]`
  (bundling Shiki silently breaks syntax highlighting); `turbopack.root` points
  at the repo root because this is a monorepo; `allowedDevOrigins` lists
  `nandscape.dev` and a LAN IP.
- Docker dev runs `next dev --webpack` (not Turbopack) with `WATCHPACK_POLLING`
  so bind-mounted file changes are noticed.
- "Exactly one active row" invariants (`FeaturedCircuit`) are enforced in
  application code (a single atomic UPDATE), not by DB constraints.
- Native build deps (prisma, esbuild, sharp, …) are allow-listed under
  `allowBuilds` in `pnpm-workspace.yaml`.
- No Cursor/Copilot rule files and no README exist in this repo.

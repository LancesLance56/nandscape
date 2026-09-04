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
  projects → tracks → sections → pages → puzzles → practices); the script
  documents why.
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

### Coding practice (`/practices`)

Reader-submitted code, run in a sandbox and graded. LeetCode-style: the user
implements one function, never a whole program.

- **Languages are Python, JavaScript and C++** — the three the seeded tutorials
  teach in. Adding C++ was one new `LanguageDefinition` plus one entry in
  `LANGUAGES` (`apps/web/lib/practice/languages.ts`), with no schema, API or UI
  change: exactly what `CodingProblem.signature` recording parameter *types*
  was reserved for, since a typed driver cannot work from the function name
  alone.
- The C++ driver (`lib/practice/harnesses/cpp.ts`) generates a typed `main()`
  from the signature and carries its own ~100-line JSON parser rather than
  vendoring one — a general library would be tens of thousands of header lines
  recompiled on every submission. `int` maps to `long long`, not `int`:
  constraints here routinely reach 1e9.
- `#line 1 "solution.cpp"` is emitted above the submitted code, and the JSON
  layer sits *below* it. Without that, every compile diagnostic cites a line a
  few hundred down — useless in the one language where compile errors are
  common.
- Per-case stdout is captured at the **file-descriptor** level (`dup2` onto a
  temp file), not by swapping `std::cout`'s streambuf, so `printf` debugging is
  captured too.
- **Execution never happens in the Next.js process.** Every run crosses into
  the `runner` service over HTTP (`apps/web/lib/practice/engine.ts`), which
  executes the submission in a throwaway container built from an official
  language image (`--network none --read-only --cap-drop ALL --pids-limit`,
  unprivileged user, tmpfs work dir). The service publishes no port and its
  address is parsed from env once at module load — never from a request, which
  is what keeps the judge from becoming an SSRF proxy.
- **Why not Piston:** its image is published for `linux/amd64` only, so it
  cannot run on an arm64 server. Official language images are multi-arch, so
  the same engine is native on an amd64 dev machine and an arm64 host — and one
  engine across both is what stops timing bugs hiding until production.
- **`services/runner` holds the Docker socket, and nothing else does.** That is
  root-equivalent on the host, which is exactly why it lives in a service that
  does one thing and never sees outside traffic. Submitted source never reaches
  a command line: it travels base64-encoded in an env var and is decoded inside
  the container, so quoting in a submission cannot alter the command. On a
  shared host, front it with a Docker socket proxy.
- **Three containment layers**, none of which replaces the others: no published
  port, a process-wide concurrency gate (`MAX_CONCURRENT_EXECUTIONS`), and
  per-user rate limits. All the ceilings live in `lib/practice/limits.ts`, and
  `buildLimits()` clamps a problem's requested limits rather than trusting them.
- **One engine call per Run/Submit**, not one per test case: the driver reads
  `{"cases":[{"args":[...]}]}` from stdin and emits one sentinel-prefixed
  result line per case. `execute.ts` attributes a process death (timeout, OOM)
  to the first case with no result line, and marks the rest "not run".
- **Hidden tests and reference solutions are separate columns**, and
  `PUBLIC_COLUMNS` in `lib/practice/practice-records.ts` simply does not name
  them — leaking one takes writing a different query, not forgetting to strip a
  field.
- Run = visible cases, records nothing, works signed-out. Submit = every case,
  writes a `CodingSubmission` row, requires an account. Solved status is a
  `groupBy` over accepted rows, not a denormalized flag.
- Indent width is a per-reader preference (`lib/practice/indent-preference.ts`),
  default **4**, offered as 2/4/8 in the workspace header and shared by the
  learner's editor and Problem Studio's code fields. Read via
  `useSyncExternalStore` so the server can render the default while the client
  renders the stored value — no hydration mismatch, no setState in an effect.
  CodeMirror applies it through a `Compartment`, so changing it reconfigures
  the running editor instead of rebuilding it and discarding undo history.
- Editor is **CodeMirror 6**, not Monaco — ~50-100 kB and mobile-capable,
  against Monaco's 2-5 MB and effectively unusable on touch.
- Authored two ways, both hitting the same validated API: the seed pipeline
  (`seed/practices/*.json`) and **Problem Studio**, the admin editor at
  `/admin/practices/[slug]` (`/new` to create). The editor is full-screen and
  sits outside the `(dashboard)` group, like the post and tutorial editors.
- The authoring rules live in `lib/practice/validate.ts` and are the single
  source for both the API's hard reject and the editor's live Checks rail — so
  a green rail means the save will actually be accepted.
- `GET /api/admin/practices/[slug]` is the only route that returns
  `hiddenTests` and `solutions`. It is a separate path from the public
  `/api/practices/[slug]` rather than a flag on it, so nothing but an ADMIN
  check stands between the two shapes.
- Problem Studio's *layout* comes from a Claude Design mock; its *look* is the
  site's own. `components/practices/admin/problem-studio.css` aliases generic
  names (`--color-text`, `--color-accent`, …) onto Nandscape's real tokens
  (`--ink`, `--copper`, `--surface`, `--font-display`), which is what lets the
  page follow the light/dark toggle without a single dark rule of its own —
  those tokens already flip under `.dark`. Still scoped to `.studio`, because
  the generic names would otherwise collide.
- `CodingProblem.statement` is **Markdown**, not a ContentBlock array — a
  problem statement is written by whoever wrote the problem, so its headings
  and constraint layout are theirs to choose. Rendered server-side by
  `components/practices/statement-markdown.tsx` (react-markdown + remark-gfm)
  inside the site's existing `article-prose` wrapper.
- One highlight contract for the whole site: `lib/shiki-code.ts` holds the
  dual-theme options and the `pre` transformer. The published code block, the
  blog editor's live preview, Problem Studio's code fields and Markdown fenced
  blocks all go through it — previously three copies, with comments telling
  each other to stay in step.
- **Deployment requirement:** the reverse proxy must *overwrite*
  `x-forwarded-for` (nginx: `proxy_set_header X-Forwarded-For $remote_addr`),
  not append to it. Anonymous Run requests are rate-limited on a hash of that
  header; if a caller can set it, they mint a fresh bucket per request.
  `RATE_LIMIT_ANON_TOTAL_PER_MIN` is a shared ceiling across all anonymous
  callers that bounds the damage either way — and bounds aggregate anonymous
  load regardless of spoofing. Behind Cloudflare, key off `CF-Connecting-IP`
  instead.
- A problem's **slug is fixed after creation**. The UPDATE addresses the row by
  slug and never sets it, `coding_drafts` is keyed by `problem_slug`, and the
  slug is the public URL — so `updatePracticeRecord` rejects a change rather
  than silently no-op'ing, and the editor disables the field.
- `seed/export.mjs` reads practices from `/api/admin/practices/[slug]`, not the
  public list, because only that carries `hiddenTests`, `solutions` and
  `epsilon`. It needs `SEED_SECRET` and fails loudly without it — an export
  that silently drops the secret half is worse than none.
- Content routes update with **PATCH**, not PUT — `seed.mjs --force` issues
  PATCH, so a PUT-only route 405s on every re-seed.
- `pnpm practice:verify-harness` runs the generated drivers against the local
  `python`/`node`/`g++` and checks the whole protocol. Run it after touching
  anything under `lib/practice/harnesses/`. The C++ section skips itself when
  the local toolchain cannot produce a binary — that path only ever runs on
  Linux inside the engine, where it is covered end to end.
- The runner needs each language image present before anything can run:
  `pnpm engine:prepare` pulls them. It is a one-shot `bootstrap`-profile
  service, so it works against the prod stack as well as `dev`.

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
- Without `pnpm engine:prepare` every submission fails: the runner cannot pull
  images itself (`--network none` applies to the submission container, but the
  daemon still needs the image locally on first use).
- `MAX_BATCH_WALL_MS` in `lib/practice/limits.ts` must stay under the runner's
  own `HARD_LIMITS.wallMs`. The runner **clamps** rather than rejects, so a
  larger app-side value is silently cut short instead of erroring.
- The tmpfs the submission writes into needs `mode=1777`. It otherwise mounts
  root-owned 0755 and the unprivileged container user cannot write its own
  source file — which surfaces as "can't open file", not as a permission error.
- How MLE is told from TLE: both end as exit 137, so the runner inspects
  `State.OOMKilled` before removing the container and reports a memory kill as
  `code 137, signal null` and a timeout as `code null, signal SIGKILL`.
  `classifyProcessFailure()` keys off exactly that — it predates this engine
  and was left unchanged, because Docker uses the same convention Piston did.
- No Cursor/Copilot rule files and no README exist in this repo.

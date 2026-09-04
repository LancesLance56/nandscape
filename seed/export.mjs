import { writeFile, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The reverse of seed.mjs: pulls content back out of a running site and
 * writes it into this directory's JSON files, in the same shape seed.mjs
 * expects to read.
 *
 * The use case this exists for: editing a tutorial (or post, or puzzle)
 * through the site's own admin editor - live, or on a deployed copy - and
 * wanting that edit reflected in the dev workspace's seed files afterward,
 * without hand-copying JSON out of a database client. Point this at
 * wherever the edit was made and it does the copying.
 *
 * Usage:
 *   node seed/export.mjs --base http://localhost:3000
 *   node seed/export.mjs --base https://nandscape.dev --only tutorials
 *   node seed/export.mjs --base https://nandscape.dev --drafts \
 *     --email you@example.com --password ...
 *
 * --drafts additionally exports unpublished posts, which needs an admin
 * session; --email/--password log one in for the run. Tutorials and
 * puzzles have no draft/published split at the API level, so --drafts
 * does not change what gets pulled for those.
 *
 * Projects are not covered here. Unlike everything else in this directory,
 * a project belongs to one user rather than being site content, and the
 * API only ever returns the signed-in caller's own projects - there is no
 * "list every project" endpoint to export from.
 */

const here = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
}
const has = (name) => args.includes(`--${name}`);

const base = flag("base", "http://localhost:3000");
const only = flag("only"); // e.g. "tutorials" - restricts to one resource type
const wantDrafts = has("drafts");
const email = flag("email");
const password = flag("password");

let sessionCookie = null;

async function login() {
  if (!email || !password) {
    console.log("- skipped      admin login (pass --email and --password to export drafts)");
    return;
  }
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error(`✗ login failed  ${res.status} ${await res.text()}`);
    return;
  }
  // Node's fetch does not carry cookies between calls the way a browser
  // does, so the session cookie from Set-Cookie is captured here and
  // attached by hand to every request that needs it.
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) sessionCookie = setCookie.split(";")[0];
  console.log(`✓ logged in    as ${email}`);
}

async function get(pathname) {
  const res = await fetch(`${base}${pathname}`, {
    headers: sessionCookie ? { cookie: sessionCookie } : {},
  });
  if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status}`);
  return res.json();
}

/**
 * Postgres round-trips a timestamp with an explicit ".000" for exact
 * seconds, where every hand-written seed file just writes "Z". Stripping
 * that keeps a re-export of untouched content byte-identical to the
 * original instead of diffing on a distinction with no difference.
 */
function normalizeTimestamp(value) {
  return typeof value === "string" ? value.replace(/\.000Z$/, "Z") : value;
}

/** Drops null/undefined keys so the export reads like a hand-written seed file rather than a database dump. */
function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Reads back whatever is already on disk for a slug, or null if nothing is.
 *
 * Used to carry forward the parts of a resource the API deliberately never
 * returns - a coding problem's hidden tests and reference solutions - so an
 * export round trip preserves them instead of quietly deleting the half of
 * the problem that makes grading work.
 */
async function readSeedFile(dir, slug) {
  const existing = await readdir(dir).catch(() => []);
  for (const f of existing) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      if (data.slug === slug) return data;
    } catch {
      // Not valid JSON, or no slug field - not a match either way.
    }
  }
  return null;
}

/**
 * Writes `content` under `dir`, reusing whichever existing filename already
 * holds this slug (tutorials are numbered by hand for reading order, and a
 * fresh export should not renumber them) or, for a slug with no local file
 * yet, `<slug>.json` with no prefix - left for the author to number.
 */
async function writeSeedFile(dir, slug, content) {
  const existing = await readdir(dir).catch(() => []);
  let filename = `${slug}.json`;
  for (const f of existing) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      if (data.slug === slug) {
        filename = f;
        break;
      }
    } catch {
      // Not valid JSON, or no slug field - not a match either way.
    }
  }
  const isNew = filename === `${slug}.json` && !existing.includes(filename);
  await writeFile(path.join(dir, filename), JSON.stringify(content, null, 2) + "\n", "utf8");
  console.log(`${isNew ? "✓ new file    " : "↻ overwritten "} ${path.relative(here, path.join(dir, filename))}`);
}

/**
 * Tracks and sections are fetched unconditionally, `--only` or not, because
 * tutorials need the id -> slug maps to write a correct `sectionSlug` even
 * on a run that isn't exporting section files themselves. `write` gates
 * only the file-writing side.
 */
async function exportTutorialTracks(write) {
  const { tracks } = await get("/api/tutorial-tracks");
  const dir = path.join(here, "tutorial-tracks");
  const bySlug = new Map();
  for (const t of tracks) {
    bySlug.set(t.id, t.slug);
    if (write) {
      await writeSeedFile(dir, t.slug, prune({ slug: t.slug, title: t.title, description: t.description, position: t.position }));
    }
  }
  return bySlug;
}

async function exportTutorialSections(trackIdToSlug, write) {
  const { sections } = await get("/api/tutorial-sections");
  const dir = path.join(here, "tutorial-sections");
  const bySlug = new Map();
  for (const s of sections) {
    bySlug.set(s.id, s.slug);
    if (write) {
      await writeSeedFile(
        dir,
        s.slug,
        prune({ slug: s.slug, title: s.title, position: s.position, trackSlug: trackIdToSlug.get(s.trackId) }),
      );
    }
  }
  return bySlug;
}

async function exportTutorials(sectionIdToSlug) {
  const { pages } = await get("/api/tutorials");
  const dir = path.join(here, "tutorials");
  for (const summary of pages) {
    const { page } = await get(`/api/tutorials/${summary.slug}`);
    await writeSeedFile(
      dir,
      page.slug,
      prune({
        slug: page.slug,
        title: page.title,
        excerpt: page.excerpt,
        authorName: page.authorName,
        status: page.status,
        publishedAt: normalizeTimestamp(page.publishedAt),
        tags: page.tags,
        sectionSlug: sectionIdToSlug.get(page.sectionId),
        position: page.position,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        keywords: page.keywords,
        body: page.body,
      }),
    );
  }
}

async function exportPosts() {
  const { posts } = await get(wantDrafts ? "/api/posts?status=all" : "/api/posts");
  const dir = path.join(here, "posts");
  for (const summary of posts) {
    const { post } = await get(`/api/posts/${summary.slug}${wantDrafts ? "?preview=1" : ""}`);
    await writeSeedFile(
      dir,
      post.slug,
      prune({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        authorName: post.authorName,
        status: post.status,
        coverImage: post.coverImage,
        publishedAt: normalizeTimestamp(post.publishedAt),
        tags: post.tags,
        body: post.body,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        keywords: post.keywords,
      }),
    );
  }
}

async function exportPuzzles() {
  const { puzzles } = await get("/api/puzzles");
  const dir = path.join(here, "puzzles");
  for (const puzzle of puzzles) {
    const spec = puzzle.spec ?? {};
    await writeSeedFile(
      dir,
      puzzle.slug,
      prune({
        slug: puzzle.slug,
        title: puzzle.title,
        description: puzzle.description,
        difficulty: puzzle.difficulty,
        tags: spec.tags,
        gateBudget: spec.gateBudget,
        allowedGateTypes: spec.allowedGateTypes,
        disallowedGateTypes: spec.disallowedGateTypes,
        gateRestrictionDisplay: spec.gateRestrictionDisplay,
        inputs: spec.inputs,
        outputs: spec.outputs,
        inputDisplay: spec.inputDisplay,
        outputDisplay: spec.outputDisplay,
        testCases: spec.testCases,
      }),
    );
  }
}

/**
 * Coding problems.
 *
 * Note what cannot come back this way: the API's list endpoint deliberately
 * omits hidden test cases and reference solutions, so an exported file has
 * `hiddenTests` and `solutions` missing rather than empty. Re-seeding one of
 * these over a problem that had hidden tests would therefore drop them, which
 * is why the exported file keeps whatever the local copy already had - the
 * secret half of a problem lives in the repo, not on the server.
 */
async function exportPractices() {
  const { practices } = await get("/api/practices");
  const dir = path.join(here, "practices");
  for (const practice of practices) {
    const existing = await readSeedFile(dir, practice.slug);
    await writeSeedFile(
      dir,
      practice.slug,
      prune({
        slug: practice.slug,
        title: practice.title,
        summary: practice.summary,
        difficulty: practice.difficulty,
        tags: practice.tags,
        languages: practice.languages,
        compareMode: practice.compareMode,
        timeLimitMs: practice.timeLimitMs,
        memoryLimitMb: practice.memoryLimitMb,
        signature: practice.signature,
        statement: practice.statement,
        starterCode: practice.starterCode,
        visibleTests: (practice.visibleTests ?? []).map(({ index, ...rest }) => rest),
        hiddenTests: existing?.hiddenTests,
        solutions: existing?.solutions,
      }),
    );
  }
}

async function main() {
  console.log(`Exporting from ${base}${only ? ` (only: ${only})` : ""}`);
  if (wantDrafts) await login();

  const wants = (name) => !only || only === name;
  const attempt = async (name, fn) => {
    try {
      return await fn();
    } catch (error) {
      console.error(`✗ ${name} export failed:`, error instanceof Error ? error.message : error);
      return undefined;
    }
  };

  // Tracks and sections are always fetched, even on a run scoped to some
  // other resource, since tutorials need the id -> slug maps to write a
  // correct sectionSlug. Only the write side is gated by `wants`.
  const trackIdToSlug = (await attempt("tutorial-tracks", () => exportTutorialTracks(wants("tutorial-tracks")))) ?? new Map();
  const sectionIdToSlug =
    (await attempt("tutorial-sections", () => exportTutorialSections(trackIdToSlug, wants("tutorial-sections")))) ?? new Map();
  if (wants("tutorials")) await attempt("tutorials", () => exportTutorials(sectionIdToSlug));
  if (wants("posts")) await attempt("posts", exportPosts);
  if (wants("puzzles")) await attempt("puzzles", exportPuzzles);
  if (wants("practices")) await attempt("practices", exportPractices);

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

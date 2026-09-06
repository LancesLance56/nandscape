/**
 * Convert every stored diagram from the old chart format to a drawing.
 *
 * Run once. It walks three places a `FlowchartSpec` can be hiding - the
 * `diagram_presets` table, inline blocks inside published posts and tutorial
 * pages, and the `seed/` JSON that would otherwise put the old format back on
 * the next re-seed - and rewrites each one through `docFromSpec`.
 *
 * The conversion is exactly what the reading side already does on the fly, so
 * running this changes nothing a reader can see. What it changes is which
 * format is load-bearing: after this, the auto-layout engine is dead code kept
 * only for anything that shows up later, and every diagram on the site is a
 * drawing whose coordinates someone can edit.
 *
 *   pnpm diagrams:migrate            # rewrite the seed files and the database
 *   pnpm diagrams:migrate --dry      # report what would change, touch nothing
 *   pnpm diagrams:migrate --files    # seed JSON only, no database needed
 *
 * Safe to run twice: a drawing is recognised and skipped.
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { docFromSpec, isLegacySpec } from "../lib/flowchart-editor/from-spec";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const SEED = path.join(ROOT, "seed");

// Next loads the root .env for us; a bare script does not, and the database
// step is otherwise a confusing SASL error rather than "no connection string".
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(ROOT, file));
  } catch {
    // Absent, which is fine - `--files` needs neither.
  }
}

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const FILES_ONLY = args.has("--files");

let converted = 0;
let skipped = 0;

/* -------------------------------------------------------------------------
 * The conversion, applied wherever a spec turns up
 * ---------------------------------------------------------------------- */

function convert(value: unknown, where: string): unknown | null {
  if (!isLegacySpec(value)) {
    skipped += 1;
    return null;
  }
  const doc = docFromSpec(value);
  const page = doc.pages[0];
  const shapes = page.elements.filter((e) => e.kind === "shape").length;
  const lines = page.elements.filter((e) => e.kind === "line").length;
  const steps = page.walkthrough?.length ?? 0;
  console.log(
    `  ${where}: ${shapes} shapes, ${lines} connectors` +
      (steps ? `, ${steps} walkthrough steps` : "") +
      (DRY ? "  (dry run)" : ""),
  );
  converted += 1;
  return doc;
}

/**
 * Walk a content-block array and convert any inline diagram in it.
 *
 * Blocks are arbitrarily nested in principle, so this recurses rather than
 * assuming a flat list - a diagram inside a two-column block is still a
 * diagram, and missing it would leave exactly one page on the old format.
 */
function convertBlocks(blocks: unknown, where: string): boolean {
  if (!Array.isArray(blocks)) return false;
  let changed = false;

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;

    if (b.type === "interactive" && typeof b.widget === "string" && b.widget.startsWith("flowchart")) {
      const data = b.data as Record<string, unknown> | undefined;
      if (data && isLegacySpec(data.chart)) {
        const doc = convert(data.chart, `${where} → ${b.widget}`);
        if (doc && !DRY) data.chart = doc;
        changed = true;
      }
    }

    for (const value of Object.values(b)) {
      if (Array.isArray(value) && convertBlocks(value, where)) changed = true;
    }
  }

  return changed;
}

/* -------------------------------------------------------------------------
 * Seed files
 * ---------------------------------------------------------------------- */

async function migrateSeedFiles(): Promise<void> {
  console.log("\nseed/diagrams");
  const diagramDir = path.join(SEED, "diagrams");
  for (const name of (await readdir(diagramDir)).filter((n) => n.endsWith(".json"))) {
    const file = path.join(diagramDir, name);
    const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    if (record.kind !== "flowchart") continue;
    const doc = convert(record.spec, name);
    if (doc && !DRY) {
      record.spec = doc;
      await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    }
  }

  for (const dir of ["tutorials", "posts"]) {
    console.log(`\nseed/${dir}`);
    const full = path.join(SEED, dir);
    for (const name of (await readdir(full)).filter((n) => n.endsWith(".json"))) {
      const file = path.join(full, name);
      const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      if (convertBlocks(record.body, name) && !DRY) {
        await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
      }
    }
  }
}

/* -------------------------------------------------------------------------
 * Database
 * ---------------------------------------------------------------------- */

async function migrateDatabase(): Promise<void> {
  // The raw pool rather than Prisma: `apps/web` talks to Postgres through
  // lib/db/client, and adding a Prisma dependency to the web app just for a
  // one-shot script would be a strange thing to leave behind. Imported lazily
  // so `--files` needs neither DATABASE_URL nor a running database.
  const { pool } = await import("../lib/db/client");

  const table = async (
    name: string,
    select: string,
    apply: (row: Record<string, unknown>) => Promise<void>,
  ) => {
    console.log(`\n${name}`);
    const { rows } = await pool.query(select);
    for (const row of rows) await apply(row);
  };

  await table(
    "diagram_presets",
    "SELECT id, slug, spec FROM diagram_presets WHERE kind = 'flowchart'",
    async (row) => {
      const doc = convert(row.spec, String(row.slug));
      if (doc && !DRY) {
        await pool.query("UPDATE diagram_presets SET spec = $1, updated_at = now() WHERE id = $2", [
          JSON.stringify(doc),
          row.id,
        ]);
      }
    },
  );

  for (const [name, column] of [
    ["tutorial_pages", "body"],
    ["blog_posts", "body"],
  ] as const) {
    await table(name, `SELECT id, slug, ${column} FROM ${name}`, async (row) => {
      const body = row[column];
      if (convertBlocks(body, String(row.slug)) && !DRY) {
        await pool.query(`UPDATE ${name} SET ${column} = $1 WHERE id = $2`, [
          JSON.stringify(body),
          row.id,
        ]);
      }
    });
  }

  await pool.end();
}

/* -------------------------------------------------------------------------
 * Go
 * ---------------------------------------------------------------------- */

async function main(): Promise<void> {
  console.log(DRY ? "Dry run - nothing will be written." : "Converting diagrams to drawings.");

  await migrateSeedFiles();
  if (!FILES_ONLY) {
    try {
      await migrateDatabase();
    } catch (error) {
      console.error(
        `\nThe database step failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(
        "The seed files above are converted. Re-run without --files once Postgres is reachable,\n" +
          "or re-seed from the converted files with seed/seed.mjs --force.",
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log(
    `\nDone. ${converted} converted, ${skipped} already drawings or not a flowchart.` +
      (DRY ? " (dry run - nothing written)" : ""),
  );
}

void main();

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const baseArgIndex = args.indexOf("--base");
const base = baseArgIndex !== -1 ? args[baseArgIndex + 1] : "http://localhost:3000";
const force = args.includes("--force");

async function seedResource(label, dir, apiPath) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();

  if (files.length === 0) {
    console.log(`No ${label} seed files found in`, dir);
    return;
  }

  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    const payload = JSON.parse(raw);

    const res = await fetch(`${base}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });

    if (res.status === 201) {
      console.log(`✓ created      ${label}/${payload.slug}`);
      continue;
    }

    if (res.status === 409) {
      if (!force) {
        console.log(`- skipped      ${label}/${payload.slug} (already exists, rerun with --force to overwrite)`);
        continue;
      }

      const patchRes = await fetch(`${base}${apiPath}/${payload.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: raw,
      });
      if (patchRes.ok) {
        console.log(`↻ overwritten  ${label}/${payload.slug}`);
      } else {
        const body = await patchRes.text();
        console.error(`✗ overwrite failed  ${label}/${payload.slug},  ${patchRes.status} ${body}`);
      }
      continue;
    }

    const body = await res.text();
    console.error(`✗ failed       ${label}/${payload.slug},  ${res.status} ${body}`);
  }
}

async function main() {
  await seedResource("posts", path.join(here, "posts"), "/api/posts");
  await seedResource("tutorial-sections", path.join(here, "tutorial-sections"), "/api/tutorial-sections");
  await seedResource("tutorials", path.join(here, "tutorials"), "/api/tutorials");
  await seedResource("puzzles", path.join(here, "puzzles"), "/api/puzzles");

  console.log(`\nDone. Visit ${base}/blog, ${base}/tutorials, and ${base}/puzzles`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});

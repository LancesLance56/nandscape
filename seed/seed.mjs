import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(here, "posts");

const args = process.argv.slice(2);
const baseArgIndex = args.indexOf("--base");
const base = baseArgIndex !== -1 ? args[baseArgIndex + 1] : "http://localhost:3000";
const force = args.includes("--force");

async function main() {
  const files = (await readdir(postsDir)).filter((f) => f.endsWith(".json")).sort();

  if (files.length === 0) {
    console.log("No seed files found in", postsDir);
    return;
  }

  for (const file of files) {
    const raw = await readFile(path.join(postsDir, file), "utf8");
    const payload = JSON.parse(raw);

    const res = await fetch(`${base}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });

    if (res.status === 201) {
      console.log(`✓ created      ${payload.slug}`);
      continue;
    }

    if (res.status === 409) {
      if (!force) {
        console.log(`- skipped      ${payload.slug} (already exists, rerun with --force to overwrite)`);
        continue;
      }

      const patchRes = await fetch(`${base}/api/posts/${payload.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: raw,
      });
      if (patchRes.ok) {
        console.log(`↻ overwritten  ${payload.slug}`);
      } else {
        const body = await patchRes.text();
        console.error(`✗ overwrite failed  ${payload.slug} — ${patchRes.status} ${body}`);
      }
      continue;
    }

    const body = await res.text();
    console.error(`✗ failed       ${payload.slug} — ${res.status} ${body}`);
  }

  console.log(`\nDone. Visit ${base}/blog`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});

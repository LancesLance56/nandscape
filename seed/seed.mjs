import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const baseArgIndex = args.indexOf("--base");
const base = baseArgIndex !== -1 ? args[baseArgIndex + 1] : "http://localhost:3000";
const force = args.includes("--force");

async function seedResource(label, dir, apiPath, headers) {
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
      headers,
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
        headers,
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

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !username || !password) {
    console.log("- skipped      admin (set ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD to create one)");
    return;
  }

  const res = await fetch(`${base}/api/admin/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });

  if (res.status === 201) {
    console.log(`✓ created      admin/${username}`);
    return;
  }

  if (res.status === 403) {
    console.log("- skipped      admin (an account already exists, bootstrap only runs once)");
    return;
  }

  const body = await res.text();
  console.error(`✗ failed       admin/${username},  ${res.status} ${body}`);
}

/**
 * POST /api/posts requires an authenticated ADMIN session - but this script
 * has no login of its own, and tying it to one specific admin's password
 * would break the moment that password changes (or for anyone else who
 * doesn't know it). SEED_SECRET is a separate, seed-only credential the
 * posts route also accepts (see isAuthorizedAdminRequest in
 * apps/web/lib/auth/seed-secret.ts) via this header, sidestepping real user
 * credentials entirely.
 */
function seedHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (process.env.SEED_SECRET) headers["x-seed-secret"] = process.env.SEED_SECRET;
  return headers;
}

async function main() {
  await seedAdmin();

  if (!process.env.SEED_SECRET) {
    console.log("- warning      SEED_SECRET not set,  posts/route.ts requires an admin session or this secret, seeding posts will 403 without it");
  }

  await seedResource("posts", path.join(here, "posts"), "/api/posts", seedHeaders());
  await seedResource("tutorial-sections", path.join(here, "tutorial-sections"), "/api/tutorial-sections", seedHeaders());
  await seedResource("tutorials", path.join(here, "tutorials"), "/api/tutorials", seedHeaders());
  await seedResource("puzzles", path.join(here, "puzzles"), "/api/puzzles", seedHeaders());

  console.log(`\nDone. Visit ${base}/blog, ${base}/tutorials, and ${base}/puzzles`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});

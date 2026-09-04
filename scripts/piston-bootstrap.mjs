#!/usr/bin/env node
/**
 * Install the language runtimes /practices needs into the Piston container.
 *
 * The Piston image ships with no languages at all - it downloads them on
 * demand through its own package API - so a fresh container answers
 * /api/v2/runtimes with an empty list and every submission fails with
 * "unsupported language". This script is the one-time step that fixes that,
 * and it is idempotent, so re-running it after adding a language to
 * apps/web/lib/practice/languages.ts installs only what is missing.
 *
 * The versions here must match the `version` field of each LanguageDefinition:
 * Piston resolves a runtime by name *and* version, and a mismatch is a runtime
 * 404 rather than a silent fallback to whatever is installed.
 *
 * Usage:
 *   node scripts/piston-bootstrap.mjs [--base http://localhost:2000]
 *
 * The default assumes you have temporarily published the container's port, or
 * are running this from inside the compose network. In normal operation Piston
 * has no published port at all (see docker-compose.yml), which is why this is
 * a deliberate setup step rather than something the app does on boot.
 */

const PACKAGES = [
  { language: "python", version: "3.12.0" },
  // Installed as "node" but executed as "javascript": Piston's package names
  // are runtimes while its execute endpoint also accepts aliases, and the
  // LanguageDefinition uses the alias because that is what reads correctly in
  // the language picker. Both refer to the same install.
  { language: "node", version: "20.11.1" },
  // Installed as "gcc" but executed as "c++": one GCC package provides c, c++,
  // d and fortran runtimes, and the LanguageDefinition names the one it wants.
  { language: "gcc", version: "10.2.0" },
];

function parseArgs(argv) {
  const args = { base: "http://localhost:2000" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base" && argv[i + 1]) {
      args.base = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function installed(base) {
  const response = await fetch(`${base}/api/v2/runtimes`);
  if (!response.ok) {
    throw new Error(`Could not list runtimes: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function install(base, pkg) {
  const response = await fetch(`${base}/api/v2/packages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(pkg),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${pkg.language} ${pkg.version}: ${body.message ?? response.statusText}`);
  }
  return body;
}

async function main() {
  const { base } = parseArgs(process.argv.slice(2));
  console.log(`Piston at ${base}`);

  let runtimes;
  try {
    runtimes = await installed(base);
  } catch (error) {
    console.error(`\nCould not reach Piston at ${base}.`);
    console.error("Start it with `docker compose up piston`, and note that the service");
    console.error("publishes no port by design - run this from inside the compose network");
    console.error("or publish 2000 temporarily.\n");
    throw error;
  }

  const present = new Set(runtimes.map((runtime) => `${runtime.language}@${runtime.version}`));

  for (const pkg of PACKAGES) {
    const key = `${pkg.language}@${pkg.version}`;
    if (present.has(key)) {
      console.log(`  ${key} already installed`);
      continue;
    }
    process.stdout.write(`  installing ${key} ... `);
    await install(base, pkg);
    console.log("done");
  }

  console.log("\nAll runtimes ready.");
}

main().catch((error) => {
  console.error("Piston bootstrap failed:", error.message);
  process.exit(1);
});

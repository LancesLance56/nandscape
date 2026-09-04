import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

/**
 * The sandboxed execution service.
 *
 * Replaces Piston, whose image is published for linux/amd64 only and so cannot
 * run on an arm64 server. Each submission runs in a throwaway container built
 * from an official language image; those are multi-arch, so the same engine
 * runs natively on an amd64 dev machine and an arm64 host. Keeping one engine
 * across both matters more than the architecture itself - a judge that differs
 * between environments hides timing bugs until production.
 *
 * ── Trust boundary ────────────────────────────────────────────────────────
 * This service talks to the Docker socket, which is root-equivalent on the
 * host. That privilege is why it is a separate service: the web app handles
 * untrusted submissions and must never hold it. This process does one thing,
 * exposes one endpoint, publishes no port outside the compose network, and
 * builds every `docker` invocation as an argv array so nothing reaches a
 * shell.
 *
 * User source never appears in a command line at all. It travels base64-encoded
 * in an environment variable and is decoded inside the container, so no amount
 * of quoting in a submission can alter the command that runs it. The only
 * interpolated strings are the compile/run commands, which come from this
 * repository's own LanguageDefinition table, never from a request.
 *
 * Hardening worth adding on a shared host: put a Docker socket proxy in front
 * of this and allow only container create/start/wait/logs/inspect/remove.
 */

const PORT = Number(process.env.PORT ?? 2000);

/** Ceilings this service enforces regardless of what the caller asks for. */
const HARD_LIMITS = {
  wallMs: 20_000,
  compileMs: 20_000,
  memoryMb: 512,
  pids: 64,
  outputBytes: 256 * 1024,
};

/** Exit code the in-container script uses to signal "compilation failed". */
const COMPILE_FAILED_CODE = 90;

const clamp = (value, max, fallback) =>
  Number.isFinite(value) && value > 0 ? Math.min(value, max) : fallback;

function docker(args, { input = "", timeoutMs = 30_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const cap = (current, chunk) =>
      current.length >= HARD_LIMITS.outputBytes ? current : current + chunk;

    child.stdout.on("data", (c) => {
      stdout = cap(stdout, String(c));
    });
    child.stderr.on("data", (c) => {
      stderr = cap(stderr, String(c));
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: String(error.message), timedOut: false });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

/**
 * The script the container runs.
 *
 * Fixed text; the only substitutions are the language's own commands and file
 * name. `printf %s` on an environment variable keeps the source out of the
 * command line entirely.
 */
function buildScript({ fileName, compileCommand, runCommand }) {
  const lines = [
    "set -u",
    `printf %s "$NS_SOURCE_B64" | base64 -d > /work/${fileName}`,
  ];

  if (compileCommand) {
    lines.push(
      // Compile diagnostics are separated from run output by exiting with a
      // reserved code, so the caller can report COMPILE_ERROR distinctly
      // without a second container and a shared volume to carry the binary.
      `if ! ${compileCommand} 2>/work/compile.err; then`,
      "  cat /work/compile.err >&2",
      `  exit ${COMPILE_FAILED_CODE}`,
      "fi",
    );
  }

  lines.push(`exec ${runCommand}`);
  return lines.join("\n");
}

async function execute(request) {
  const {
    image,
    fileName,
    source,
    stdin = "",
    compileCommand,
    runCommand,
    limits = {},
  } = request;

  if (!image || !fileName || typeof source !== "string" || !runCommand) {
    return { error: "image, fileName, source and runCommand are required" };
  }

  const wallMs = clamp(limits.wallMs, HARD_LIMITS.wallMs, 5_000);
  const compileMs = clamp(limits.compileMs, HARD_LIMITS.compileMs, 10_000);
  const memoryMb = clamp(limits.memoryMb, HARD_LIMITS.memoryMb, 256);
  const totalMs = wallMs + (compileCommand ? compileMs : 0);

  const name = `ns-run-${randomUUID()}`;
  const script = buildScript({ fileName, compileCommand, runCommand });

  const args = [
    "run",
    "--name", name,
    "--interactive",
    // No --rm: the container has to survive long enough to be inspected for
    // OOMKilled, which is the only reliable way to tell a memory kill from a
    // timeout - both surface as exit 137.
    "--network", "none",
    "--memory", `${memoryMb}m`,
    // Equal to --memory: without it the container may swap instead of being
    // killed, and the memory limit stops bounding anything.
    "--memory-swap", `${memoryMb}m`,
    "--cpus", "1",
    "--pids-limit", String(HARD_LIMITS.pids),
    "--read-only",
    // /work must allow exec, because a compiled language writes its binary
    // here. mode=1777 because the container runs as an unprivileged user and
    // a tmpfs otherwise mounts root-owned 0755, leaving nobody unable to write
    // its own source file.
    "--tmpfs", "/work:rw,exec,size=64m,mode=1777",
    "--tmpfs", "/tmp:rw,size=32m,mode=1777",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--user", "65534:65534",
    "--workdir", "/work",
    "--env", `NS_SOURCE_B64=${Buffer.from(source, "utf8").toString("base64")}`,
    image,
    "sh", "-c", script,
  ];

  const run = await docker(args, { input: stdin, timeoutMs: totalMs + 5_000 });

  // Ask the daemon why it stopped before removing the container.
  const inspected = await docker(
    ["inspect", "--format", "{{.State.OOMKilled}} {{.State.ExitCode}}", name],
    { timeoutMs: 5_000 },
  );
  const [oomFlag, exitText] = inspected.stdout.trim().split(/\s+/);
  const oomKilled = oomFlag === "true";
  const exitCode = Number.parseInt(exitText ?? "", 10);

  await docker(["rm", "--force", name], { timeoutMs: 10_000 });

  if (run.timedOut) {
    // Reported the way a killed process is, so the caller's existing
    // classification (signal SIGKILL -> timed out) applies unchanged.
    return { run: { stdout: run.stdout, stderr: run.stderr, code: null, signal: "SIGKILL" } };
  }

  if (oomKilled) {
    // 137 is 128 + SIGKILL, which is also what the caller already treats as a
    // memory kill, so no mapping changes on that side either.
    return { run: { stdout: run.stdout, stderr: run.stderr, code: 137, signal: null } };
  }

  const code = Number.isFinite(exitCode) ? exitCode : run.code;

  if (compileCommand && code === COMPILE_FAILED_CODE) {
    return {
      compile: { stdout: "", stderr: run.stderr, code: 1, signal: null },
      run: { stdout: "", stderr: "", code: null, signal: null },
    };
  }

  return { run: { stdout: run.stdout, stderr: run.stderr, code, signal: null } };
}

const server = createServer((req, res) => {
  const send = (status, body) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    });
    res.end(payload);
  };

  if (req.method === "GET" && req.url === "/health") {
    send(200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/execute") {
    send(404, { error: "Not found" });
    return;
  }

  let raw = "";
  let aborted = false;
  req.on("data", (chunk) => {
    raw += chunk;
    // A submission is capped well below this by the caller; the guard is here
    // so a malformed client cannot grow this process without bound.
    if (raw.length > 1_000_000) {
      aborted = true;
      send(413, { error: "Request too large" });
      req.destroy();
    }
  });

  req.on("end", async () => {
    if (aborted) return;
    let request;
    try {
      request = JSON.parse(raw);
    } catch {
      send(400, { error: "Invalid JSON" });
      return;
    }
    try {
      const result = await execute(request);
      if (result.error) send(422, result);
      else send(200, result);
    } catch (error) {
      console.error("[runner] execute failed", error);
      send(500, { error: "Execution failed" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[runner] listening on ${PORT}`);
});

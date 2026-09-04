/**
 * Exercise the generated drivers for real: build the program the way the
 * judge would, run it under the local python/node, and parse the output with
 * the same parser the server uses. Piston is not involved - this is checking
 * the harness itself, which is the part that has to be right before any
 * container is worth starting.
 *
 * Run with `pnpm practice:verify-harness`. A script rather than a test file
 * because apps/web has no test runner (see CLAUDE.md), and adding one for a
 * single check would be a heavier convention than this earns. It needs
 * `python` and `node` on PATH, which is the same thing the Piston container
 * provides in production.
 */
import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildPythonProgram } from "./python";
import { buildJavaScriptProgram } from "./javascript";
import { buildCppProgram } from "./cpp";
import { parseDriverOutput } from "./protocol";

const dir = mkdtempSync(path.join(tmpdir(), "ns-harness-"));
let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label}`, detail === undefined ? "" : JSON.stringify(detail));
    failures += 1;
  }
}

function run(file: string, exe: string, source: string, stdin: string) {
  const target = path.join(dir, file);
  writeFileSync(target, source, "utf8");
  try {
    const stdout = execFileSync(exe, [target], {
      input: stdin,
      encoding: "utf8",
      timeout: 15_000,
    });
    return { stdout, stderr: "", failed: false };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", failed: true };
  }
}

const cases = JSON.stringify({
  cases: [{ args: [[2, 7, 11, 15], 9] }, { args: [[2, 3, 4], 6] }],
});

// --- Python: happy path, with a print() the driver must capture ------------
console.log("python / correct solution with debug output");
{
  const user = [
    "def two_sum(numbers, target):",
    "    print('debugging', target)",
    "    left, right = 0, len(numbers) - 1",
    "    while left < right:",
    "        total = numbers[left] + numbers[right]",
    "        if total == target:",
    "            return [left, right]",
    "        if total < target:",
    "            left += 1",
    "        else:",
    "            right -= 1",
    "    return []",
  ].join("\n");

  const { stdout } = run("sol.py", "python", buildPythonProgram(user, "two_sum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("two result records", parsed.cases.length === 2, parsed.cases.length);
  check("case 0 value", JSON.stringify(parsed.cases[0]?.value) === "[0,1]", parsed.cases[0]?.value);
  check("case 1 value", JSON.stringify(parsed.cases[1]?.value) === "[0,2]", parsed.cases[1]?.value);
  check("print() captured, not leaked", parsed.cases[0]?.out?.includes("debugging") === true, parsed.cases[0]?.out);
  check("no stray protocol output", parsed.stray === "", parsed.stray);
  check("timing recorded", typeof parsed.cases[0]?.ms === "number");
}

// --- Python: an exception fails one case, not the batch --------------------
console.log("python / exception in the first case");
{
  const user = [
    "def two_sum(numbers, target):",
    "    if target == 9:",
    "        raise ValueError('boom')",
    "    return [0, 2]",
  ].join("\n");

  const { stdout } = run("err.py", "python", buildPythonProgram(user, "two_sum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("both cases still reported", parsed.cases.length === 2, parsed.cases.length);
  check("case 0 marked failed", parsed.cases[0]?.ok === false);
  check("traceback captured", parsed.cases[0]?.error?.includes("ValueError") === true);
  check("case 1 still ran", parsed.cases[1]?.ok === true, parsed.cases[1]);
}

// --- Python: wrong function name is a clear fatal, not a crash -------------
console.log("python / function renamed by the user");
{
  const { stdout } = run("miss.py", "python", buildPythonProgram("def nope():\n    pass", "two_sum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("fatal reported", parsed.fatal !== null);
  check("names the expected function", parsed.fatal?.includes("two_sum") === true, parsed.fatal);
}

// --- Python: unserializable return is explained, not a driver crash --------
console.log("python / returns a set");
{
  const { stdout } = run("set.py", "python", buildPythonProgram("def two_sum(numbers, target):\n    return {1, 2}", "two_sum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("still reports cases", parsed.cases.length === 2, parsed.cases.length);
  check("explains the problem", parsed.cases[0]?.error?.includes("cannot be compared") === true, parsed.cases[0]?.error);
}

// --- JavaScript: happy path, console.log captured --------------------------
console.log("javascript / correct solution with debug output");
{
  const user = [
    "function twoSum(numbers, target) {",
    "  console.log('debugging', target);",
    "  let left = 0, right = numbers.length - 1;",
    "  while (left < right) {",
    "    const total = numbers[left] + numbers[right];",
    "    if (total === target) return [left, right];",
    "    if (total < target) left += 1; else right -= 1;",
    "  }",
    "  return [];",
    "}",
  ].join("\n");

  const { stdout } = run("sol.js", "node", buildJavaScriptProgram(user, "twoSum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("two result records", parsed.cases.length === 2, parsed.cases.length);
  check("case 0 value", JSON.stringify(parsed.cases[0]?.value) === "[0,1]", parsed.cases[0]?.value);
  check("case 1 value", JSON.stringify(parsed.cases[1]?.value) === "[0,2]", parsed.cases[1]?.value);
  check("console.log captured", parsed.cases[0]?.out?.includes("debugging") === true, parsed.cases[0]?.out);
  check("no stray protocol output", parsed.stray === "", parsed.stray);
}

// --- JavaScript: throw isolates to one case --------------------------------
console.log("javascript / throw in the first case");
{
  const user = "function twoSum(n, t) { if (t === 9) throw new Error('boom'); return [0, 2]; }";
  const { stdout } = run("err.js", "node", buildJavaScriptProgram(user, "twoSum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("both cases reported", parsed.cases.length === 2, parsed.cases.length);
  check("case 0 errored", parsed.cases[0]?.ok === false);
  check("case 1 still ran", parsed.cases[1]?.ok === true);
}

// --- JavaScript: missing function ------------------------------------------
console.log("javascript / function renamed by the user");
{
  const { stdout } = run("miss.js", "node", buildJavaScriptProgram("function nope() {}", "twoSum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("fatal reported", parsed.fatal !== null, parsed);
  check("names the expected function", parsed.fatal?.includes("twoSum") === true, parsed.fatal);
}

// --- JavaScript: async solution is awaited ---------------------------------
console.log("javascript / async solution");
{
  const user = "async function twoSum(n, t) { return t === 9 ? [0, 1] : [0, 2]; }";
  const { stdout } = run("async.js", "node", buildJavaScriptProgram(user, "twoSum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("promise resolved, not returned raw", JSON.stringify(parsed.cases[0]?.value) === "[0,1]", parsed.cases[0]?.value);
}

// --- A syntax error produces no records, which the caller maps to COMPILE_ERROR
console.log("python / syntax error");
{
  const { stdout, stderr, failed } = run("syn.py", "python", buildPythonProgram("def two_sum(:\n", "two_sum"), cases);
  const parsed = parseDriverOutput(stdout);
  check("process failed", failed);
  check("no result records", parsed.cases.length === 0);
  check("stderr names a SyntaxError", stderr.toLowerCase().includes("syntaxerror"), stderr.slice(0, 200));
}

// --- C++: compiled, so it needs a toolchain the other two do not ----------
// Skipped rather than failed when the local toolchain cannot produce a binary
// - no g++ on PATH, or a sandbox that refuses to write an executable. This
// script checks the generated drivers against whatever the machine happens to
// have; C++ is the one language whose driver only ever runs on Linux inside
// the engine, and it is covered end to end there.
function cppToolchainReady(): boolean {
  try {
    execSync("g++ --version", { stdio: "ignore" });
  } catch {
    return false;
  }
  try {
    const probeSrc = path.join(dir, "probe.cpp");
    const probeExe = path.join(dir, `probe${process.platform === "win32" ? ".exe" : ""}`);
    writeFileSync(probeSrc, "int main(){return 0;}\n", "utf8");
    execFileSync("g++", ["-o", probeExe, probeSrc], { stdio: "pipe" });
    execFileSync(probeExe, [], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

if (!cppToolchainReady()) {
  console.log("c++ / skipped - no usable local g++ (covered end to end by the engine)");
} else {
  const signature = {
    name: "two_sum",
    params: [
      { name: "numbers", type: "int[]" as const },
      { name: "target", type: "int" as const },
    ],
    returns: "int[]" as const,
  };

  console.log("c++ / correct solution with debug output");
  const user = [
    "std::vector<long long> twoSum(std::vector<long long> numbers, long long target) {",
    '    printf("debugging %lld\\n", target);',
    "    long long left = 0, right = (long long)numbers.size() - 1;",
    "    while (left < right) {",
    "        long long total = numbers[left] + numbers[right];",
    "        if (total == target) return {left, right};",
    "        if (total < target) ++left; else --right;",
    "    }",
    "    return {};",
    "}",
  ].join("\n");

  const source = buildCppProgram(user, "twoSum", signature);
  const src = path.join(dir, "sol.cpp");
  const exe = path.join(dir, `sol${process.platform === "win32" ? ".exe" : ""}`);
  writeFileSync(src, source, "utf8");
  execFileSync("g++", ["-O2", "-std=c++17", "-o", exe, src], { stdio: "pipe" });
  const stdout = execFileSync(exe, [], { input: cases, encoding: "utf8", timeout: 15_000 });
  const parsed = parseDriverOutput(stdout);
  check("two result records", parsed.cases.length === 2, parsed.cases.length);
  check("case 0 value", JSON.stringify(parsed.cases[0]?.value) === "[0,1]", parsed.cases[0]?.value);
  check("case 1 value", JSON.stringify(parsed.cases[1]?.value) === "[0,2]", parsed.cases[1]?.value);
  check("printf captured", parsed.cases[0]?.out?.includes("debugging") === true, parsed.cases[0]?.out);
  check("no stray protocol output", parsed.stray === "", parsed.stray);
}

console.log();
console.log(failures === 0 ? "harness behaves correctly in every case" : `${failures} harness failures`);
process.exit(failures ? 1 : 0);

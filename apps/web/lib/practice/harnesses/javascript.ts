import { MAX_CASE_STDOUT_CHARS } from "../limits";
import { RESULT_SENTINEL, FATAL_SENTINEL } from "./protocol";

/**
 * The JavaScript driver, appended below the user's function.
 *
 * Mirrors the Python one: per-case stdout capture (here by swapping
 * `process.stdout.write`, which is what `console.log` ultimately calls, so
 * both are covered by one hook), per-case error isolation, and one result
 * line per case flushed as it completes.
 *
 * The returned value is awaited. Nothing in the seeded material is async, but
 * a learner who reaches for `async` gets a correct answer instead of a
 * baffling `{}` where their array should be.
 */
export function buildJavaScriptProgram(userCode: string, functionName: string): string {
  return [
    userCode,
    "",
    "// ------------------------------------------------------------------------",
    "// Nandscape driver. Everything below this line is generated.",
    "// ------------------------------------------------------------------------",
    "(async () => {",
    `  const RESULT = ${JSON.stringify(RESULT_SENTINEL)};`,
    `  const FATAL = ${JSON.stringify(FATAL_SENTINEL)};`,
    `  const MAX_OUT = ${MAX_CASE_STDOUT_CHARS};`,
    "  const realWrite = process.stdout.write.bind(process.stdout);",
    "",
    "  const emit = (prefix, record) => {",
    "    let line;",
    "    try {",
    "      line = JSON.stringify(record);",
    "    } catch (err) {",
    "      // Circular structures and BigInt both land here. Both are real",
    "      // mistakes worth naming rather than crashing the driver over.",
    "      const safe = { ...record, ok: false };",
    "      delete safe.value;",
    "      safe.error = 'Returned a value that cannot be compared: ' + String(err && err.message);",
    "      line = JSON.stringify(safe);",
    "    }",
    "    realWrite(prefix + line + String.fromCharCode(10));",
    "  };",
    "",
    "  // `typeof` rather than a bare reference: an identifier the user never",
    "  // declared is a ReferenceError, and a missing function should produce a",
    "  // readable message instead of a stack trace pointing into this driver.",
    `  const fn = typeof ${functionName} === 'function' ? ${functionName} : null;`,
    "  if (fn === null) {",
    "    emit(FATAL, {",
    `      error: 'No function named ${functionName}() was found. ' +`,
    "        'Keep the name from the starter code - the tests call it directly.',",
    "    });",
    "    return;",
    "  }",
    "",
    "  const readStdin = () => new Promise((resolve, reject) => {",
    "    let raw = '';",
    "    process.stdin.setEncoding('utf8');",
    "    process.stdin.on('data', (chunk) => { raw += chunk; });",
    "    process.stdin.on('end', () => resolve(raw));",
    "    process.stdin.on('error', reject);",
    "  });",
    "",
    "  let payload;",
    "  try {",
    "    payload = JSON.parse(await readStdin());",
    "  } catch (err) {",
    "    emit(FATAL, { error: 'Could not read the test input: ' + String(err && err.message) });",
    "    return;",
    "  }",
    "",
    "  const cases = Array.isArray(payload.cases) ? payload.cases : [];",
    "  for (let index = 0; index < cases.length; index += 1) {",
    "    const record = { i: index };",
    "    let captured = '';",
    "    const started = process.hrtime.bigint();",
    "    try {",
    "      process.stdout.write = (chunk) => {",
    "        if (captured.length < MAX_OUT) captured += String(chunk);",
    "        return true;",
    "      };",
    "      const value = await fn(...(cases[index].args || []));",
    "      record.ok = true;",
    "      record.value = value;",
    "    } catch (err) {",
    "      record.ok = false;",
    "      record.error = (err && err.stack) ? String(err.stack) : String(err);",
    "    } finally {",
    "      process.stdout.write = realWrite;",
    "      record.ms = Number(process.hrtime.bigint() - started) / 1e6;",
    "    }",
    "    if (captured) record.out = captured.slice(0, MAX_OUT);",
    "    emit(RESULT, record);",
    "  }",
    "})();",
    "",
  ].join("\n");
}

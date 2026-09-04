import { MAX_CASE_STDOUT_CHARS } from "../limits";
import { RESULT_SENTINEL, FATAL_SENTINEL } from "./protocol";

/**
 * The Python driver, appended below the user's function.
 *
 * Two details carry most of the weight:
 *
 * 1. `sys.stdout` is swapped for a buffer around each call, so anything the
 *    user prints is captured as their debug output instead of landing in the
 *    middle of the result protocol. Beginners debug with `print()` constantly,
 *    and a judge that either loses that output or chokes on it is much worse
 *    than one that hands it back per test case.
 * 2. Every case is wrapped individually, so one exception fails one case
 *    rather than the batch. Only process death - a timeout, an OOM, a
 *    segfault in a C extension - ends the run, and execute.ts attributes that
 *    to the first case that produced no result line.
 */
export function buildPythonProgram(userCode: string, functionName: string): string {
  const name = JSON.stringify(functionName);
  const newline = JSON.stringify("\n");

  return [
    userCode,
    "",
    "# -------------------------------------------------------------------------",
    "# Nandscape driver. Everything below this line is generated.",
    "# -------------------------------------------------------------------------",
    "import sys as _ns_sys, json as _ns_json, io as _ns_io, time as _ns_time, traceback as _ns_tb",
    "",
    "_NS_REAL_STDOUT = _ns_sys.stdout",
    `_NS_RESULT = ${JSON.stringify(RESULT_SENTINEL)}`,
    `_NS_FATAL = ${JSON.stringify(FATAL_SENTINEL)}`,
    `_NS_MAX_OUT = ${MAX_CASE_STDOUT_CHARS}`,
    `_NS_NL = ${newline}`,
    "",
    "",
    "def _ns_emit(prefix, record):",
    "    try:",
    "        line = _ns_json.dumps(record)",
    "    except (TypeError, ValueError) as exc:",
    "        # A function returning something JSON cannot represent (a set, a",
    "        # custom object, a numpy array) is a real and common mistake. Say",
    "        # so plainly rather than letting the driver itself crash.",
    "        safe = dict(record)",
    "        safe.pop('value', None)",
    "        safe['ok'] = False",
    "        safe['error'] = 'Returned a value that cannot be compared: ' + str(exc)",
    "        line = _ns_json.dumps(safe)",
    "    _NS_REAL_STDOUT.write(prefix + line + _NS_NL)",
    "    _NS_REAL_STDOUT.flush()",
    "",
    "",
    "def _ns_main():",
    `    fn = globals().get(${name})`,
    "    if not callable(fn):",
    "        _ns_emit(_NS_FATAL, {",
    `            'error': 'No function named ${functionName}() was found. '`,
    "                     'Keep the name from the starter code - the tests call it directly.',",
    "        })",
    "        return",
    "",
    "    try:",
    "        payload = _ns_json.loads(_ns_sys.stdin.read())",
    "    except Exception as exc:",
    "        _ns_emit(_NS_FATAL, {'error': 'Could not read the test input: ' + str(exc)})",
    "        return",
    "",
    "    for index, case in enumerate(payload.get('cases', [])):",
    "        buffer = _ns_io.StringIO()",
    "        record = {'i': index}",
    "        started = _ns_time.perf_counter()",
    "        try:",
    "            _ns_sys.stdout = buffer",
    "            value = fn(*case.get('args', []))",
    "            record['ok'] = True",
    "            record['value'] = value",
    "        except BaseException:",
    "            record['ok'] = False",
    "            record['error'] = _ns_tb.format_exc(limit=6)",
    "        finally:",
    "            _ns_sys.stdout = _NS_REAL_STDOUT",
    "            record['ms'] = round((_ns_time.perf_counter() - started) * 1000.0, 3)",
    "",
    "        captured = buffer.getvalue()",
    "        if captured:",
    "            record['out'] = captured[:_NS_MAX_OUT]",
    "        _ns_emit(_NS_RESULT, record)",
    "",
    "",
    "_ns_main()",
    "",
  ].join("\n");
}

import type { PracticeLanguage, PracticeSignature } from "@/types/practice";
import { buildPythonProgram } from "./harnesses/python";
import { buildJavaScriptProgram } from "./harnesses/javascript";
import { buildCppProgram } from "./harnesses/cpp";

/**
 * Everything that differs between one supported language and the next.
 *
 * This interface is the seam. Adding a language means writing one module that
 * implements it and adding one entry to LANGUAGES below: no schema change, no
 * API change, no UI change, and no edit to any already-seeded problem. C++ was
 * added exactly that way, which is what the parameter *types* on `signature`
 * were reserved for - see `buildProgram`.
 */
export interface LanguageDefinition {
  id: PracticeLanguage;
  /** Shown in the picker. */
  label: string;
  /** Engine-side language id and pinned version. */
  runtime: string;
  version: string;
  /** Filename handed to the engine; the extension is how it picks a toolchain. */
  fileName: string;
  /** Shiki id, so a submission can be rendered with the site's existing highlighter. */
  shikiLang: string;
  /**
   * True when the toolchain has a distinct compile step, which is what makes
   * COMPILE_ERROR reachable and gives the compile timeout something to bound.
   * Only C++ sets it; the interpreted pair report syntax errors at run time.
   */
  compiled: boolean;

  /**
   * The identifier the user is expected to define, derived from the
   * signature's canonical snake_case name. Python keeps it; JavaScript
   * camel-cases it. A problem therefore states its function once and each
   * language presents it idiomatically, instead of every problem having to
   * spell out a name per language.
   */
  functionName(signature: PracticeSignature): string;

  /**
   * Assemble the complete program: the user's source plus a driver that reads
   * `{"cases":[{"args":[...]}]}` from stdin and writes one sentinel-prefixed
   * result line per case.
   *
   * `signature` is passed in full - including parameter and return types -
   * even though the two dynamically typed drivers ignore everything but the
   * name. The C++ driver is why: it cannot work from the name alone, and has
   * to declare real locals, parse JSON into them, and serialize a concretely
   * typed return value. Carrying the types from the start is what let that
   * language land as one new file rather than a redesign.
   */
  buildProgram(userCode: string, signature: PracticeSignature): string;
}

/** Guards the identifier before it is interpolated into generated source. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Invalid function name in problem signature: ${JSON.stringify(name)}`);
  }
  return name;
}

/** `two_sum` -> `twoSum`. */
function camelCase(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

const python: LanguageDefinition = {
  id: "python",
  label: "Python",
  runtime: "python",
  version: "3.12.0",
  fileName: "solution.py",
  shikiLang: "python",
  compiled: false,
  functionName: (signature) => assertIdentifier(signature.name),
  buildProgram(userCode, signature) {
    return buildPythonProgram(userCode, this.functionName(signature));
  },
};

const javascript: LanguageDefinition = {
  id: "javascript",
  label: "JavaScript",
  runtime: "javascript",
  version: "20.11.1",
  fileName: "solution.js",
  shikiLang: "javascript",
  compiled: false,
  functionName: (signature) => assertIdentifier(camelCase(signature.name)),
  buildProgram(userCode, signature) {
    return buildJavaScriptProgram(userCode, this.functionName(signature));
  },
};

const cpp: LanguageDefinition = {
  id: "cpp",
  label: "C++",
  runtime: "c++",
  version: "10.2.0",
  fileName: "solution.cpp",
  shikiLang: "cpp",
  // The only compiled language here, which is what makes COMPILE_ERROR and the
  // compile timeout reachable at all - both were built for this and until now
  // could never fire.
  compiled: true,
  functionName: (signature) => assertIdentifier(camelCase(signature.name)),
  buildProgram(userCode, signature) {
    return buildCppProgram(userCode, this.functionName(signature), signature);
  },
};

/**
 * The supported set.
 *
 * Deliberately fixed rather than pluggable. These are the three languages the
 * site's own tutorials are written in - the seeded content holds 57 JavaScript,
 * 47 Python and 32 C++ code blocks - and a teaching site gains nothing from
 * offering a language none of its material uses.
 */
export const LANGUAGES: Record<string, LanguageDefinition> = {
  python,
  javascript,
  cpp,
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as PracticeLanguage[];

export function getLanguage(id: string): LanguageDefinition | null {
  return LANGUAGES[id] ?? null;
}

export function isSupportedLanguage(id: unknown): id is PracticeLanguage {
  return typeof id === "string" && id in LANGUAGES;
}

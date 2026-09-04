import type { PracticeLanguage, PracticeSignature, PracticeTestCase } from "@/types/practice";
import { SUPPORTED_LANGUAGES } from "./languages";

/**
 * The rules a coding problem has to satisfy, in one place.
 *
 * Both callers need the same answer for different purposes: the write path in
 * practice-records.ts refuses a problem that breaks a rule, and the admin
 * editor shows the same rules live as the author types. Deriving both from one
 * list is what keeps the editor from cheerfully reporting a green check on
 * something the API will reject on save.
 *
 * Errors block a save. Warnings do not - a problem with no reference solution
 * is publishable, just harder to maintain - so they are reported separately
 * rather than being quietly dropped.
 */

export interface ProblemCheck {
  id: string;
  level: "error" | "warning";
  message: string;
  /** Anchor of the editor section this belongs to, for jump-to links. */
  section?: string;
}

export interface CheckableProblem {
  slug?: string;
  title?: string;
  signature?: PracticeSignature;
  languages?: PracticeLanguage[];
  starterCode?: Record<string, string>;
  solutions?: Record<string, string>;
  visibleTests?: PracticeTestCase[];
  hiddenTests?: PracticeTestCase[];
  compareMode?: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export function checkProblem(problem: CheckableProblem): ProblemCheck[] {
  const checks: ProblemCheck[] = [];
  const add = (
    level: ProblemCheck["level"],
    id: string,
    message: string,
    section?: string,
  ) => checks.push({ id, level, message, section });

  if (!problem.title?.trim()) {
    add("error", "title", "Title is empty", "identity");
  }

  if (!problem.slug?.trim()) {
    add("error", "slug", "Slug is empty", "identity");
  } else if (!SLUG.test(problem.slug)) {
    add(
      "error",
      "slug-format",
      "Slug must be lowercase words joined by single hyphens",
      "identity",
    );
  }

  const signature = problem.signature;
  if (!signature?.name || !Array.isArray(signature.params)) {
    add("error", "signature", "Signature needs a name and a parameter list", "signature");
    // Everything below reads the signature, so there is nothing further to say.
    return checks;
  }

  // The name is interpolated into generated driver source, so it has to be a
  // plain identifier. snake_case specifically, because each language renames
  // it to its own convention from that one canonical form.
  if (!IDENTIFIER.test(signature.name)) {
    add(
      "error",
      "signature-name",
      `"${signature.name}" is not a valid snake_case function name`,
      "signature",
    );
  }

  const seen = new Set<string>();
  for (const param of signature.params) {
    if (!param.name || !IDENTIFIER.test(param.name)) {
      add("error", `param-${param.name}`, `Parameter "${param.name}" is not a valid name`, "signature");
    }
    if (seen.has(param.name)) {
      add("error", `param-dup-${param.name}`, `Duplicate parameter "${param.name}"`, "signature");
    }
    seen.add(param.name);
  }

  const visible = problem.visibleTests ?? [];
  const hidden = problem.hiddenTests ?? [];
  const arity = signature.params.length;

  if (visible.length === 0) {
    add("error", "no-visible", "At least one example case is required", "tests");
  }
  if (hidden.length === 0) {
    add(
      "warning",
      "no-hidden",
      "No hidden cases - Submit will check exactly what Run already showed",
      "tests",
    );
  }

  const label = (index: number, isHidden: boolean) =>
    `${isHidden ? "Hidden case" : "Case"} ${index + 1}`;

  for (const [group, isHidden] of [
    [visible, false],
    [hidden, true],
  ] as const) {
    group.forEach((testCase, index) => {
      const name = label(index, isHidden);
      if (!Array.isArray(testCase.args)) {
        add("error", `args-${isHidden}-${index}`, `${name} has no argument list`, "tests");
        return;
      }
      if (testCase.args.length !== arity) {
        add(
          "error",
          `arity-${isHidden}-${index}`,
          `${name} passes ${testCase.args.length} argument(s) but ${signature.name} takes ${arity}`,
          "tests",
        );
      }
      // `null` is a legitimate expected value; `undefined` means the author
      // never filled it in. JSON has no undefined, so this is the only way an
      // unfinished case reaches here.
      if (testCase.expected === undefined) {
        add("error", `expected-${isHidden}-${index}`, `${name} has no expected output`, "tests");
      }
    });
  }

  const languages = problem.languages ?? [];
  if (languages.length === 0) {
    add("error", "no-languages", "No language is enabled", "starter");
  }

  for (const language of languages) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      add("error", `lang-${language}`, `"${language}" is not a supported language`, "starter");
      continue;
    }
    if (!problem.starterCode?.[language]?.trim()) {
      add("error", `stub-${language}`, `No starter code for ${language}`, "starter");
    }
    if (!problem.solutions?.[language]?.trim()) {
      add(
        "warning",
        `solution-${language}`,
        `No reference solution for ${language}`,
        "solution",
      );
    }
  }

  if (problem.compareMode && !["exact", "unordered", "float"].includes(problem.compareMode)) {
    add("error", "compare", `Unknown compare mode "${problem.compareMode}"`, "judge");
  }

  return checks;
}

/** The first blocking problem, or null when a save is allowed. */
export function firstError(checks: ProblemCheck[]): string | null {
  return checks.find((check) => check.level === "error")?.message ?? null;
}

export function countBy(checks: ProblemCheck[], level: ProblemCheck["level"]): number {
  return checks.filter((check) => check.level === level).length;
}

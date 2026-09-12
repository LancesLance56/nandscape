import { listPracticeRecords } from "@/lib/practice/practice-records";
import { ScrollReveal } from "@/components/scroll-reveal";
import { StatementMarkdown } from "@/components/practices/statement-markdown";
import { SectionHeader } from "./section-header";
import { PracticeDemo, type DemoProblem } from "./practice-demo";
import { formatValue } from "@/lib/practice/compare";
import type { PracticeSpec } from "@/types/practice";

/**
 * The coding problems block, sitting directly above the logic problems.
 *
 * This used to be a grid of six tiles. A tile describes an editor; the section
 * now contains one - the same workspace /practices/[slug] runs, loaded with a
 * seeded problem, with Run wired to the same judge. Someone can write an answer
 * and have it graded without an account and without leaving the homepage, which
 * a tile can only promise.
 *
 * The sibling section below it, Logic Problems, keeps its grid on purpose: the
 * two are siblings in the navbar and share a browser, so they must not look
 * like one section printed twice. One states a problem and lets you solve it;
 * the other lays out the set.
 *
 * Statements are rendered here rather than in the client component below,
 * because the Markdown renderer is a Server Component - fenced code is
 * coloured by the Shiki singleton as the tree renders, with no client pass -
 * and they travel down as slots.
 */

/**
 * The problems the picker offers, in order.
 *
 * Three, not six: each one is a whole statement and a starter stub in the RSC
 * payload, and a picker wide enough to wrap stops reading as a picker. They
 * climb in difficulty, and they are chosen to be short - a demo nobody can
 * finish in the frame is an advert for the scroll bar.
 */
const FEATURED_SLUGS = ["two-sum", "count-set-bits", "merge-intervals"];

/** How many topic tags the statement header shows before it stops. */
const TAG_LIMIT = 3;

export async function PracticesShowcase() {
  let practices: PracticeSpec[] = [];
  try {
    practices = await listPracticeRecords();
  } catch {
    practices = [];
  }

  const bySlug = new Map(practices.map((p) => [p.slug, p]));
  let featured = FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (p): p is PracticeSpec => Boolean(p),
  );
  if (featured.length === 0) featured = practices.slice(0, 3);

  const problems: DemoProblem[] = featured.map((practice) => ({
    slug: practice.slug,
    title: practice.title,
    difficulty: practice.difficulty,
    tags: practice.tags.slice(0, TAG_LIMIT),
    summary: practice.summary,
    languages: practice.languages,
    starterCode: practice.starterCode,
    statement: <StatementMarkdown source={practice.statement} />,
    examples: <Examples practice={practice} />,
  }));

  return (
    <section className="py-20">
      <ScrollReveal className="mb-10">
        <SectionHeader
          eyebrow="Coding problems"
          title="Try a coding problem"
          blurb="Implement one function in Python, JavaScript or C++, run it against the worked examples, then submit it against the hidden cases."
          action={{ href: "/practices", label: "Browse all problems" }}
        />
      </ScrollReveal>

      {problems.length === 0 ? (
        <p className="text-sm text-ink-soft">No coding problems in the database yet.</p>
      ) : (
        <ScrollReveal delay={80}>
          <PracticeDemo problems={problems} />
        </ScrollReveal>
      )}
    </section>
  );
}

/**
 * The worked examples, in the shape the problem page gives them.
 *
 * Formatted fields rather than a raw JSON dump of the case: the arguments are
 * shown as a call, which is how the reader's own function will receive them.
 */
function Examples({ practice }: { practice: PracticeSpec }) {
  if (practice.visibleTests.length === 0) return null;

  return (
    <section>
      <h4 className="mb-3 font-display text-base font-semibold text-ink">Examples</h4>
      <div className="space-y-3">
        {practice.visibleTests.map((testCase) => (
          <div key={testCase.index} className="rounded-lg border border-border bg-surface-2/50 p-3">
            <dl className="space-y-1.5 text-xs">
              <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                <dt className="text-ink-soft">Input</dt>
                <dd className="overflow-x-auto font-mono text-ink">
                  {practice.signature.params
                    .map((param, index) => `${param.name} = ${formatValue(testCase.args[index])}`)
                    .join(", ")}
                </dd>
              </div>
              <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                <dt className="text-ink-soft">Output</dt>
                <dd className="overflow-x-auto font-mono text-ink">
                  {formatValue(testCase.expected)}
                </dd>
              </div>
              {testCase.explanation && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-ink-soft">Why</dt>
                  <dd className="text-ink-soft">{testCase.explanation}</dd>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
      {practice.hiddenTestCount > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          Submitting also runs {practice.hiddenTestCount} hidden test
          {practice.hiddenTestCount === 1 ? "" : "s"}.
        </p>
      )}
    </section>
  );
}

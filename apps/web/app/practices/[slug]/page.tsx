import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeNav } from "@/components/practices/practice-nav";
import { PracticeSplit } from "@/components/practices/practice-split";
import { StatementMarkdown } from "@/components/practices/statement-markdown";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import { PracticeWorkspace } from "@/components/practices/practice-workspace";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getPracticeBySlug } from "@/lib/practice/practice-records";
import { formatValue } from "@/lib/practice/compare";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  // No catch: a rejected lookup is a database failure, not an absent problem.
  // Swallowing it here rendered "Problem not found" during an outage.
  const practice = await getPracticeBySlug(slug);
  if (!practice) return { title: "Problem not found" };

  return {
    title: `${practice.title} - Coding Practice`,
    description: practice.summary,
  };
}

export default async function PracticePage({ params }: PageParams) {
  const { slug } = await params;
  // Deliberately uncaught: `notFound()` is for the null this returns when the
  // slug does not exist. A thrown lookup means the database is unreachable and
  // belongs in the error boundary, not behind a 404 on a valid URL.
  const practice = await getPracticeBySlug(slug);
  if (!practice) notFound();

  const user = await getCurrentUser();

  return (
    <>
      <PracticeNav problemTitle={practice.title} />
      {/*
        A workspace, not an article: full-bleed, locked to the viewport, with
        each pane scrolling on its own and a draggable divider between them -
        the layout every judge converges on, because horizontal space is the
        scarce resource when a statement and an editor have to be read
        together. There is no centred container and no footer; both would push
        the editor down and reintroduce a whole-page scroll, which is the thing
        that makes a split view useless.

        `mt-12` clears the 3rem PracticeNav, and PracticeSplit sizes itself
        against the same figure. `dvh` rather than `vh` so the bottom of the
        editor is not hidden under mobile browser chrome.

        Below `lg` this collapses back to ordinary document flow: two half-width
        columns on a phone would leave neither readable, so the statement simply
        sits above the editor and the page scrolls normally.
      */}
      <main className="mt-12">
        <PracticeSplit
          topOffsetRem={3}
          left={
            <article className="px-5 py-6 sm:px-6">
                <header className="mb-6">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <DifficultyTag difficulty={practice.difficulty} />
                    {practice.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h1 className="font-display text-2xl font-semibold leading-tight text-ink">
                    {practice.title}
                  </h1>
                  {practice.summary && <p className="mt-2 text-sm text-ink-soft">{practice.summary}</p>}
                </header>

                {/* Markdown, so the author decides the statement's shape - which
                    headings it has, whether constraints are a list or a table.
                    Fenced code is highlighted by the same Shiki contract as
                    every other snippet on the site. */}
                <StatementMarkdown source={practice.statement} />

                <section className="mt-8">
                  <h2 className="mb-3 font-display text-lg font-semibold text-ink">Examples</h2>
                  <div className="space-y-3">
                    {practice.visibleTests.map((testCase) => (
                      <div
                        key={testCase.index}
                        className="rounded-lg border border-border bg-surface-2/50 p-3"
                      >
                        {/* Formatted fields rather than a raw JSON dump of the case:
                            the arguments are shown as a call, which is how the
                            reader's own function will receive them. */}
                        <dl className="space-y-1.5 text-xs">
                          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                            <dt className="text-ink-soft">Input</dt>
                            <dd className="overflow-x-auto font-mono text-ink">
                              {practice.signature.params
                                .map(
                                  (param, index) =>
                                    `${param.name} = ${formatValue(testCase.args[index])}`,
                                )
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

                <section className="mt-8 rounded-lg border border-border p-3">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Limits
                  </h2>
                  <p className="text-xs text-ink-soft">
                    {practice.timeLimitMs} ms and {practice.memoryLimitMb} MB per test case.
                  </p>
                </section>
            </article>
          }
          right={
            <div className="h-full px-5 pb-6 sm:px-6 lg:p-0">
              <PracticeWorkspace
                practice={{
                  slug: practice.slug,
                  languages: practice.languages,
                  starterCode: practice.starterCode,
                }}
                signedIn={Boolean(user)}
              />
            </div>
          }
        />
      </main>
    </>
  );
}

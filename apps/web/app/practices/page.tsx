import type { Metadata } from "next";
import { PracticeNav } from "@/components/practices/practice-nav";
import { Footer } from "@/components/footer";
import { PracticeList } from "@/components/practices/practice-list";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  listAttemptedSlugs,
  listPracticeRecords,
  listSolvedSlugs,
} from "@/lib/practice/practice-records";
import type { PracticeSpec } from "@/types/practice";

export const metadata: Metadata = {
  title: "Coding Practice: Algorithm Problems in Python and JavaScript",
  description:
    "Free coding problems on sorting, graphs, dynamic programming and two pointers. Write a function in the browser, run it against the examples, and submit for the hidden tests.",
};

/**
 * Dynamic rather than revalidated, unlike /puzzles: the solved and attempted
 * markers are per-reader, so a cached copy would show one person's progress to
 * everyone else.
 */
export const dynamic = "force-dynamic";

export default async function PracticesPage() {
  // Defensive in the same way /puzzles is: this page has no dynamic segment,
  // so a build-time render can happen before Postgres is reachable.
  let practices: PracticeSpec[] = [];
  try {
    practices = await listPracticeRecords();
  } catch {
    practices = [];
  }

  const user = await getCurrentUser();
  const [solvedSlugs, attemptedSlugs] = user
    ? await Promise.all([listSolvedSlugs(user.id), listAttemptedSlugs(user.id)]).catch(() => [
        [] as string[],
        [] as string[],
      ])
    : [[], []];

  return (
    <>
      <PracticeNav />
      {/* Full width rather than a centred container: the list is a table of
          rows, and every pixel of horizontal space goes into the title and
          tags instead of into margins. Padding only, no max-width.

          `pt-16` clears the 3rem PracticeNav with a little breathing room -
          the coding section keeps its own slim bar throughout rather than
          switching chrome between the list and a problem. */}
      <main className="px-5 pb-24 pt-16 sm:px-8">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Nandscape practice
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink">
            Coding Problems
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Implement one function, run it against the worked examples, then submit it against
            the hidden cases. The same algorithms the tutorials walk through, with somewhere to
            actually type them.
          </p>
        </div>

        <PracticeList
          practices={practices}
          solvedSlugs={solvedSlugs}
          attemptedSlugs={attemptedSlugs}
        />
      </main>
      <Footer />
    </>
  );
}

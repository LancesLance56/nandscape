import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PracticeList } from "@/components/practices/practice-list";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listPracticeRecords, listSolvedSlugs } from "@/lib/practice/practice-records";
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
  const solvedSlugs = user ? await listSolvedSlugs(user.id).catch(() => []) : [];

  return (
    <>
      <Navbar />
      {/* Identical to /puzzles, deliberately: the catalogue is an ordinary site
          page and carries the ordinary site chrome. The slim PracticeNav
          belongs to the problem workspace, where every vertical pixel goes to
          the editor - browsing has no such need. */}
      <main className="mx-auto max-w-330 px-6 pb-24 pt-32 sm:px-10">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-copper-dark">
            <span className="h-1.75 w-1.75 rounded-full bg-copper" />
            Coding problems
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
          signedOut={!user}
        />
      </main>
      <Footer />
    </>
  );
}

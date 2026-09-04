import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAuthoringRecord } from "@/lib/practice/practice-records";
import { SUPPORTED_LANGUAGES } from "@/lib/practice/languages";
import { ProblemStudio, type StudioDraft } from "@/components/practices/admin/problem-studio";

export const metadata: Metadata = { title: "Problem Studio" };
export const dynamic = "force-dynamic";

interface PageParams {
  params: Promise<{ slug: string }>;
}

/**
 * Sits at /admin/practices/[slug] rather than inside the (dashboard) group,
 * matching the post and tutorial editors: this is a full-screen application
 * with its own header, and nesting it in the dashboard shell would give an
 * editor scrolling inside a pane inside a page (see the note in the group's
 * layout).
 *
 * `/admin/practices/new` opens the same editor over a blank draft.
 */
const BLANK: StudioDraft = {
  slug: "",
  title: "",
  summary: "",
  difficulty: "easy",
  tags: [],
  statement: "",
  signature: { name: "solve", params: [{ name: "nums", type: "int[]" }], returns: "int" },
  languages: ["python", "javascript"],
  starterCode: {
    python: "def solve(nums):\n    pass\n",
    javascript: "function solve(nums) {\n}\n",
  },
  visibleTests: [],
  hiddenTests: [],
  solutions: {},
  compareMode: "exact",
  epsilon: 1e-6,
  timeLimitMs: 2000,
  memoryLimitMb: 256,
};

export default async function ProblemStudioPage({ params }: PageParams) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const { slug } = await params;

  if (slug === "new") {
    return (
      <ProblemStudio initial={BLANK} exists={false} runnableLanguages={SUPPORTED_LANGUAGES} />
    );
  }

  const record = await getAuthoringRecord(slug);
  if (!record) notFound();

  return (
    <ProblemStudio
      initial={{
        slug: record.slug,
        title: record.title,
        summary: record.summary ?? "",
        difficulty: record.difficulty,
        tags: record.tags ?? [],
        statement: record.statement ?? "",
        signature: record.signature,
        languages: record.languages,
        starterCode: record.starterCode ?? {},
        visibleTests: record.visibleTests ?? [],
        hiddenTests: record.hiddenTests ?? [],
        solutions: record.solutions ?? {},
        compareMode: record.compareMode ?? "exact",
        epsilon: record.epsilon ?? 1e-6,
        timeLimitMs: record.timeLimitMs ?? 2000,
        memoryLimitMb: record.memoryLimitMb ?? 256,
      }}
      exists
      runnableLanguages={SUPPORTED_LANGUAGES}
    />
  );
}

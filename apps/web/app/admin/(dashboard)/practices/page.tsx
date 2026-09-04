import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listPracticeRecords } from "@/lib/practice/practice-records";
import { DifficultyTag } from "@/components/puzzles/difficulty-tag";
import type { PracticeSpec } from "@/types/practice";

/**
 * The catalogue the Problem Studio breadcrumb points back to.
 *
 * A dashboard page, so it keeps the admin shell — unlike the editor itself,
 * which is full-screen and lives outside the (dashboard) group.
 */
export default async function AdminPracticesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  let practices: PracticeSpec[] = [];
  try {
    practices = await listPracticeRecords();
  } catch {
    practices = [];
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">Coding problems</h1>
          <Link href="/practices" className="text-xs text-slate hover:text-copper-dark">
            View catalogue →
          </Link>
        </div>
        <Link
          href="/admin/practices/new"
          className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-white hover:bg-copper-dark"
        >
          New problem
        </Link>
      </div>

      {practices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-ink-soft">
          No coding problems yet. Seed them with{" "}
          <code className="font-mono text-xs">node seed/seed.mjs</code> or create one here.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
          {practices.map((practice) => (
            <li key={practice.slug}>
              <Link
                href={`/admin/practices/${practice.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{practice.title}</p>
                  <p className="truncate font-mono text-xs text-ink-soft">{practice.slug}</p>
                </div>
                <span className="hidden text-xs text-ink-soft sm:inline">
                  {practice.visibleTests.length} example · {practice.hiddenTestCount} hidden
                </span>
                <span className="hidden text-xs text-ink-soft md:inline">
                  {practice.languages.join(", ")}
                </span>
                <DifficultyTag difficulty={practice.difficulty} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

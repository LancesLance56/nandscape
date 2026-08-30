import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserPreferences, MAX_PINNED_PROJECTS } from "@/lib/account/preferences";
import { listTrackOutlines } from "@/lib/account/learning";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { PreferencesForm } from "@/components/account/preferences-form";

/**
 * Personalisation.
 *
 * The track list is fetched here rather than in the form so the picker can only
 * ever offer tracks that exist - a free-text slug would let someone save a
 * focus track that no longer resolves and quietly break their own overview.
 */

export default async function AccountPreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [preferences, outlines] = await Promise.all([
    getUserPreferences(user.id),
    listTrackOutlines().catch(() => []),
  ]);

  return (
    <DashboardPage
      title="Personalisation"
      description="These change what your dashboard computes, not just how it looks."
    >
      <section className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <PreferencesForm
          initial={preferences}
          tracks={outlines.map((track) => ({
            slug: track.slug,
            title: track.title,
            pages: track.pages.length,
          }))}
        />
      </section>

      <section className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Pinned circuits</h2>
        <p className="text-xs text-slate">
          Pinning is done on the circuits themselves rather than here - picking one out of a list is
          not a form field.{" "}
          {preferences.pinnedProjectIds.length === 0
            ? `You have none pinned; up to ${MAX_PINNED_PROJECTS} can go on your overview.`
            : `${preferences.pinnedProjectIds.length} of ${MAX_PINNED_PROJECTS} pinned.`}
        </p>
        <Link
          href="/account/circuits"
          className="mt-3 inline-block rounded-lg border border-border-strong px-2.5 py-1 text-xxs font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
        >
          Manage pins
        </Link>
      </section>
    </DashboardPage>
  );
}

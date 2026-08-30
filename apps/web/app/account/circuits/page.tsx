import Link from "next/link";
import { redirect } from "next/navigation";
import { CircuitBoard, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserPreferences, MAX_PINNED_PROJECTS } from "@/lib/account/preferences";
import { listProjectsForUser, type ProjectSummary } from "@/lib/projects/projects";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { PinButton } from "@/components/account/pin-button";

/**
 * Every circuit the reader owns.
 *
 * Pinned ones first, then the rest by when they were last touched. The pin is
 * the personalisation here: it decides what the overview leads with, so the
 * control belongs next to the circuits themselves rather than buried in
 * settings as a list of ids.
 */

export default async function AccountCircuitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [projects, prefs] = await Promise.all([
    listProjectsForUser(user.id).catch(() => []),
    getUserPreferences(user.id).catch(() => null),
  ]);

  const pins = prefs?.pinnedProjectIds ?? [];
  const pinned = pins
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is ProjectSummary => project !== undefined);
  const rest = [...projects]
    .filter((project) => !pins.includes(project.id))
    .sort((a, b) => msOf(b.updatedAt) - msOf(a.updatedAt));

  return (
    <DashboardPage
      title="Circuits"
      description={`${projects.length} saved. Pin up to ${MAX_PINNED_PROJECTS} to keep them on your overview.`}
    >
      {projects.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface-card p-6">
          <p className="text-sm text-ink-soft">You have not saved a circuit yet.</p>
          <Link
            href="/logic-editor"
            className="flex items-center gap-1.5 rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-copper-ink transition-colors hover:bg-copper-dark"
          >
            <Plus className="size-4" />
            Open the editor
          </Link>
        </section>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-ink">Pinned</h2>
              <ul className="flex flex-col gap-2">
                {pinned.map((project) => (
                  <CircuitRow
                    key={project.id}
                    project={project}
                    pins={pins}
                    pinned
                  />
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">
              {pinned.length > 0 ? "Everything else" : "All circuits"}
            </h2>
            {rest.length === 0 ? (
              <p className="text-xs text-slate">Every circuit you own is pinned.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rest.map((project) => (
                  <CircuitRow key={project.id} project={project} pins={pins} pinned={false} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardPage>
  );
}

function CircuitRow({
  project,
  pins,
  pinned,
}: {
  project: ProjectSummary;
  pins: string[];
  pinned: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-surface-card p-3 transition-colors hover:border-border-strong">
      <Link href={`/projects/${project.slug}`} className="group flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-copper-bg text-copper-dark">
          <CircuitBoard className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink group-hover:text-copper-dark">
            {project.name}
          </span>
          <span className="block truncate text-xxs text-slate">
            {project.description || "No description"}
          </span>
        </span>
      </Link>

      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xxs text-slate capitalize">
        {project.visibility.toLowerCase()}
      </span>
      <span className="hidden shrink-0 text-xxs tabular-nums text-slate sm:inline">
        {formatDay(project.updatedAt)}
      </span>

      <PinButton
        projectId={project.id}
        pinned={pinned}
        currentPins={pins}
        atLimit={pins.length >= MAX_PINNED_PROJECTS}
      />
    </li>
  );
}

/** `updatedAt` is typed `string` but arrives from the pg driver as a `Date`;
 *  both shapes go through here rather than trusting the annotation. */
function msOf(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatDay(value: string | Date | null | undefined): string {
  const ms = msOf(value);
  return ms === 0 ? "" : new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

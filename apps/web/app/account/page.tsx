import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { EmailVerificationStatus } from "@/components/account/email-verification-status";
import { UserDashboard } from "@/components/account/user-dashboard";
import { listProjectsForUser } from "@/lib/projects/projects";
import { listProgressForUser } from "@/lib/puzzles/puzzle-progress";
import { listPuzzleRecords } from "@/lib/puzzles/puzzle-records";
import { listPublishedTutorialPages } from "@/lib/tutorials/tutorials";
import { listTutorialProgress, listQuizAttempts, toActivityCounts } from "@/lib/engagement/progress";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The dashboard is a nice-to-have on a page whose real job is the settings
  // forms, so a database hiccup degrades it to zeroes rather than 500ing the
  // page and locking someone out of changing their password.
  const [projects, progress, puzzles, tutorials, quizzes, allTutorialPages] = await Promise.all([
    listProjectsForUser(user.id).catch(() => []),
    listProgressForUser(user.id).catch(() => []),
    listPuzzleRecords().catch(() => []),
    listTutorialProgress(user.id).catch(() => []),
    listQuizAttempts(user.id).catch(() => []),
    listPublishedTutorialPages().catch(() => []),
  ]);

  // Both feeds land on the same day buckets, so a day with a lesson and a quiz
  // reads darker than a day with one. Serialised to a plain object because the
  // heatmap is a client component and a Map will not cross that boundary.
  const activity = Object.fromEntries(toActivityCounts(tutorials, quizzes));

  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 pb-24 pt-32">
        <UserDashboard
          username={user.username}
          projects={projects}
          progress={progress}
          totalPuzzles={puzzles.length}
          tutorials={tutorials}
          totalTutorials={allTutorialPages.length}
          activity={activity}
        />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Account</h2>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-xs text-slate hover:text-copper-dark">
                  Admin →
                </Link>
              )}
            </div>
            <EmailVerificationStatus initial={user.emailVerified} />
            <ProfileForm
              initial={{
                name: user.name,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }}
            />
          </div>

          <div>
            <h2 className="mb-6 font-display text-lg font-semibold text-ink">Change password</h2>
            <PasswordForm />
          </div>
        </div>
      </main>
    </>
  );
}

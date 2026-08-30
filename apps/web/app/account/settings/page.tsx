import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { ProfileForm } from "@/components/account/profile-form";

/**
 * Who you are on the site.
 *
 * Split from Security deliberately: this page changes what other people see,
 * that one changes who can get in. Bundling both into one column, as the old
 * account page did, made the password field just another field on a form whose
 * submit button also renamed you.
 */

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardPage title="Profile" description="Your name, handle and avatar.">
      <section className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <ProfileForm
          initial={{
            name: user.name,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />
      </section>
    </DashboardPage>
  );
}

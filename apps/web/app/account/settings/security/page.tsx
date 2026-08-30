import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DashboardPage } from "@/components/dashboard/dashboard-shell";
import { EmailVerificationStatus } from "@/components/account/email-verification-status";
import { PasswordForm } from "@/components/account/password-form";

/**
 * Everything that decides who can get into this account.
 *
 * Email verification sits here rather than on Profile because a verified
 * address is what the password-reset path trusts - it is a credential, not a
 * contact detail.
 */

export default async function AccountSecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardPage
      title="Security"
      description="Your password and the address that can recover this account."
    >
      <section className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Email address</h2>
        <EmailVerificationStatus initial={user.emailVerified} />
        <p className="mt-3 text-xxs text-slate">{user.email}</p>
      </section>

      <section className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Change password</h2>
        <PasswordForm />
      </section>
    </DashboardPage>
  );
}

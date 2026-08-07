import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <Navbar />
      <main className="mx-auto flex max-w-sm flex-col gap-10 px-6 pb-24 pt-32">
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-ink">Account</h1>
            {user.role === "ADMIN" && (
              <Link href="/admin" className="font-mono text-xs text-slate hover:text-copper-dark">
                Admin →
              </Link>
            )}
          </div>
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
      </main>
    </>
  );
}

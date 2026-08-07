import { redirect } from "next/navigation";
import { listUsers } from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { UserRoleTable } from "@/components/admin/user-role-table";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const users = await listUsers();

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <AdminBreadcrumb trail={[{ label: "Users" }]} />
      <div className="mb-6 mt-3">
        <h1 className="font-display text-2xl font-bold text-ink">Users</h1>
        <p className="mt-1 text-sm text-slate">{users.length} registered</p>
      </div>

      <UserRoleTable
        currentUserId={user.id}
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}

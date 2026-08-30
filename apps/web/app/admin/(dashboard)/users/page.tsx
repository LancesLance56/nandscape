import { redirect } from "next/navigation";
import { listUsers } from "@repo/auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UserRoleTable } from "@/components/admin/user-role-table";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const users = await listUsers();

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <div className="mb-6">
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
    </div>
  );
}

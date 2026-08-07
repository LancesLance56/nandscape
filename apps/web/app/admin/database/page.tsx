import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { DatabaseStudio } from "@/components/admin/database-studio";

export default async function AdminDatabasePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-6 py-3">
        <AdminBreadcrumb trail={[{ label: "Database" }]} />
      </div>
      <div className="min-h-0 flex-1">
        <DatabaseStudio />
      </div>
    </main>
  );
}

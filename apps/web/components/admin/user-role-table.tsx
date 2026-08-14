"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function UserRoleTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, role: "USER" | "ADMIN") => {
    setError(null);
    setPendingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to update role");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      {error && <p className="mb-3 text-sm text-signal-coral">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-2 text-[11px] text-slate">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink">{user.username}</span>
                    {user.name && <span className="ml-2 text-xs text-slate">{user.name}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-slate">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={isSelf || pendingId === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as "USER" | "ADMIN")}
                      title={isSelf ? "You can't change your own role" : undefined}
                      className="rounded-md border border-border-strong bg-surface-card px-2 py-1 text-xs text-ink outline-none focus:border-copper disabled:opacity-50"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

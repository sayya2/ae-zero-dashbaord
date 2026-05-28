"use client";
import { useEffect, useState } from "react";
import { UserPlus, Loader2, ShieldCheck, User, Trash2, KeyRound, X } from "lucide-react";

interface UserRow {
  id: string; name: string; email: string; role: string;
  active: boolean; createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");

  // Password reset modal
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetErr, setResetErr] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function loadUsers() {
    const r = await fetch("/api/dashboard/users");
    const d = await r.json();
    setUsers(d.users ?? []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/dashboard/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setShowForm(false); setName(""); setEmail(""); setPassword(""); setRole("agent");
      await loadUsers();
    } else {
      setErr(d.error ?? "Failed to create user");
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/dashboard/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    await loadUsers();
  }

  async function changeRole(id: string, newRole: string) {
    await fetch("/api/dashboard/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole }),
    });
    await loadUsers();
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetBusy(true); setResetErr("");
    const r = await fetch("/api/dashboard/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resetTarget.id, password: newPassword }),
    });
    const d = await r.json();
    setResetBusy(false);
    if (r.ok) {
      setResetTarget(null); setNewPassword("");
    } else {
      setResetErr(d.error ?? "Failed to reset password");
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const r = await fetch("/api/dashboard/users", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    setDeleteBusy(false);
    if (r.ok) {
      setDeleteTarget(null);
      await loadUsers();
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Users</h1>
          <p className="text-sm text-gray-500">Manage dashboard access</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-md bg-[#73a638] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#5e8a2d]"
        >
          <UserPlus size={14} /> Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">New User</h2>
          <div className="grid grid-cols-2 gap-3">
            {[["Name", name, setName, "text"], ["Email", email, setEmail, "email"],
              ["Password", password, setPassword, "password"]].map(([label, val, setter, type]) => (
              <div key={label as string}>
                <label className="mb-1 block text-xs font-medium text-gray-600">{label as string}</label>
                <input type={type as string} required value={val as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy}
              className="flex items-center gap-2 rounded-md bg-[#73a638] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy && <Loader2 size={13} className="animate-spin" />} Create
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : users.map((u) => (
          <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {u.role === "admin"
                  ? <ShieldCheck size={15} className="text-[#73a638]" />
                  : <User size={15} className="text-gray-400" />}
                <div>
                  <p className="font-medium text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {u.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                className="rounded border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-600 focus:border-[#73a638] focus:outline-none"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <span className="text-xs text-gray-400">Joined {new Date(u.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
              <button onClick={() => toggleActive(u.id, !u.active)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {u.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => { setResetTarget(u); setNewPassword(""); setResetErr(""); }}
                className="flex items-center gap-1 rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <KeyRound size={13} /> Reset pw
              </button>
              <button onClick={() => setDeleteTarget(u)}
                className="ml-auto flex items-center gap-1 rounded p-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <span className="flex items-center gap-2">
                    {u.role === "admin"
                      ? <ShieldCheck size={14} className="text-[#73a638]" />
                      : <User size={14} className="text-gray-400" />}
                    {u.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-600 focus:border-[#73a638] focus:outline-none"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleActive(u.id, !u.active)}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => { setResetTarget(u); setNewPassword(""); setResetErr(""); }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      title="Reset password"
                    >
                      <KeyRound size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500">
              Set a new password for <span className="font-medium text-gray-700">{resetTarget.name}</span> ({resetTarget.email})
            </p>
            <form onSubmit={resetPassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
                />
              </div>
              {resetErr && <p className="text-xs text-red-600">{resetErr}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={resetBusy}
                  className="flex items-center gap-2 rounded-md bg-[#73a638] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {resetBusy && <Loader2 size={13} className="animate-spin" />} Reset Password
                </button>
                <button type="button" onClick={() => setResetTarget(null)}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Delete User</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete <span className="font-medium text-gray-800">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={deleteUser} disabled={deleteBusy}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleteBusy && <Loader2 size={13} className="animate-spin" />} Delete
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

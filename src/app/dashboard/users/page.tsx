"use client";
import { useEffect, useState } from "react";
import { UserPlus, Loader2, ShieldCheck, User } from "lucide-react";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");

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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                  {u.role === "admin" ? <ShieldCheck size={14} className="text-[#73a638]" /> : <User size={14} className="text-gray-400" />}
                  {u.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(u.id, !u.active)}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface LogEntry {
  id: string; action: string; entityType: string | null; entityId: string | null;
  ipAddress: string | null; createdAt: string; meta: Record<string, unknown> | null;
  user: { name: string; email: string };
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load(p = 1) {
    setLoading(true);
    const r = await fetch(`/api/dashboard/activity?page=${p}`);
    const d = await r.json();
    setLogs(d.logs); setTotal(d.total); setPage(d.page); setPages(d.pages);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Activity Log</h1>
          <p className="text-sm text-gray-500">{total} events recorded</p>
        </div>
        <button onClick={() => load(page)} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : logs.map((l) => (
          <div key={l.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{l.action}</span>
              <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString("en-GB")}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">{l.user.name}</p>
            {l.entityType && <p className="text-xs text-gray-400">{l.entityType}</p>}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-700">{l.user.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-800">{l.action}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{l.entityType ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button onClick={() => load(page - 1)} disabled={page <= 1}
            className="rounded border border-gray-200 px-3 py-1 disabled:opacity-40 hover:bg-gray-100">Prev</button>
          <span className="text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages}
            className="rounded border border-gray-200 px-3 py-1 disabled:opacity-40 hover:bg-gray-100">Next</button>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { RefreshCw, ChevronRight } from "lucide-react";

interface ClosureRow {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  utilityName: string | null;
  systemKwp: number;
  approvedKwp: number | null;
  finalPriceMvr: number | null;
  invoiceNumber: string | null;
  status: string;
  createdAt: string;
  invoiceGeneratedAt: string | null;
  user: { name: string } | null;
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default function ClosuresPage() {
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    const url = filter === "all" ? "/api/dashboard/closures" : `/api/dashboard/closures?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setClosures(data.closures ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  const statuses = ["all", "new", "utility_requested", "capacity_received", "invoiced", "closed"];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Closures</h1>
          <p className="text-sm text-gray-500">All active and completed closure deals</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
              filter === s ? "bg-[#73a638] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Quote #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Utility</th>
              <th className="px-4 py-3 text-left">kWp</th>
              <th className="px-4 py-3 text-left">Invoice</th>
              <th className="px-4 py-3 text-left">Total (MVR)</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : closures.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No closures found</td></tr>
            ) : (
              closures.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.quoteNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.customerName}</p>
                    <p className="text-xs text-gray-400">{c.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.utilityName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.approvedKwp ? `${c.approvedKwp}` : `${c.systemKwp}`}
                    <span className="text-xs text-gray-400"> kWp</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.finalPriceMvr ? `MVR ${fmt.format(c.finalPriceMvr)}` : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.user?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/closure/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#73a638] hover:underline"
                    >
                      Open <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

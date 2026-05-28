"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { RefreshCw, ChevronRight, FileText } from "lucide-react";

interface QuoteRow {
  s3Key: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lastModified: string;
  closureStatus: string | null;
  closureId: string | null;
}

function ViewPdfButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${quoteId}/pdf`);
      const { url } = await res.json();
      window.open(url, "_blank", "noopener");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={open}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-50"
      title="View Quote PDF"
    >
      <FileText size={13} />
      {loading ? "…" : "PDF"}
    </button>
  );
}

function QuoteActions({ q }: { q: QuoteRow }) {
  return (
    <div className="flex items-center gap-3">
      <ViewPdfButton quoteId={q.quoteId} />
      {q.closureId ? (
        <Link
          href={`/dashboard/closure/${q.closureId}`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#73a638] hover:underline"
        >
          Open Closure <ChevronRight size={12} />
        </Link>
      ) : (
        <Link
          href={`/dashboard/quotes/${q.quoteId}`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:underline"
        >
          Start Closure <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/quotes");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setQuotes(data.quotes);
    } catch {
      setError("Could not load quotes. Check S3 configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Instant Quotes</h1>
          <p className="text-sm text-gray-500">All quotes submitted via the calculator</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">Loading quotes…</div>
        ) : quotes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">No quotes found</div>
        ) : quotes.map((q) => (
          <div key={q.s3Key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-800">{q.customerName || "—"}</p>
                <p className="text-xs text-gray-400">{q.customerPhone || "—"}</p>
              </div>
              <StatusBadge status={q.closureStatus} />
            </div>
            <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
              <span className="font-mono">{q.quoteNumber || "—"}</span>
              <span>{q.lastModified ? new Date(q.lastModified).toLocaleDateString("en-GB") : "—"}</span>
            </div>
            <QuoteActions q={q} />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Quote #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Closure Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading quotes…</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No quotes found</td></tr>
            ) : quotes.map((q) => (
              <tr key={q.s3Key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.quoteNumber || "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{q.customerName || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{q.customerPhone || "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {q.lastModified ? new Date(q.lastModified).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.closureStatus} /></td>
                <td className="px-4 py-3 text-right">
                  <QuoteActions q={q} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

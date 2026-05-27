"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

interface QuoteData {
  quoteNumber: string;
  s3Key: string;
  quoteId: string;
  payload: {
    customer?: { name?: string; email?: string; phone?: string; address?: string; tin?: string };
    recommendedKwp?: number;
    gridPlan?: string;
    selectedPlan?: string;
  };
  closure: { id: string } | null;
}

export default function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [accountNo, setAccountNo] = useState("");
  const [billId, setBillId] = useState("");
  const [utility, setUtility] = useState("STELCO");

  useEffect(() => {
    fetch(`/api/dashboard/quotes/${quoteId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.closure) {
          router.replace(`/dashboard/closure/${d.closure.id}`);
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Failed to load quote"))
      .finally(() => setLoading(false));
  }, [quoteId, router]);

  async function startClosure() {
    if (!data) return;
    setSubmitting(true);
    setError("");
    const c = data.payload.customer ?? {};
    const res = await fetch("/api/dashboard/closure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteS3Key: data.s3Key,
        quoteNumber: data.quoteNumber,
        customerName: c.name ?? "",
        customerEmail: c.email ?? "",
        customerPhone: c.phone ?? "",
        customerAddress: c.address ?? "",
        customerTin: c.tin ?? "",
        customerAccountNo: accountNo,
        customerBillId: billId,
        utilityName: utility,
        systemKwp: data.payload.recommendedKwp ?? 0,
        gridPlan: data.payload.gridPlan ?? "ongrid",
        selectedPlan: data.payload.selectedPlan ?? "discounted",
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (res.ok) {
      router.push(`/dashboard/closure/${json.closure.id}`);
    } else {
      setError(json.error ?? "Failed to start closure");
    }
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading quote…</div>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const c = data.payload.customer ?? {};
  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="mb-1 text-xl font-semibold text-gray-800">Start Closure</h1>
      <p className="mb-6 text-sm text-gray-500">Quote {data.quoteNumber}</p>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Customer Details (from quote)</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[["Name", c.name], ["Phone", c.phone], ["Email", c.email], ["Address", c.address],
            ["TIN", c.tin], ["System", `${data.payload.recommendedKwp} kWp`],
            ["Grid", data.payload.gridPlan], ["Plan", data.payload.selectedPlan]]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="font-medium text-gray-800">{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Utility Information</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Utility Provider</label>
            <select
              value={utility}
              onChange={(e) => setUtility(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            >
              <option>STELCO</option>
              <option>FENAKA</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Account Number</label>
            <input
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="e.g. 1234567"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Bill ID</label>
            <input
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
              placeholder="e.g. BILL-2025-001"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={startClosure}
        disabled={submitting || !accountNo || !billId}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#73a638] py-2.5 text-sm font-medium text-white hover:bg-[#5e8a2d] disabled:opacity-50"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        Start Closure Process
      </button>
    </div>
  );
}

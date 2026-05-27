"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, CheckCircle, FileText, Loader2, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

type Closure = {
  id: string; quoteNumber: string; status: string;
  customerName: string; customerEmail: string | null; customerPhone: string;
  customerAddress: string; customerTin: string | null;
  customerAccountNo: string | null; customerBillId: string | null;
  utilityName: string | null; utilityEmailSentAt: string | null;
  utilityEmailStatus: string; maxKwpFromUtility: number | null;
  systemKwp: number; gridPlan: string; selectedPlan: string;
  approvedKwp: number | null; freightType: string | null;
  finalPriceMvr: number | null; invoiceNumber: string | null;
  invoiceGeneratedAt: string | null; notes: string | null;
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function ReDownloadButton({ closureId }: { closureId: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/invoice/${closureId}/download`);
      const { url } = await res.json();
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={download} disabled={busy}
      className="text-xs font-medium underline disabled:opacity-50">
      {busy ? "Getting link…" : "Re-download Invoice"}
    </button>
  );
}

export default function ClosurePage({ params }: { params: Promise<{ closureId: string }> }) {
  const { closureId } = use(params);
  const router = useRouter();
  const [closure, setClosure] = useState<Closure | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Step 3 inputs
  const [maxKwp, setMaxKwp] = useState("");
  const [utilityNotes, setUtilityNotes] = useState("");

  // Step 4 inputs
  const [approvedKwp, setApprovedKwp] = useState("");
  const [freightType, setFreightType] = useState<"20ft" | "40ft">("20ft");
  const [invoiceResult, setInvoiceResult] = useState<{ invoiceNumber: string; downloadUrl: string; pricing: { totalInclGst: number; gstAmount: number; totalExclGst: number } } | null>(null);

  async function reload() {
    const r = await fetch(`/api/dashboard/closure/${closureId}`);
    const d = await r.json();
    setClosure(d.closure);
    if (d.closure.maxKwpFromUtility) setMaxKwp(String(d.closure.maxKwpFromUtility));
    if (d.closure.approvedKwp) setApprovedKwp(String(d.closure.approvedKwp));
    if (d.closure.freightType) setFreightType(d.closure.freightType as "20ft" | "40ft");
  }

  useEffect(() => {
    reload().catch(() => setMsg({ type: "err", text: "Failed to load closure" }))
      .finally(() => setLoading(false));
  }, [closureId]);

  async function sendUtilityEmail() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/dashboard/utility-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closureId }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) { setMsg({ type: "ok", text: `Email sent to ${closure?.utilityName}` }); await reload(); }
    else setMsg({ type: "err", text: d.error ?? "Failed to send email" });
  }

  async function saveCapacity() {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/dashboard/closure/${closureId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxKwpFromUtility: Number(maxKwp),
        utilityNotes,
        utilityEmailStatus: "replied",
        utilityRepliedAt: new Date().toISOString(),
        status: "capacity_received",
      }),
    });
    setBusy(false);
    if (r.ok) { setMsg({ type: "ok", text: "Capacity saved" }); await reload(); }
    else setMsg({ type: "err", text: "Failed to save" });
  }

  async function generateInvoice() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/dashboard/invoice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closureId, approvedKwp: Number(approvedKwp), freightType }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setInvoiceResult(d);
      setMsg({ type: "ok", text: `Invoice ${d.invoiceNumber} generated` });
      await reload();
    } else setMsg({ type: "err", text: d.error ?? "Failed to generate invoice" });
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading…</div>;
  if (!closure) return null;

  const steps = [
    { id: 1, label: "Quote Received", done: true },
    { id: 2, label: "Utility Email Sent", done: closure.utilityEmailStatus !== "pending" },
    { id: 3, label: "Capacity Confirmed", done: !!closure.maxKwpFromUtility },
    { id: 4, label: "Invoice Generated", done: !!closure.invoiceGeneratedAt },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.push("/dashboard/quotes")} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> All Quotes
      </button>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{closure.customerName}</h1>
          <p className="text-sm text-gray-500">Quote {closure.quoteNumber} · {closure.systemKwp} kWp</p>
        </div>
        <StatusBadge status={closure.status} />
      </div>

      {/* Progress stepper */}
      <div className="mb-6 flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-[#73a638] text-white" : "bg-gray-200 text-gray-500"}`}>
              {s.done ? <CheckCircle size={14} /> : s.id}
            </div>
            <p className={`ml-1 hidden text-xs sm:block ${s.done ? "text-[#73a638]" : "text-gray-400"}`}>{s.label}</p>
            {i < steps.length - 1 && <div className={`mx-2 flex-1 h-px ${s.done ? "bg-[#73a638]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 rounded-md px-4 py-2.5 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.type === "err" && <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Customer card */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {[["Phone", closure.customerPhone], ["Email", closure.customerEmail],
            ["Address", closure.customerAddress], ["TIN", closure.customerTin],
            ["Account No", closure.customerAccountNo], ["Bill ID", closure.customerBillId],
            ["Utility", closure.utilityName]]
            .filter(([, v]) => v)
            .map(([l, v]) => (
              <div key={l}><dt className="text-xs text-gray-400">{l}</dt><dd className="font-medium text-gray-700">{v}</dd></div>
            ))}
        </dl>
      </div>

      {/* Step 2 — Send utility email */}
      <div className={`mb-4 rounded-lg border bg-white p-4 shadow-sm ${closure.utilityEmailStatus !== "pending" ? "border-green-200" : "border-gray-200"}`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Step 2 — Request Grid Capacity</h2>
          {closure.utilityEmailStatus !== "pending" && (
            <span className="text-xs text-green-600">
              Sent {closure.utilityEmailSentAt ? new Date(closure.utilityEmailSentAt).toLocaleDateString("en-GB") : ""}
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Send an email to {closure.utilityName} requesting the maximum solar capacity for Account {closure.customerAccountNo}.
        </p>
        <button
          onClick={sendUtilityEmail}
          disabled={busy || closure.utilityEmailStatus !== "pending"}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
          {closure.utilityEmailStatus !== "pending" ? "Email Sent" : `Send to ${closure.utilityName}`}
        </button>
      </div>

      {/* Step 3 — Enter capacity from utility */}
      <div className={`mb-4 rounded-lg border bg-white p-4 shadow-sm ${closure.maxKwpFromUtility ? "border-green-200" : "border-gray-200"}`}>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Step 3 — Enter Approved Capacity</h2>
        <p className="mb-3 text-xs text-gray-500">Once {closure.utilityName} replies, enter the maximum kWp they have approved.</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Max kWp from {closure.utilityName}</label>
            <input
              type="number" min={1} max={90} step={0.5}
              value={maxKwp}
              onChange={(e) => setMaxKwp(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Notes (optional)</label>
            <input
              value={utilityNotes}
              onChange={(e) => setUtilityNotes(e.target.value)}
              placeholder="Any remarks from utility"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={saveCapacity}
          disabled={busy || !maxKwp}
          className="mt-3 flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          Save Capacity
        </button>
        {closure.maxKwpFromUtility && (
          <p className="mt-2 text-xs text-green-600">Saved: {closure.maxKwpFromUtility} kWp approved</p>
        )}
      </div>

      {/* Step 4 — Generate invoice */}
      <div className={`rounded-lg border bg-white p-4 shadow-sm ${closure.invoiceGeneratedAt ? "border-green-200" : "border-gray-200"}`}>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Step 4 — Generate Final Invoice</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Approved kWp</label>
            <input
              type="number" min={1} max={90} step={0.5}
              value={approvedKwp || closure.maxKwpFromUtility || ""}
              onChange={(e) => setApprovedKwp(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Freight Type</label>
            <select
              value={freightType}
              onChange={(e) => setFreightType(e.target.value as "20ft" | "40ft")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#73a638] focus:outline-none"
            >
              <option value="40ft">40ft FCL (cheaper, ≤30 kWp)</option>
              <option value="20ft">20ft FCL (up to 90 kWp)</option>
            </select>
          </div>
        </div>
        <button
          onClick={generateInvoice}
          disabled={busy || !approvedKwp}
          className="mt-3 flex items-center gap-2 rounded-md bg-[#73a638] px-4 py-2 text-sm font-medium text-white hover:bg-[#5e8a2d] disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          Generate Invoice PDF
        </button>

        {(invoiceResult || closure.invoiceGeneratedAt) && (
          <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
            <p className="font-semibold">Invoice {invoiceResult?.invoiceNumber ?? closure.invoiceNumber}</p>
            {closure.finalPriceMvr && (
              <p className="text-xs">Total: MVR {fmt.format(closure.finalPriceMvr)} (incl. GST)</p>
            )}
            <div className="mt-2 flex gap-3">
              {invoiceResult?.downloadUrl && (
                <a href={invoiceResult.downloadUrl} target="_blank" rel="noreferrer"
                  className="text-xs font-medium underline">
                  Download Invoice PDF
                </a>
              )}
              <ReDownloadButton closureId={closureId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

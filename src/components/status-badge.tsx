const MAP: Record<string, { label: string; cls: string }> = {
  new:                { label: "New",               cls: "bg-blue-100 text-blue-700" },
  utility_requested:  { label: "Utility Requested", cls: "bg-yellow-100 text-yellow-700" },
  capacity_received:  { label: "Capacity Received", cls: "bg-purple-100 text-purple-700" },
  invoiced:           { label: "Invoiced",          cls: "bg-green-100 text-green-700" },
  closed:             { label: "Closed",            cls: "bg-gray-200 text-gray-600" },
};

export function StatusBadge({ status }: { status: string | null }) {
  const s = MAP[status ?? ""] ?? { label: status ?? "—", cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

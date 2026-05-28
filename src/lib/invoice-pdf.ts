import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const mvr = (v?: number) => (v === undefined || v === null ? "-" : `MVR ${fmt.format(v)}`);

const BRAND_GREEN = rgb(0.45, 0.65, 0.22);
const DARK = rgb(0.25, 0.25, 0.25);
const MID = rgb(0.5, 0.5, 0.5);
const LIGHT_GRAY = rgb(0.9, 0.9, 0.9);
const WHITE = rgb(1, 1, 1);

const PLAN_LABELS: Record<string, string> = {
  discounted: "Ultra Saving Plan",
  noDiscount: "Milestone Plan",
  installment: "Installment Plan",
};

export interface InvoiceData {
  invoiceNumber: string;
  issuedAt: Date;
  customer: {
    name: string;
    phone: string;
    address: string;
    email?: string;
    tin?: string;
  };
  system: {
    kwp: number;
    gridPlan: string;
    freightType: string;
  };
  pricing: {
    totalExclGst: number;
    gstAmount: number;
    totalInclGst: number;
    perKwpPrice: number;
  };
  plan: {
    selectedPlan: string;
  };
  company: {
    name: string;
    address: string;
    contact: string;
    email: string;
    gst: string;
    reg: string;
    bank: string;
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function computePlanBreakdown(plan: string, totalInclGst: number) {
  if (plan === "discounted") {
    const discountAmount = Math.round(totalInclGst * 0.1);
    const finalTotal = totalInclGst - discountAmount;
    return {
      label: PLAN_LABELS.discounted,
      rows: [
        { label: "Base Price (incl. GST)", amount: totalInclGst },
        { label: "Ultra Saving Discount (10%)", amount: -discountAmount },
        { label: "Final Invoice Total", amount: finalTotal, bold: true },
        { label: "80% Upfront Payment", amount: Math.round(finalTotal * 0.8) },
        { label: "20% On Completion", amount: Math.round(finalTotal * 0.2) },
      ],
      finalTotal,
    };
  }
  if (plan === "installment") {
    const deposit = Math.round(totalInclGst * 0.4);
    const remaining = totalInclGst - deposit;
    const monthly = Math.round(remaining / 6);
    return {
      label: PLAN_LABELS.installment,
      rows: [
        { label: "Total (incl. GST)", amount: totalInclGst, bold: true },
        { label: "40% Deposit", amount: deposit },
        { label: "Monthly Payment × 6", amount: monthly },
        { label: "Total Installment Payments", amount: monthly * 6 },
      ],
      finalTotal: totalInclGst,
    };
  }
  // noDiscount (default / Milestone Plan)
  return {
    label: PLAN_LABELS.noDiscount ?? "Milestone Plan",
    rows: [
      { label: "Total (incl. GST)", amount: totalInclGst, bold: true },
      { label: "70% Upfront", amount: Math.round(totalInclGst * 0.7) },
      { label: "20% On Delivery", amount: Math.round(totalInclGst * 0.2) },
      { label: "10% On Completion", amount: Math.round(totalInclGst * 0.1) },
    ],
    finalTotal: totalInclGst,
  };
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${data.invoiceNumber} — AE by Zero`);
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Logo (top-left) — skipped if file unavailable ───────────────────
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const logoBytes = await readFile(join(process.cwd(), "public", "logo.png"));
    const img = await doc.embedPng(logoBytes);
    const scale = Math.min(110 / img.width, 50 / img.height);
    page.drawImage(img, { x: 50, y: height - 70 - img.height * scale, width: img.width * scale, height: img.height * scale });
  } catch { /* logo is optional */ }

  // ── Company info (top-right) ─────────────────────────────────────────
  const compTop = height - 50;
  [
    data.company.name,
    data.company.address,
    `Tel: ${data.company.contact}`,
    data.company.email,
    data.company.gst,
    data.company.reg,
  ].forEach((line, i) => {
    page.drawText(line, { x: 330, y: compTop - i * 12, size: 9, font, color: DARK });
  });

  // ── Invoice heading ──────────────────────────────────────────────────
  page.drawText("FINAL INVOICE", { x: 50, y: height - 155, size: 16, font: bold, color: BRAND_GREEN });
  page.drawText(`Invoice #: ${data.invoiceNumber}`, { x: 50, y: height - 175, size: 9, font, color: DARK });

  // ── Customer block (left) + dates (right) ────────────────────────────
  const blockY = height - 210;
  page.drawText("Bill To", { x: 50, y: blockY + 12, size: 8, font, color: MID });
  const addrLines = wrapText(data.customer.address, 30).slice(0, 2);
  [
    data.customer.name,
    ...addrLines,
    data.customer.phone,
    data.customer.email ?? "",
    data.customer.tin ? `TIN: ${data.customer.tin}` : "",
  ].filter(Boolean).forEach((line, i) => {
    page.drawText(line, { x: 50, y: blockY - i * 12, size: 10, font, color: DARK });
  });

  const expiry = new Date(data.issuedAt);
  expiry.setDate(expiry.getDate() + 30);
  [
    { label: "Issue Date", value: formatDate(data.issuedAt) },
    { label: "Due Date", value: formatDate(expiry) },
  ].forEach(({ label, value }, i) => {
    const bx = 300 + i * 120;
    page.drawText(label, { x: bx, y: blockY + 12, size: 8, font, color: MID });
    page.drawText(value, { x: bx, y: blockY, size: 10, font: bold, color: DARK });
  });

  // ── Line item table ──────────────────────────────────────────────────
  const tableTop = height - 310;
  const tableX = 50;
  const colWidths = [290, 70, 125];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 18;

  // Header row
  page.drawRectangle({ x: tableX, y: tableTop - rowH, width: tableWidth, height: rowH, color: LIGHT_GRAY });
  ["DESCRIPTION", "kWp", "AMOUNT"].forEach((h, i) => {
    const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5;
    page.drawText(h, { x, y: tableTop - rowH + 5, size: 8, font: bold, color: DARK });
  });

  let rowTop = tableTop - rowH;

  const drawRow = (desc: string, kwp: string, amount: string, opts?: { bold?: boolean; shade?: boolean }) => {
    const y = rowTop - rowH;
    if (opts?.shade) {
      page.drawRectangle({ x: tableX, y, width: tableWidth, height: rowH, color: rgb(0.97, 0.97, 0.97) });
    }
    page.drawRectangle({ x: tableX, y, width: tableWidth, height: rowH, borderColor: LIGHT_GRAY, borderWidth: 0.5 });
    const f = opts?.bold ? bold : font;
    page.drawText(desc, { x: tableX + 5, y: y + 5, size: 8.5, font: f, color: DARK });
    if (kwp) page.drawText(kwp, { x: tableX + colWidths[0] + 5, y: y + 5, size: 8.5, font: f, color: DARK });
    if (amount) {
      const ax = tableX + colWidths[0] + colWidths[1] + colWidths[2] - bold.widthOfTextAtSize(amount, 8.5) - 6;
      page.drawText(amount, { x: ax, y: y + 5, size: 8.5, font: f, color: DARK });
    }
    rowTop -= rowH;
  };

  const gridLabel = data.system.gridPlan === "ongrid" ? "On-Grid" : "Off-Grid / Hybrid";
  const freightLabel = data.system.freightType === "40ft" ? "40ft FCL" : "20ft FCL";
  drawRow(`${gridLabel} Solar PV System — ${freightLabel}`, `${data.system.kwp} kWp`, mvr(data.pricing.totalExclGst), { bold: true });
  drawRow("GST (8%)", "", mvr(data.pricing.gstAmount));

  // Total row (green)
  const totalRowY = rowTop - rowH;
  page.drawRectangle({ x: tableX + colWidths[0] + colWidths[1], y: totalRowY, width: colWidths[2], height: rowH, color: BRAND_GREEN });
  page.drawText("TOTAL (incl. GST)", { x: tableX + 5, y: totalRowY + 5, size: 9, font: bold, color: DARK });
  const totalStr = mvr(data.pricing.totalInclGst);
  page.drawText(totalStr, {
    x: tableX + colWidths[0] + colWidths[1] + colWidths[2] - bold.widthOfTextAtSize(totalStr, 9) - 6,
    y: totalRowY + 5, size: 9, font: bold, color: WHITE,
  });
  rowTop -= rowH;

  // ── Payment Plan breakdown ───────────────────────────────────────────
  const planData = computePlanBreakdown(data.plan.selectedPlan, data.pricing.totalInclGst);
  const planY = rowTop - 30;

  page.drawLine({ start: { x: 50, y: planY + 15 }, end: { x: width - 50, y: planY + 15 }, thickness: 0.5, color: LIGHT_GRAY });
  page.drawText("Payment Plan", { x: 50, y: planY, size: 11, font: bold, color: BRAND_GREEN });
  page.drawText(planData.label, { x: 180, y: planY, size: 10, font, color: DARK });

  let py = planY - 20;
  for (const row of planData.rows) {
    const amtStr = mvr(Math.abs(row.amount));
    const displayAmt = row.amount < 0 ? `-${amtStr}` : amtStr;
    const f = row.bold ? bold : font;
    if (row.bold) {
      page.drawRectangle({ x: 50, y: py - 4, width: tableWidth, height: 16, color: rgb(0.95, 0.98, 0.92) });
    }
    page.drawText(row.label, { x: 55, y: py, size: 9, font: f, color: DARK });
    page.drawText(displayAmt, { x: 350, y: py, size: 9, font: f, color: row.amount < 0 ? rgb(0.7, 0.2, 0.2) : DARK });
    py -= 18;
  }

  // ── Bank / payment details ───────────────────────────────────────────
  py -= 10;
  page.drawLine({ start: { x: 50, y: py }, end: { x: width - 50, y: py }, thickness: 0.5, color: LIGHT_GRAY });
  py -= 20;
  page.drawText("Payment Details", { x: 50, y: py, size: 9, font: bold, color: DARK });
  py -= 14;
  wrapText(data.company.bank, 90).forEach((line) => {
    page.drawText(line, { x: 50, y: py, size: 8, font, color: DARK });
    py -= 11;
  });

  // ── Footer disclaimer ────────────────────────────────────────────────
  py -= 10;
  page.drawLine({ start: { x: 50, y: py }, end: { x: width - 50, y: py }, thickness: 1, color: LIGHT_GRAY });
  py -= 14;
  [
    "This invoice is generated based on the approved solar capacity confirmed by the relevant utility authority.",
    "Final installation pricing may vary subject to site survey findings.",
  ].forEach((line) => {
    page.drawText(line, { x: 50, y: py, size: 7.5, font, color: MID });
    py -= 11;
  });

  // Signature block (bottom-right)
  page.drawText("Authorised Signature", { x: width - 150, y: 60, size: 8, font, color: BRAND_GREEN });
  page.drawLine({ start: { x: width - 150, y: 50 }, end: { x: width - 50, y: 50 }, thickness: 0.5, color: LIGHT_GRAY });
  page.drawText("Date", { x: width - 150, y: 36, size: 8, font, color: BRAND_GREEN });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const mvr = (v: number) => `MVR ${fmt.format(v)}`;

const BRAND_GREEN = rgb(0.45, 0.65, 0.22);
const DARK = rgb(0.2, 0.2, 0.2);
const MID = rgb(0.45, 0.45, 0.45);
const LIGHT_BG = rgb(0.96, 0.96, 0.96);

interface InvoiceData {
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

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const row = (y: number, label: string, value: string, highlight = false) => {
    if (highlight) {
      page.drawRectangle({ x: 50, y: y - 4, width: width - 100, height: 18, color: LIGHT_BG });
    }
    page.drawText(label, { x: 55, y, size: 10, font, color: DARK });
    page.drawText(value, { x: 350, y, size: 10, font: highlight ? bold : font, color: DARK });
  };

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: BRAND_GREEN });
  page.drawText("FINAL INVOICE", { x: 50, y: height - 45, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(data.company.name, { x: 50, y: height - 65, size: 10, font, color: rgb(1, 1, 1) });
  page.drawText(`Invoice #: ${data.invoiceNumber}`, { x: width - 200, y: height - 45, size: 10, font: bold, color: rgb(1, 1, 1) });
  const dStr = data.issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  page.drawText(`Date: ${dStr}`, { x: width - 200, y: height - 60, size: 9, font, color: rgb(1, 1, 1) });

  // Company info
  let y = height - 110;
  page.drawText("Issued By", { x: 50, y, size: 8, font, color: MID });
  page.drawText("Bill To", { x: 300, y, size: 8, font, color: MID });
  y -= 15;
  const compLines = [data.company.name, data.company.address, data.company.contact, data.company.email, data.company.gst, data.company.reg];
  const custLines = [data.customer.name, data.customer.address, data.customer.phone, data.customer.email ?? "", data.customer.tin ? `TIN: ${data.customer.tin}` : ""].filter(Boolean);
  const maxLines = Math.max(compLines.length, custLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (compLines[i]) page.drawText(compLines[i], { x: 50, y: y - i * 13, size: 9, font, color: DARK });
    if (custLines[i]) page.drawText(custLines[i], { x: 300, y: y - i * 13, size: 9, font, color: DARK });
  }

  // Divider
  y -= maxLines * 13 + 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: BRAND_GREEN });
  y -= 20;

  // System details section
  page.drawText("System Details", { x: 50, y, size: 11, font: bold, color: BRAND_GREEN });
  y -= 20;
  row(y, "System Capacity", `${data.system.kwp} kWp`); y -= 20;
  row(y, "Grid Configuration", data.system.gridPlan === "ongrid" ? "On-Grid" : "Off-Grid / Hybrid"); y -= 20;
  row(y, "Freight Type", data.system.freightType === "40ft" ? "40ft FCL Container" : "20ft FCL Container"); y -= 20;
  row(y, "Price per kWp (incl. GST)", mvr(data.pricing.perKwpPrice)); y -= 30;

  // Pricing section
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;
  page.drawText("Pricing Breakdown", { x: 50, y, size: 11, font: bold, color: BRAND_GREEN });
  y -= 20;
  row(y, `Solar PV System — ${data.system.kwp} kWp (excl. GST)`, mvr(data.pricing.totalExclGst)); y -= 20;
  row(y, "GST 8%", mvr(data.pricing.gstAmount)); y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  y -= 5;
  row(y, "TOTAL (incl. GST)", mvr(data.pricing.totalInclGst), true); y -= 35;

  // Bank details
  page.drawRectangle({ x: 50, y: y - 30, width: width - 100, height: 50, color: LIGHT_BG });
  page.drawText("Payment Details", { x: 60, y: y + 8, size: 9, font: bold, color: DARK });
  page.drawText(data.company.bank, { x: 60, y: y - 8, size: 8, font, color: DARK });
  y -= 55;

  // Disclaimer
  page.drawText("This invoice is generated based on the approved solar capacity confirmed by the relevant utility authority.", {
    x: 50, y: y - 10, size: 7.5, font, color: MID,
  });
  page.drawText("Final installation pricing may vary subject to site survey findings.", {
    x: 50, y: y - 22, size: 7.5, font, color: MID,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

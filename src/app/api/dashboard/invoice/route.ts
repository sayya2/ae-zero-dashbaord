import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceBreakdown } from "@/lib/pricing";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { uploadPdf, getSignedDownloadUrl } from "@/lib/s3-quotes";
import { logActivity, getClientIp } from "@/lib/activity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { closureId, approvedKwp, freightType } = await req.json();
  if (!closureId || !approvedKwp || !freightType) {
    return NextResponse.json({ error: "closureId, approvedKwp, freightType required" }, { status: 400 });
  }

  const closure = await prisma.closureForm.findUnique({ where: { id: closureId } });
  if (!closure) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pricing = getPriceBreakdown(Number(approvedKwp), freightType as "20ft" | "40ft");

  const now = new Date();
  const invoiceNumber = `INV${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;

  const company = {
    name: process.env.COMPANY_NAME ?? "AE by Zero",
    address: process.env.COMPANY_ADDRESS ?? "H. Azum, 3rd Floor, Male City, Maldives",
    contact: process.env.COMPANY_CONTACT ?? "+960 9903105",
    email: process.env.COMPANY_EMAIL ?? "accounts@ae-zero.com",
    gst: process.env.COMPANY_GST ?? "GST no: 1120632GST01",
    reg: process.env.COMPANY_REG ?? "Company Reg: C04242020",
    bank: process.env.COMPANY_BANK ?? "Account No: 7730-000717-371 | Account Name: Zero Pvt. Ltd | Bank: Bank of Maldives",
  };

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber,
    issuedAt: now,
    customer: {
      name: closure.customerName,
      phone: closure.customerPhone,
      address: closure.customerAddress,
      email: closure.customerEmail ?? undefined,
      tin: closure.customerTin ?? undefined,
    },
    system: { kwp: Number(approvedKwp), gridPlan: closure.gridPlan, freightType },
    pricing,
    company,
  });

  const slug = closure.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const s3Key = `invoices/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${invoiceNumber}-${slug}.pdf`;

  await uploadPdf(pdfBuffer, s3Key, { invoice_number: invoiceNumber, customer_name: closure.customerName });

  const updated = await prisma.closureForm.update({
    where: { id: closureId },
    data: {
      approvedKwp: Number(approvedKwp),
      freightType,
      finalPriceMvr: pricing.totalInclGst,
      invoiceS3Key: s3Key,
      invoiceNumber,
      invoiceGeneratedAt: now,
      status: "invoiced",
    },
  });

  const downloadUrl = await getSignedDownloadUrl(s3Key, `${invoiceNumber}.pdf`);

  await logActivity(session.user.id, "generate_invoice", {
    entityType: "closure", entityId: closureId, ipAddress: getClientIp(req),
    meta: { invoiceNumber, approvedKwp, freightType, totalMvr: pricing.totalInclGst },
  });

  return NextResponse.json({ invoiceNumber, downloadUrl, pricing, closure: updated });
}

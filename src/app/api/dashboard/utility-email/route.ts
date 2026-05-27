import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { closureId } = await req.json();
  if (!closureId) return NextResponse.json({ error: "closureId required" }, { status: 400 });

  const closure = await prisma.closureForm.findUnique({ where: { id: closureId } });
  if (!closure) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!closure.customerAccountNo || !closure.customerBillId || !closure.utilityName) {
    return NextResponse.json(
      { error: "Account number, Bill ID, and utility name are required before sending" },
      { status: 400 }
    );
  }

  const recipientEnv =
    closure.utilityName === "FENAKA"
      ? process.env.FENAKA_EMAIL
      : process.env.STELCO_EMAIL;

  if (!recipientEnv) {
    return NextResponse.json(
      { error: `${closure.utilityName} email address is not configured` },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const subject = `Solar Capacity Request — ${closure.customerName} (Account: ${closure.customerAccountNo})`;
  const html = `
    <p>Dear ${closure.utilityName} Team,</p>
    <p>We are writing on behalf of our customer to request confirmation of the maximum solar PV capacity
    permitted for connection to the grid at the following account:</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Customer Name</td><td>${closure.customerName}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Account Number</td><td>${closure.customerAccountNo}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Bill ID</td><td>${closure.customerBillId}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Address</td><td>${closure.customerAddress}</td></tr>
      ${closure.customerPhone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold">Phone</td><td>${closure.customerPhone}</td></tr>` : ""}
    </table>
    <p>Please reply with the maximum allowable solar system size (kWp) for this connection so we may proceed
    with the final installation proposal.</p>
    <p>Thank you for your assistance.</p>
    <p style="margin-top:24px">
      Best regards,<br/>
      <strong>${session.user.name}</strong><br/>
      ${process.env.COMPANY_NAME ?? "AE by Zero"}<br/>
      ${process.env.COMPANY_CONTACT ?? ""}<br/>
      ${process.env.COMPANY_EMAIL ?? ""}
    </p>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: recipientEnv,
    subject,
    html,
  });

  const updated = await prisma.closureForm.update({
    where: { id: closureId },
    data: {
      utilityEmailSentAt: new Date(),
      utilityEmailStatus: "sent",
      status: "utility_requested",
    },
  });

  await logActivity(session.user.id, "send_utility_email", {
    entityType: "closure", entityId: closureId, ipAddress: getClientIp(req),
    meta: { utility: closure.utilityName, recipient: recipientEnv },
  });

  return NextResponse.json({ success: true, sentAt: updated.utilityEmailSentAt });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decodeQuoteId, parseQuotePayload } from "@/lib/s3-quotes";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await params;
  const s3Key = decodeQuoteId(quoteId);
  const { quoteNumber, payload } = await parseQuotePayload(s3Key);
  const closure = await prisma.closureForm.findUnique({ where: { quoteS3Key: s3Key } });

  await logActivity(session.user.id, "view_quote", {
    entityType: "quote", entityId: s3Key, ipAddress: getClientIp(req),
    meta: { quoteNumber },
  });

  return NextResponse.json({ quoteNumber, s3Key, quoteId, payload, closure });
}

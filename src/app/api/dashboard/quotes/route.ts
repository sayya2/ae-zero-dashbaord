import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listS3Quotes } from "@/lib/s3-quotes";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const { quotes, hasMore, nextToken } = await listS3Quotes(
    searchParams.get("nextToken") ?? undefined
  );

  const closures = await prisma.closureForm.findMany({
    where: { quoteS3Key: { in: quotes.map((q) => q.s3Key) } },
    select: { quoteS3Key: true, status: true, id: true },
  });
  const closureMap = Object.fromEntries(
    closures.map((c) => [c.quoteS3Key, { status: c.status, closureId: c.id }])
  );

  const enriched = quotes.map((q) => ({
    ...q,
    closureStatus: closureMap[q.s3Key]?.status ?? null,
    closureId: closureMap[q.s3Key]?.closureId ?? null,
  }));

  await logActivity(session.user.id, "list_quotes", {
    ipAddress: getClientIp(req),
    meta: { count: quotes.length },
  });

  return NextResponse.json({ quotes: enriched, hasMore, nextToken });
}

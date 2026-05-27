import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decodeQuoteId, getSignedViewUrl } from "@/lib/s3-quotes";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await params;
  const s3Key = decodeQuoteId(quoteId);
  const url = await getSignedViewUrl(s3Key);
  return NextResponse.json({ url });
}

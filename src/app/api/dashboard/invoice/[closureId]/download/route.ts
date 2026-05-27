import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3-quotes";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ closureId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { closureId } = await params;
  const closure = await prisma.closureForm.findUnique({ where: { id: closureId } });
  if (!closure?.invoiceS3Key) return NextResponse.json({ error: "No invoice found" }, { status: 404 });

  const filename = `${closure.invoiceNumber ?? "invoice"}.pdf`;
  const url = await getSignedDownloadUrl(closure.invoiceS3Key, filename);
  return NextResponse.json({ url });
}

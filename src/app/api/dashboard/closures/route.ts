import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const closures = await prisma.closureForm.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      customerName: true,
      customerPhone: true,
      utilityName: true,
      systemKwp: true,
      approvedKwp: true,
      finalPriceMvr: true,
      invoiceNumber: true,
      status: true,
      createdAt: true,
      invoiceGeneratedAt: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({ closures });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const take = 20;

  const [total, closures] = await Promise.all([
    prisma.closureForm.count(),
    prisma.closureForm.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({ closures, total, page, pages: Math.ceil(total / take) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    quoteS3Key, quoteNumber, customerName, customerEmail, customerPhone,
    customerAddress, customerTin, customerAccountNo, customerBillId,
    utilityName, systemKwp, gridPlan, selectedPlan,
  } = body;

  if (!quoteS3Key || !customerName || !customerPhone || !systemKwp) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.closureForm.findUnique({ where: { quoteS3Key } });
  if (existing) {
    return NextResponse.json({ error: "Closure already exists", closureId: existing.id }, { status: 409 });
  }

  const closure = await prisma.closureForm.create({
    data: {
      quoteS3Key, quoteNumber: quoteNumber ?? "",
      customerName, customerEmail: customerEmail || null, customerPhone,
      customerAddress: customerAddress ?? "", customerTin: customerTin || null,
      customerAccountNo: customerAccountNo || null, customerBillId: customerBillId || null,
      utilityName: utilityName || null,
      systemKwp: Number(systemKwp), gridPlan: gridPlan ?? "ongrid",
      selectedPlan: selectedPlan ?? "discounted",
      createdBy: session.user.id,
    },
  });

  await logActivity(session.user.id, "create_closure", {
    entityType: "closure", entityId: closure.id, ipAddress: getClientIp(req),
    meta: { quoteNumber, customerName },
  });

  return NextResponse.json({ closure }, { status: 201 });
}

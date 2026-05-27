import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const closure = await prisma.closureForm.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!closure) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ closure });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Only allow updating safe fields
  const allowed = [
    "customerAccountNo", "customerBillId", "utilityName",
    "maxKwpFromUtility", "utilityRepliedAt", "utilityNotes",
    "approvedKwp", "freightType", "status", "notes",
    "customerEmail", "customerPhone", "customerAddress", "customerTin",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const closure = await prisma.closureForm.update({ where: { id }, data });

  await logActivity(session.user.id, "update_closure", {
    entityType: "closure", entityId: id, ipAddress: getClientIp(req),
    meta: { fields: Object.keys(data) },
  });

  return NextResponse.json({ closure });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const take = 50;
  const userId = session.user.role === "admin" ? undefined : session.user.id;

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where: userId ? { userId } : {} }),
    prisma.activityLog.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / take) });
}

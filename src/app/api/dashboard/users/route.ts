import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, getClientIp } from "@/lib/activity";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role === "admin" ? "admin" : "agent" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  await logActivity(session.user.id, "create_user", {
    entityType: "user", entityId: user.id, ipAddress: getClientIp(req),
    meta: { email, role: user.role },
  });

  return NextResponse.json({ user }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, active, role, password } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof active === "boolean") data.active = active;
  if (role) data.role = role === "admin" ? "admin" : "agent";
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  await logActivity(session.user.id, password ? "reset_password" : "update_user", {
    entityType: "user", entityId: id, ipAddress: getClientIp(req),
    meta: password ? { targetEmail: user.email } : { changes: data },
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const adminCount = await prisma.user.count({ where: { role: "admin", active: true } });
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" && adminCount <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  await logActivity(session.user.id, "delete_user", {
    entityType: "user", entityId: id, ipAddress: getClientIp(req),
    meta: { email: target.email },
  });

  return NextResponse.json({ ok: true });
}

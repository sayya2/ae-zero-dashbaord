/**
 * One-time seed endpoint to create the first admin user.
 * Disable by removing DASHBOARD_SEED_KEY from env after setup.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const seedKey = process.env.DASHBOARD_SEED_KEY;
  if (!seedKey) {
    return NextResponse.json({ error: "Seed endpoint is disabled" }, { status: 403 });
  }

  const { name, email, password, secretKey } = await req.json();
  if (secretKey !== seedKey) {
    return NextResponse.json({ error: "Invalid seed key" }, { status: 403 });
  }
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "admin" },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user, message: "Admin created. Remove DASHBOARD_SEED_KEY from env now." }, { status: 201 });
}

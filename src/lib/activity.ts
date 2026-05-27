import { prisma } from "./prisma";

export async function logActivity(
  userId: string,
  action: string,
  opts?: { entityType?: string; entityId?: string; meta?: Record<string, unknown>; ipAddress?: string }
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType: opts?.entityType ?? null,
        entityId: opts?.entityId ?? null,
        meta: opts?.meta ? (opts.meta as object) : undefined,
        ipAddress: opts?.ipAddress ?? null,
      },
    });
  } catch {
    // non-fatal
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

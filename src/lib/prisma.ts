import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
    ],
  });

prisma.$on("error", (e) => {
  console.error("[DB ERROR]", e.message);
});

prisma.$on("warn", (e) => {
  console.warn("[DB WARN]", e.message);
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

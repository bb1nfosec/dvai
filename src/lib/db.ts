import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export let db: PrismaClient;
export let isDbAvailable = true;

try {
  db = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
} catch {
  isDbAvailable = false;
  db = null as unknown as PrismaClient;
}

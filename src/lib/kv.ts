import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Lightweight KV abstraction backed by SQLite (simulates Vercel KV for local dev)
// In production on Vercel, swap this with @vercel/kv

export async function kvGet(key: string): Promise<string | null> {
  const entry = await db.kVStore.findUnique({ where: { key } });
  return entry?.value ?? null;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  await db.kVStore.upsert({
    where: { key },
    update: { value, expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null },
    create: { key, value, expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null },
  });
}

export async function kvDelete(key: string): Promise<void> {
  try {
    await db.kVStore.delete({ where: { key } });
  } catch {
    // Key may not exist
  }
}

export async function kvKeys(pattern: string): Promise<string[]> {
  // SQLite LIKE pattern: % = wildcard
  const sqlPattern = pattern.replace(/\*/g, '%');
  const entries = await db.kVStore.findMany({
    where: {
      key: { contains: sqlPattern.replace(/%/g, '') },
      expiresAt: { or: [{ equals: null }, { gt: new Date() }] },
    },
    select: { key: true },
  });
  return entries.map(e => e.key);
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const val = await kvGet(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function kvSetJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await kvSet(key, JSON.stringify(value), ttlSeconds);
}

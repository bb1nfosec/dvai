// Database abstraction — Vercel serverless compatible
// Prisma/SQLite is NOT used in production serverless environment.
// Oracle state → encrypted HTTP-only cookies (via crypto.ts)
// Session / mutation state → Zustand + localStorage (client-side)
// This file exists so legacy imports of isDbAvailable don't break at build time.

export const isDbAvailable = false;

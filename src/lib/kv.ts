// KV abstraction — stub for now.
// In production on Vercel, swap implementations with @vercel/kv.
// Currently unused by any active route (mutations are client-side in Zustand).

export async function kvGet(_key: string): Promise<string | null> {
  return null;
}

export async function kvSet(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
  // no-op
}

export async function kvDelete(_key: string): Promise<void> {
  // no-op
}

export async function kvKeys(_pattern: string): Promise<string[]> {
  return [];
}

export async function kvGetJSON<T>(_key: string): Promise<T | null> {
  return null;
}

export async function kvSetJSON(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
  // no-op
}

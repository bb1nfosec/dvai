// Competition Store — SERVER ONLY
// Shared leaderboard state for multi-user competition mode (BSides Village)
// Uses in-memory store by default, with optional Vercel KV for production
//
// Architecture:
//   - In-memory Map for local dev / single-instance deployments
//   - Vercel KV (Redis) for multi-instance production deployments
//   - Auto-fallback: tries KV, falls back to in-memory if KV is not configured

import type { OpCode } from '@/store/session-store';

// ─── Types ───────────────────────────────────────────────

export interface CompetitionScoreEntry {
  callsign: string;
  operationId: string;
  opCode: OpCode;
  totalScore: number;
  efficiencyScore: number;
  anomalySignals: number;
  timeToSolve: number;  // seconds
  hardeningLevel: number;
  solvedAt: string;     // ISO timestamp
  techniqueNovelty: boolean;
}

export interface CompetitionPlayer {
  callsign: string;
  totalScore: number;
  operationsSolved: number;
  avgEfficiency: number;
  lastActive: string;
  joinedAt: string;
  topScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  callsign: string;
  totalScore: number;
  operationsSolved: number;
  avgEfficiency: number;
  bestOperation: string;
  lastActive: string;
}

// ─── In-Memory Store (fallback) ──────────────────────────

interface InMemoryStore {
  scores: CompetitionScoreEntry[];
  players: Map<string, CompetitionPlayer>;
  activeSessions: Map<string, { callsign: string; lastHeartbeat: number }>;
}

const store: InMemoryStore = {
  scores: [],
  players: new Map(),
  activeSessions: new Map(),
};

// ─── Vercel KV Integration ────────────────────────────────

const KV_PREFIX = 'dvai:competition:';
const KV_SCORES_KEY = `${KV_PREFIX}scores`;
const KV_PLAYERS_KEY = `${KV_PREFIX}players`;
const KV_ACTIVE_KEY = `${KV_PREFIX}active`;

function hasKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL || process.env.KVC_REST_API_URL);
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (!hasKvConfigured()) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return await kv.get<T>(key);
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  if (!hasKvConfigured()) return;
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(key, value);
  } catch {
    // Fall back to in-memory silently
  }
}

async function kvPushToList(key: string, value: unknown): Promise<void> {
  if (!hasKvConfigured()) return;
  try {
    const { kv } = await import('@vercel/kv');
    await kv.rpush(key, JSON.stringify(value));
  } catch {
    // Fall back silently
  }
}

async function kvGetList<T>(key: string): Promise<T[]> {
  if (!hasKvConfigured()) return [];
  try {
    const { kv } = await import('@vercel/kv');
    const items = await kv.lrange(key, 0, -1);
    return items.map(item => typeof item === 'string' ? JSON.parse(item) : item);
  } catch {
    return [];
  }
}

// ─── Public API ──────────────────────────────────────────

/**
 * Submit a score entry from a player who solved an operation.
 * Updates both the scores list and the player's aggregated stats.
 */
export async function submitScore(entry: CompetitionScoreEntry): Promise<void> {
  // Add to scores list
  store.scores.push(entry);

  // Persist to KV if available
  if (hasKvConfigured()) {
    await kvPushToList(KV_SCORES_KEY, entry);
  }

  // Update player aggregate stats
  const existing = store.players.get(entry.callsign);
  const prevCount = existing?.operationsSolved ?? 0;
  const prevTotal = existing?.totalScore ?? 0;
  const prevEfficiency = existing?.avgEfficiency ?? 0;

  const newCount = prevCount + 1;
  const newTotal = prevTotal + entry.totalScore;
  const newAvgEfficiency = (prevEfficiency * prevCount + entry.efficiencyScore) / newCount;

  store.players.set(entry.callsign, {
    callsign: entry.callsign,
    totalScore: newTotal,
    operationsSolved: newCount,
    avgEfficiency: Math.round(newAvgEfficiency * 100) / 100,
    lastActive: new Date().toISOString(),
    joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    topScore: Math.max(existing?.topScore ?? 0, entry.totalScore),
  });

  // Persist players to KV
  if (hasKvConfigured()) {
    const players = await kvGet<Record<string, CompetitionPlayer>>(KV_PLAYERS_KEY) ?? {};
    players[entry.callsign] = store.players.get(entry.callsign)!;
    await kvSet(KV_PLAYERS_KEY, players);
  }
}

/**
 * Get the full leaderboard, sorted by totalScore descending.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const players = store.players;

  // Try to sync from KV if we have no data locally
  if (players.size === 0 && hasKvConfigured()) {
    const kvPlayers = await kvGet<Record<string, CompetitionPlayer>>(KV_PLAYERS_KEY);
    if (kvPlayers) {
      for (const [callsign, player] of Object.entries(kvPlayers)) {
        players.set(callsign, player);
      }
    }

    const kvScores = await kvGetList<CompetitionScoreEntry>(KV_SCORES_KEY);
    if (kvScores.length > store.scores.length) {
      store.scores = kvScores;
    }
  }

  const entries: LeaderboardEntry[] = Array.from(players.values())
    .filter(p => p.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player, index) => {
      // Find their best operation
      const playerScores = store.scores.filter(s => s.callsign === player.callsign);
      const bestOp = playerScores.sort((a, b) => b.totalScore - a.totalScore)[0];

      return {
        rank: index + 1,
        callsign: player.callsign,
        totalScore: player.totalScore,
        operationsSolved: player.operationsSolved,
        avgEfficiency: player.avgEfficiency,
        bestOperation: bestOp?.opCode ?? 'N/A',
        lastActive: player.lastActive,
      };
    });

  return entries;
}

/**
 * Get recent score submissions (for the activity feed).
 */
export async function getRecentScores(limit = 20): Promise<CompetitionScoreEntry[]> {
  if (store.scores.length === 0 && hasKvConfigured()) {
    const kvScores = await kvGetList<CompetitionScoreEntry>(KV_SCORES_KEY);
    if (kvScores.length > 0) {
      store.scores = kvScores;
    }
  }

  return store.scores
    .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
    .slice(0, limit);
}

/**
 * Register a player heartbeat (marks them as active).
 */
export function recordHeartbeat(callsign: string, sessionId: string): void {
  store.activeSessions.set(sessionId, {
    callsign,
    lastHeartbeat: Date.now(),
  });

  // Ensure player exists in the players map
  if (!store.players.has(callsign)) {
    store.players.set(callsign, {
      callsign,
      totalScore: 0,
      operationsSolved: 0,
      avgEfficiency: 0,
      lastActive: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      topScore: 0,
    });
  } else {
    const existing = store.players.get(callsign)!;
    existing.lastActive = new Date().toISOString();
    store.players.set(callsign, existing);
  }
}

/**
 * Get count of unique active players in the last 5 minutes.
 */
export function getActivePlayerCount(): number {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  // Clean stale entries
  for (const [sessionId, session] of store.activeSessions) {
    if (now - session.lastHeartbeat > FIVE_MINUTES) {
      store.activeSessions.delete(sessionId);
    }
  }

  // Return unique callsigns
  const uniqueCallsigns = new Set(
    Array.from(store.activeSessions.values()).map(s => s.callsign)
  );
  return uniqueCallsigns.size;
}

/**
 * Get competition stats summary.
 */
export function getCompetitionStats(): {
  totalPlayers: number;
  activePlayers: number;
  totalScoresSubmitted: number;
  totalOperationsSolved: number;
} {
  return {
    totalPlayers: store.players.size,
    activePlayers: getActivePlayerCount(),
    totalScoresSubmitted: store.scores.length,
    totalOperationsSolved: Array.from(store.players.values())
      .reduce((sum, p) => sum + p.operationsSolved, 0),
  };
}

/**
 * Reset the competition (admin use).
 */
export function resetCompetition(): void {
  store.scores = [];
  store.players.clear();
  store.activeSessions.clear();
}

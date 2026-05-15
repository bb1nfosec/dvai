// Anti-Cheat System — SERVER ONLY
// Rate limiting, origin validation, behavioral anomaly detection
// Designed to make source-code-reading approaches ineffective against all 6 operations

// ─── Rate Limiter (in-memory sliding window) ───────────────────
// Per-session, per-endpoint. Vercel serverless = short-lived, so this
// works within a single cold start. For cross-invocation, we rely on
// encrypted cookie state + server-side challenge validation.

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    // Remove entries older than 1 hour
    entry.timestamps = entry.timestamps.filter(t => now - t < 3600000);
    if (entry.timestamps.length === 0) rateLimitStore.delete(key);
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default rate limits per endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Oracle query — generous for exploration
  'oracle-query': { maxRequests: 30, windowMs: 60 * 1000 },
  // Oracle submit — tight to prevent brute-force
  'oracle-submit': { maxRequests: 5, windowMs: 60 * 1000 },
  // SchemaPoison inject — one doc per operation
  'schemapoison-inject': { maxRequests: 3, windowMs: 60 * 1000 },
  // SchemaPoison query
  'schemapoison-query': { maxRequests: 20, windowMs: 60 * 1000 },
  // Eigenblind classify
  'eigenblind-classify': { maxRequests: 20, windowMs: 60 * 1000 },
  // Ouroboros pipeline — 3 API calls per run
  'ouroboros-pipeline': { maxRequests: 10, windowMs: 60 * 1000 },
  // Ouroboros query
  'ouroboros-query': { maxRequests: 15, windowMs: 60 * 1000 },
  // LongCon turn — 20 max anyway
  'longcon-turn': { maxRequests: 10, windowMs: 60 * 1000 },
  // Cartesian query
  'cartesian-query': { maxRequests: 30, windowMs: 60 * 1000 },
  // Cartesian submit
  'cartesian-submit': { maxRequests: 5, windowMs: 60 * 1000 },
  // Init endpoints — prevent re-init spam
  'init': { maxRequests: 10, windowMs: 60 * 1000 },
  // Session creation
  'session': { maxRequests: 5, windowMs: 60 * 1000 },
};

export function checkRateLimit(
  endpoint: string,
  sessionId: string,
  config?: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const limits = config || RATE_LIMITS[endpoint];
  if (!limits) return { allowed: true, remaining: Infinity, resetAt: 0 };

  const key = `${endpoint}:${sessionId}`;
  const now = Date.now();
  const windowStart = now - limits.windowMs;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Filter to current window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  if (entry.timestamps.length >= limits.maxRequests) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + limits.windowMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limits.maxRequests - entry.timestamps.length - 1,
    resetAt: now + limits.windowMs,
  };
}

// ─── Origin / CSRF Validation ──────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://dvai-red.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  // In production, require valid origin
  if (process.env.NODE_ENV === 'production') {
    // Allow if no origin header (non-browser clients like curl)
    if (!origin && !referer) return false;
    const check = origin || referer;
    return ALLOWED_ORIGINS.some(allowed => check.startsWith(allowed));
  }

  // In dev, allow all
  return true;
}

// ─── Behavioral Anomaly Detection ──────────────────────────────
// Detects automated / non-human interaction patterns

interface BehavioralProfile {
  queryIntervals: number[];
  submitIntervals: number[];
  lastQueryTime: number;
  lastSubmitTime: number;
  totalQueries: number;
  totalSubmits: number;
  patternFlags: string[];
}

const behavioralProfiles = new Map<string, BehavioralProfile>();

export function recordQuery(sessionId: string): void {
  let profile = behavioralProfiles.get(sessionId);
  if (!profile) {
    profile = {
      queryIntervals: [],
      submitIntervals: [],
      lastQueryTime: 0,
      lastSubmitTime: 0,
      totalQueries: 0,
      totalSubmits: 0,
      patternFlags: [],
    };
    behavioralProfiles.set(sessionId, profile);
  }

  const now = Date.now();
  if (profile.lastQueryTime > 0) {
    profile.queryIntervals.push(now - profile.lastQueryTime);
    // Keep only last 20 intervals
    if (profile.queryIntervals.length > 20) profile.queryIntervals.shift();

    // Flag if queries are suspiciously regular (bot-like)
    if (profile.queryIntervals.length >= 5) {
      const recent = profile.queryIntervals.slice(-5);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a, b) => a + (b - avg) ** 2, 0) / recent.length;
      const stdDev = Math.sqrt(variance);

      // Coefficient of variation < 0.1 = suspiciously regular
      if (avg > 0 && stdDev / avg < 0.1) {
        if (!profile.patternFlags.includes('bot-regular-queries')) {
          profile.patternFlags.push('bot-regular-queries');
        }
      }
    }
  }

  profile.lastQueryTime = now;
  profile.totalQueries++;
}

export function recordSubmit(sessionId: string): void {
  let profile = behavioralProfiles.get(sessionId);
  if (!profile) {
    profile = {
      queryIntervals: [],
      submitIntervals: [],
      lastQueryTime: 0,
      lastSubmitTime: 0,
      totalQueries: 0,
      totalSubmits: 0,
      patternFlags: [],
    };
    behavioralProfiles.set(sessionId, profile);
  }

  const now = Date.now();
  if (profile.lastSubmitTime > 0) {
    profile.submitIntervals.push(now - profile.lastSubmitTime);
    if (profile.submitIntervals.length > 10) profile.submitIntervals.shift();
  }

  profile.lastSubmitTime = now;
  profile.totalSubmits++;

  // Flag if submitting without querying first (source code cheating pattern)
  if (profile.totalQueries === 0 && profile.totalSubmits >= 2) {
    if (!profile.patternFlags.includes('submit-without-query')) {
      profile.patternFlags.push('submit-without-query');
    }
  }

  // Flag if queries-to-submit ratio is extremely low (cheating)
  if (profile.totalQueries > 0 && profile.totalSubmits > 0) {
    const ratio = profile.totalQueries / profile.totalSubmits;
    if (ratio < 2) {
      if (!profile.patternFlags.includes('low-query-submit-ratio')) {
        profile.patternFlags.push('low-query-submit-ratio');
      }
    }
  }
}

export function getBehavioralFlags(sessionId: string): string[] {
  return behavioralProfiles.get(sessionId)?.patternFlags || [];
}

// ─── Challenge Integrity Checks ────────────────────────────────
// Server-side validation that challenge state hasn't been tampered with

export function validateChallengeState(
  state: Record<string, unknown>,
  requiredFields: string[],
): { valid: boolean; error?: string } {
  for (const field of requiredFields) {
    if (!(field in state)) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  // Validate operationId format
  if (state.operationId && typeof state.operationId === 'string') {
    if (!/^op_[a-z0-9]+_[a-z0-9-]+$/.test(state.operationId)) {
      return { valid: false, error: 'Invalid operation ID format' };
    }
  }

  return { valid: true };
}

// ─── Guess Anomaly Detection ───────────────────────────────────
// Detects systematic brute-force guessing patterns

export interface GuessAnalysis {
  isAnomalous: boolean;
  anomalyType: string | null;
  suggestion: string | null;
}

export function analyzeGuessPattern(
  currentGuess: string,
  previousGuesses: string[],
  secretLength: number,
): GuessAnalysis {
  if (previousGuesses.length < 3) {
    return { isAnomalous: false, anomalyType: null, suggestion: null };
  }

  // Detect sequential character guessing (brute force)
  const recentGuesses = previousGuesses.slice(-5);

  // Check if guesses differ by only 1-2 characters (systematic iteration)
  let singleCharDiffs = 0;
  for (let i = 1; i < recentGuesses.length; i++) {
    let diffCount = 0;
    const maxLen = Math.max(recentGuesses[i].length, recentGuesses[i - 1].length);
    for (let j = 0; j < maxLen; j++) {
      if ((recentGuesses[i][j] || '') !== (recentGuesses[i - 1][j] || '')) diffCount++;
    }
    if (diffCount <= 2) singleCharDiffs++;
  }

  if (singleCharDiffs >= recentGuesses.length - 1) {
    return {
      isAnomalous: true,
      anomalyType: 'systematic-iteration',
      suggestion: 'Systematic character iteration detected. Try a different approach — analyze the model\'s behavior patterns instead.',
    };
  }

  // Detect if guess length exactly matches a known format without exploration
  if (
    currentGuess.length === secretLength &&
    previousGuesses.every(g => g.length === secretLength)
  ) {
    // All guesses have exact length — no exploration happening
    if (previousGuesses.length >= 3) {
      return {
        isAnomalous: true,
        anomalyType: 'known-length-brute',
        suggestion: 'All guesses match the expected length exactly. The challenge requires logprob analysis, not brute-force guessing.',
      };
    }
  }

  return { isAnomalous: false, anomalyType: null, suggestion: null };
}

// ─── Fuzzy Hint Generator ──────────────────────────────────────
// Replaces exact character-position hints with vague directional hints

export function generateFuzzyHint(
  secret: string,
  guess: string,
): string {
  const normalizedSecret = secret.toLowerCase().trim();
  const normalizedGuess = guess.toLowerCase().trim();

  if (normalizedSecret === normalizedGuess) {
    return 'Exact match';
  }

  // Length hints — give range, not exact
  if (normalizedGuess.length !== normalizedSecret.length) {
    const diff = Math.abs(normalizedGuess.length - normalizedSecret.length);
    if (normalizedGuess.length < normalizedSecret.length) {
      return `Your guess is too short (off by ~${diff}).`;
    } else {
      return `Your guess is too long (off by ~${diff}).`;
    }
  }

  // Calculate similarity but DON'T reveal positions
  let charMatches = 0;
  for (let i = 0; i < Math.min(normalizedSecret.length, normalizedGuess.length); i++) {
    if (normalizedSecret[i] === normalizedGuess[i]) charMatches++;
  }

  const matchRatio = charMatches / normalizedSecret.length;

  // Give directional feedback based on ratio ranges
  if (matchRatio === 0) {
    return 'No characters in the right place. Your approach may need to change entirely.';
  } else if (matchRatio < 0.25) {
    return 'A few characters are in the right position, but most are wrong.';
  } else if (matchRatio < 0.5) {
    return 'You\'re getting warmer — roughly a quarter to half of the characters are correct.';
  } else if (matchRatio < 0.75) {
    return 'More than half the characters are in the right position. You\'re close.';
  } else {
    return 'Almost there — most characters are correct. Just a few to fix.';
  }
}

// ─── Subtle Hint for SchemaPoison / LongCon ────────────────────
// Instead of revealing the exact target, give a thematic hint

export function generateThematicHint(
  category: string,
  contradictsTopic: string,
  keywords: string[],
): string {
  // Give a hint about the general area without revealing the exact claim
  return `The target involves a false claim about ${contradictsTopic}. Look for established facts that could be subtly contradicted.`;
}

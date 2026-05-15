import { NextRequest, NextResponse } from 'next/server';
import { validateOracleGuess, calculateOracleScore } from '@/lib/oracle-engine';
import { analyzeAndMutate } from '@/lib/mutation-engine';
import { decrypt, encrypt } from '@/lib/crypto';
import { checkRateLimit, recordSubmit, analyzeGuessPattern, validateOrigin } from '@/lib/anti-cheat';

const COOKIE_NAME = 'dvai_oracle';
const COOKIE_MAX_AGE = 60 * 60 * 24;

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
  guessHistory: string[];
  startedAt: string;
}

function readOracleCookie(request: NextRequest): OracleCookieState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as OracleCookieState;
  } catch {
    return null;
  }
}

function setOracleCookie(response: NextResponse, state: OracleCookieState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

// ─── POST: Submit a guess ─────────────────────────────────────
// ANTI-CHEAT: Rate limited, fuzzy hints only, behavioral analysis
export async function POST(request: NextRequest) {
  try {
    // Origin validation
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const body = await request.json();
    const { guess } = body;

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json({ error: 'guess required' }, { status: 400 });
    }

    const state = readOracleCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    // ANTI-CHEAT: Rate limit submissions
    const sessionId = request.cookies.get('dvai_session')?.value || 'anonymous';
    const rateCheck = checkRateLimit('oracle-submit', sessionId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many submission attempts. Wait a moment.', retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000) },
        { status: 429 },
      );
    }

    // ANTI-CHEAT: Record submit for behavioral analysis
    recordSubmit(sessionId);

    // ANTI-CHEAT: Analyze guess pattern for brute-force detection
    const guessHistory = state.guessHistory || [];
    const guessAnalysis = analyzeGuessPattern(guess, guessHistory, state.secret.length);

    const result = validateOracleGuess(state.secret, guess);
    const timeToSolve = state.startedAt
      ? (Date.now() - new Date(state.startedAt).getTime()) / 1000
      : 0;

    // Track guess history in cookie state
    state.guessHistory.push(guess);
    if (state.guessHistory.length > 20) state.guessHistory = state.guessHistory.slice(-20);

    if (result.correct) {
      const score = calculateOracleScore({
        apiCallsUsed: state.apiCallCount,
        apiCallBudget: state.apiCallBudget,
        hardeningLevel: state.hardeningLevel,
        timeToSolveSeconds: timeToSolve,
        guessCount: state.guessHistory.length,
        hasAnomalySignals: guessAnalysis.isAnomalous,
      });

      const mutation = analyzeAndMutate('OP-ORACLE', state.hardeningLevel, {
        apiCallsUsed: state.apiCallCount,
        guessCount: state.guessHistory.length,
        timeToSolve,
      });

      const response = NextResponse.json({
        correct: true,
        accuracy: result.accuracy,
        score,
        mutation: {
          id: `mut_${Date.now().toString(36)}`,
          newHardeningLevel: mutation.newHardeningLevel,
          ttpName: mutation.ttpName,
          ttpCategory: mutation.ttpCategory,
          description: mutation.description,
          mutationApplied: mutation.mutationApplied,
        },
        ...(guessAnalysis.isAnomalous ? {
          anomalyDetected: true,
          anomalyType: guessAnalysis.anomalyType,
        } : {}),
      });

      return response;
    }

    const response = NextResponse.json({
      correct: false,
      accuracy: result.accuracy,
      // ANTI-CHEAT: Fuzzy hints only — no exact positions leaked
      hint: result.hint,
      apiCallsUsed: state.apiCallCount,
      guessesUsed: state.guessHistory.length,
      // ANTI-CHEAT: Warn about detected brute-force patterns
      ...(guessAnalysis.isAnomalous ? {
        anomalyDetected: true,
        anomalyType: guessAnalysis.anomalyType,
        anomalySuggestion: guessAnalysis.suggestion,
      } : {}),
    });

    setOracleCookie(response, state);
    return response;
  } catch (error) {
    console.error('Oracle submit error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

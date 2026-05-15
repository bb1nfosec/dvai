import { NextRequest, NextResponse } from 'next/server';
import { validateOracleGuess, calculateOracleScore } from '@/lib/oracle-engine';
import { analyzeAndMutate } from '@/lib/mutation-engine';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_oracle';

interface OracleCookieState {
  operationId: string;
  secret: string;
  hardeningLevel: number;
  apiCallCount: number;
  apiCallBudget: number;
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

// ─── POST: Submit a guess ─────────────────────────────────────
// Reads secret from encrypted cookie, validates guess, returns score + mutation.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guess } = body;

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json({ error: 'guess required' }, { status: 400 });
    }

    const state = readOracleCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    const result = validateOracleGuess(state.secret, guess);
    const timeToSolve = state.startedAt
      ? (Date.now() - new Date(state.startedAt).getTime()) / 1000
      : 0;

    if (result.correct) {
      const score = calculateOracleScore({
        apiCallsUsed: state.apiCallCount,
        apiCallBudget: state.apiCallBudget,
        hardeningLevel: state.hardeningLevel,
        timeToSolveSeconds: timeToSolve,
        guessCount: 1,
        hasAnomalySignals: false,
      });

      const mutation = analyzeAndMutate('OP-ORACLE', state.hardeningLevel, {
        apiCallsUsed: state.apiCallCount,
        guessCount: 1,
        timeToSolve,
      });

      return NextResponse.json({
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
      });
    }

    return NextResponse.json({
      correct: false,
      accuracy: result.accuracy,
      hint: result.hint,
      apiCallsUsed: state.apiCallCount,
    });
  } catch (error) {
    console.error('Oracle submit error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

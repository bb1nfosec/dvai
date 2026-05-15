import { NextRequest, NextResponse } from 'next/server';
import {
  validateCartesianGuess,
  calculateCartesianScore,
  checkAndApplyMutation,
  type CartesianState,
} from '@/lib/cartesian-engine';
import { analyzeAndMutate } from '@/lib/mutation-engine';
import { encrypt, decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_cartesian';
const COOKIE_MAX_AGE = 60 * 60 * 24;

function readCookie(request: NextRequest): CartesianState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as CartesianState;
  } catch {
    return null;
  }
}

function setCookie(response: NextResponse, state: CartesianState): void {
  response.cookies.set(COOKIE_NAME, encrypt(JSON.stringify(state)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

// ─── POST: Submit a guess ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guess } = body;

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json({ error: 'guess required' }, { status: 400 });
    }

    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    const result = validateCartesianGuess(state.secret, guess);

    if (result.correct) {
      // Calculate score
      const score = calculateCartesianScore(state);

      // Run mutation engine analysis for TTP registry
      const mutation = analyzeAndMutate('OP-CARTESIAN', state.currentMutationLevel, {
        apiCallsUsed: state.apiCallCount,
        guessCount: state.guessHistory.length + 1,
        timeToSolve: state.startedAt
          ? (Date.now() - new Date(state.startedAt).getTime()) / 1000
          : 0,
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

    // Incorrect guess — record it and check for auto-mutation
    state.failedGuessCount += 1;
    state.guessHistory.push({ guess, correct: false });

    // Check if auto-mutation should trigger
    const mutationResult = checkAndApplyMutation(state);

    const response = NextResponse.json({
      correct: false,
      accuracy: result.accuracy,
      hint: result.hint,
      apiCallsUsed: state.apiCallCount,
      failedGuessCount: state.failedGuessCount,
      guessHistoryLength: state.guessHistory.length,
      ...(mutationResult.mutated
        ? {
            mutationTriggered: true,
            newMutationLevel: mutationResult.newLevel,
            layerAdded: mutationResult.layerAdded
              ? { name: mutationResult.layerAdded.name, description: mutationResult.layerAdded.description }
              : null,
          }
        : {}),
    });

    setCookie(response, state);
    return response;
  } catch (error) {
    console.error('Cartesian submit error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

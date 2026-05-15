import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { MUTATION_LAYERS } from '@/lib/cartesian-engine';

const COOKIE_NAME = 'dvai_cartesian';

// ─── GET: Cartesian operation status ───────────────────
export async function GET(request: NextRequest) {
  try {
    const raw = request.cookies.get(COOKIE_NAME)?.value;
    if (!raw) {
      return NextResponse.json({ error: 'No active operation' }, { status: 404 });
    }

    const json = decrypt(raw);
    if (!json) {
      return NextResponse.json({ error: 'Invalid or corrupted operation data' }, { status: 400 });
    }

    const state = JSON.parse(json);

    const activeLayers = MUTATION_LAYERS.filter(l => l.level <= state.currentMutationLevel);
    const inactiveLayers = MUTATION_LAYERS.filter(l => l.level > state.currentMutationLevel);
    const guessesUntilNextMutation = state.mutationThreshold - state.failedGuessCount;

    return NextResponse.json({
      operationId: state.operationId,
      opCode: 'OP-CARTESIAN',
      currentMutationLevel: state.currentMutationLevel,
      maxMutationLevel: state.maxMutationLevel,
      failedGuessCount: state.failedGuessCount,
      mutationThreshold: state.mutationThreshold,
      guessesUntilNextMutation: Math.max(0, guessesUntilNextMutation),
      apiCallCount: state.apiCallCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - state.apiCallCount,
      totalGuesses: state.guessHistory?.length || 0,
      activeLayers: activeLayers.map(l => ({ level: l.level, name: l.name, description: l.description })),
      inactiveLayers: inactiveLayers.map(l => ({ level: l.level, name: l.name })),
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('Cartesian status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

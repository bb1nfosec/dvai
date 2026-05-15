import { NextRequest, NextResponse } from 'next/server';
import { calculateScore, type LongconState } from '@/lib/longcon-engine';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_longcon';

function readCookie(request: NextRequest): LongconState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as LongconState;
  } catch {
    return null;
  }
}

// ─── POST: Submit and evaluate long-con attempt ──────────────
export async function POST(request: NextRequest) {
  try {
    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    if (state.currentTurn < 3) {
      return NextResponse.json({
        error: 'Not enough turns to evaluate. Use at least 3 turns before submitting.',
        currentTurn: state.currentTurn,
        required: 3,
      }, { status: 400 });
    }

    if (state.submitted) {
      return NextResponse.json({
        error: 'Operation already submitted.',
      }, { status: 400 });
    }

    state.submitted = true;
    const score = calculateScore(state);

    return NextResponse.json({
      success: state.won,
      score: score.totalScore,
      turnsUsed: score.turnsUsed,
      maxTurns: score.maxTurns,
      wonOnTurn: score.wonOnTurn,
      subtletyScore: score.subtletyScore,
      efficiencyScore: score.efficiencyScore,
      timeBonus: score.timeBonus,
      feedback: score.feedback,
      breakdown: score.breakdown,
      targetClaim: state.targetClaim,
      scenarioName: state.scenario.name,
    });
  } catch (error) {
    console.error('LongCon submit error:', error);
    return NextResponse.json({ error: 'Failed to evaluate submission' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_longcon';

// ─── GET: LongCon operation status ───────────────────────────
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

    return NextResponse.json({
      operationId: state.operationId,
      opCode: 'OP-LONGCON',
      scenario: state.scenario,
      targetClaim: state.targetClaim,
      protectedBeliefs: state.protectedBeliefs,
      currentTurn: state.currentTurn,
      maxTurns: state.maxTurns,
      remainingTurns: state.maxTurns - state.currentTurn,
      won: state.won,
      wonOnTurn: state.wonOnTurn,
      apiCallCount: state.apiCallCount,
      conversationLength: state.conversationHistory?.length || 0,
      submitted: state.submitted || false,
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('LongCon status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

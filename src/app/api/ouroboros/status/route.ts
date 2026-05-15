import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_ouroboros';

// ─── GET: Ouroboros operation status ────────────────────────
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
      id: state.operationId,
      opCode: 'OP-OUROBOROS',
      status: 'active',
      queryCount: state.queryCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - state.queryCount,
      stages: state.stages.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
      })),
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('Ouroboros status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

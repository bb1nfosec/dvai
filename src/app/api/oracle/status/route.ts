import { NextRequest, NextResponse } from 'next/server';
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

// ─── GET: Oracle operation status ─────────────────────────────
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

    const state: OracleCookieState = JSON.parse(json);

    return NextResponse.json({
      id: state.operationId,
      opCode: 'OP-ORACLE',
      status: 'active',
      hardeningLevel: state.hardeningLevel,
      apiCallCount: state.apiCallCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - state.apiCallCount,
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('Oracle status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

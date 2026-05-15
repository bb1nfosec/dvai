import { NextRequest, NextResponse } from 'next/server';
import { type OuroborosState } from '@/lib/ouroboros-engine';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_ouroboros';

function readCookie(request: NextRequest): OuroborosState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as OuroborosState;
  } catch {
    return null;
  }
}

// ─── GET: Current operation status ────────────────────────────
export async function GET(request: NextRequest) {
  const state = readCookie(request);
  if (!state) {
    return NextResponse.json({ error: 'No active operation' }, { status: 400 });
  }

  return NextResponse.json({
    operationId: state.operationId,
    targetLanguage: state.targetLanguage,
    apiCallCount: state.apiCallCount,
    apiCallBudget: state.apiCallBudget,
    remainingBudget: state.apiCallBudget - state.apiCallCount,
    totalRuns: state.pipelineRuns.length,
    successfulRuns: state.pipelineRuns.filter(r => r.hasFlag).length,
    startedAt: state.startedAt,
    solvedAt: state.solvedAt,
  });
}

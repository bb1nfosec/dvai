import { NextRequest, NextResponse } from 'next/server';
import { evaluateOuroborosSubmission, type OuroborosState } from '@/lib/ouroboros-engine';
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

// ─── POST: Submit and evaluate pipeline exploitation ──────────
export async function POST(request: NextRequest) {
  try {
    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    if (state.pipelineRuns.length === 0) {
      return NextResponse.json({
        error: 'No pipeline runs recorded. Run the pipeline at least once before submitting.',
      }, { status: 400 });
    }

    const result = evaluateOuroborosSubmission(state);

    return NextResponse.json({
      success: result.success,
      score: result.score,
      pipelineRunsUsed: result.pipelineRunsUsed,
      flagPrecision: result.flagPrecision,
      efficiency: result.efficiency,
      feedback: result.feedback,
      breakdown: result.breakdown,
      successfulRuns: state.pipelineRuns.filter(r => r.hasFlag).length,
    });
  } catch (error) {
    console.error('Ouroboros submit error:', error);
    return NextResponse.json({ error: 'Failed to evaluate submission' }, { status: 500 });
  }
}

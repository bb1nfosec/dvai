import { NextRequest, NextResponse } from 'next/server';
import { evaluateSubmission, type SchemaPoisonState } from '@/lib/schemapoison-engine';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_schemapoison';

function readCookie(request: NextRequest): SchemaPoisonState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const json = decrypt(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as SchemaPoisonState;
  } catch {
    return null;
  }
}

// ─── POST: Submit and evaluate poisoning attempt ─────────────
export async function POST(request: NextRequest) {
  try {
    const state = readCookie(request);
    if (!state) {
      return NextResponse.json({ error: 'No active operation found' }, { status: 400 });
    }

    if (!state.injectedDoc) {
      return NextResponse.json(
        { error: 'No poisoned document injected. Inject a document before submitting.' },
        { status: 400 },
      );
    }

    if (state.recentQueries.length < 2) {
      return NextResponse.json({
        error: 'Not enough queries to evaluate. Submit at least 2 query responses.',
        currentQueryCount: state.recentQueries.length,
        required: 2,
      }, { status: 400 });
    }

    const result = evaluateSubmission(state);

    if (result.success) {
      state.phase = 'submit';
    }

    return NextResponse.json({
      success: result.success,
      score: result.score,
      poisonSuccessCount: result.poisonSuccessCount,
      totalQueries: result.totalQueries,
      injectedDocRelevance: result.injectedDocRelevance,
      feedback: result.feedback,
      breakdown: result.breakdown,
      targetClaim: state.targetClaim,
    });
  } catch (error) {
    console.error('SchemaPoison submit error:', error);
    return NextResponse.json({ error: 'Failed to evaluate submission' }, { status: 500 });
  }
}

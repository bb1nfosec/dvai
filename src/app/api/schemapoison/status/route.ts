import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_schemapoison';

// ─── GET: SchemaPoison operation status ─────────────────────
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
      opCode: 'OP-SCHEMAPOISON',
      phase: state.phase,
      queryCount: state.queryCount,
      queryBudget: state.queryBudget,
      remainingBudget: state.queryBudget - state.queryCount,
      hasInjectedDoc: !!state.injectedDoc,
      injectedDocTitle: state.injectedDoc?.title || null,
      totalDocuments: state.kbDocuments?.length || 0,
      totalQueries: state.recentQueries?.length || 0,
      targetDescription: state.targetDescription,
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('SchemaPoison status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

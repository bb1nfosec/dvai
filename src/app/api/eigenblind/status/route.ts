import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'dvai_eigenblind';

// ─── GET: Eigenblind operation status ─────────────────────
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
      opCode: 'OP-EIGENBLIND',
      taskType: state.taskType,
      targetClassification: state.targetClassification,
      correctClassification: state.correctClassification,
      apiCallCount: state.apiCallCount,
      apiCallBudget: state.apiCallBudget,
      remainingBudget: state.apiCallBudget - state.apiCallCount,
      totalTests: state.testResults?.length || 0,
      misclassificationCount: (state.testResults || []).filter(
        (r: { classified: string }) => r.classified === state.targetClassification
      ).length,
      startedAt: state.startedAt,
    });
  } catch (error) {
    console.error('Eigenblind status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

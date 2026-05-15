import { NextRequest, NextResponse } from 'next/server';
import { isDbAvailable, db } from '@/lib/db';
import { memFindOperation, memGetSubmissions } from '@/lib/memory-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');

    if (!operationId) {
      return NextResponse.json({ error: 'operationId required' }, { status: 400 });
    }

    if (isDbAvailable) {
      const operation = await db.operation.findUnique({
        where: { id: operationId },
        include: { submissions: { orderBy: { createdAt: 'desc' } } },
      });
      if (!operation) return NextResponse.json({ error: 'Operation not found' }, { status: 404 });

      return NextResponse.json({
        id: operation.id, opCode: operation.opCode, status: operation.status,
        hardeningLevel: operation.hardeningLevel,
        apiCallCount: operation.apiCallCount, apiCallBudget: operation.apiCallBudget,
        remainingBudget: operation.apiCallBudget - operation.apiCallCount,
        startedAt: operation.startedAt, solvedAt: operation.solvedAt,
        submissionCount: operation.submissions.length,
        lastSubmission: operation.submissions[0]
          ? { correct: operation.submissions[0].isCorrect, createdAt: operation.submissions[0].createdAt }
          : null,
      });
    }

    // In-memory fallback
    const operation = memFindOperation(operationId);
    if (!operation) return NextResponse.json({ error: 'Operation not found' }, { status: 404 });

    const subs = memGetSubmissions(operationId);
    return NextResponse.json({
      id: operation.id, opCode: operation.opCode, status: operation.status,
      hardeningLevel: operation.hardeningLevel,
      apiCallCount: operation.apiCallCount, apiCallBudget: operation.apiCallBudget,
      remainingBudget: operation.apiCallBudget - operation.apiCallCount,
      startedAt: operation.startedAt, solvedAt: operation.solvedAt,
      submissionCount: subs.length,
      lastSubmission: subs[0]
        ? { correct: subs[0].isCorrect, createdAt: subs[0].createdAt }
        : null,
    });
  } catch (error) {
    console.error('Oracle status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

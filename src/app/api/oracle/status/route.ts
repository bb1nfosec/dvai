import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get operation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');

    if (!operationId) {
      return NextResponse.json({ error: 'operationId required' }, { status: 400 });
    }

    const operation = await db.operation.findUnique({
      where: { id: operationId },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: operation.id,
      opCode: operation.opCode,
      status: operation.status,
      hardeningLevel: operation.hardeningLevel,
      apiCallCount: operation.apiCallCount,
      apiCallBudget: operation.apiCallBudget,
      remainingBudget: operation.apiCallBudget - operation.apiCallCount,
      startedAt: operation.startedAt,
      solvedAt: operation.solvedAt,
      submissionCount: operation.submissions.length,
      lastSubmission: operation.submissions[0]
        ? {
            correct: operation.submissions[0].isCorrect,
            createdAt: operation.submissions[0].createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Oracle status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

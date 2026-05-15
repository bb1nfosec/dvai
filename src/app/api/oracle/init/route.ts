import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSecret, getSecretDescription, getDifficultyLabel } from '@/lib/oracle-engine';

// POST: Initialize a new OP-ORACLE challenge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, hardeningLevel } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Check session exists
    const session = await db.playerSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (!session.groqKey) {
      return NextResponse.json({ error: 'Groq API key required. Configure in settings.' }, { status: 400 });
    }

    const level = hardeningLevel || 1;
    const secret = generateSecret(level);

    // Check for existing active operation and soft-reset it
    const existingOp = await db.operation.findFirst({
      where: { sessionId, opCode: 'OP-ORACLE', status: 'active' },
    });
    if (existingOp) {
      await db.operation.update({
        where: { id: existingOp.id },
        data: {
          status: 'available',
          currentSecret: null,
          apiCallCount: 0,
          startedAt: null,
        },
      });
    }

    const operation = await db.operation.create({
      data: {
        sessionId,
        opCode: 'OP-ORACLE',
        status: 'active',
        hardeningLevel: level,
        currentSecret: secret,
        apiCallBudget: 10000,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      operationId: operation.id,
      hardeningLevel: level,
      difficultyLabel: getDifficultyLabel(level),
      secretDescription: getSecretDescription(level),
      apiCallBudget: operation.apiCallBudget,
      startedAt: operation.startedAt,
    });
  } catch (error) {
    console.error('Oracle init error:', error);
    return NextResponse.json({ error: 'Failed to initialize operation' }, { status: 500 });
  }
}

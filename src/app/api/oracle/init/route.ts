import { NextRequest, NextResponse } from 'next/server';
import { isDbAvailable, db } from '@/lib/db';
import { generateSecret, getSecretDescription, getDifficultyLabel } from '@/lib/oracle-engine';
import {
  memFindSession,
  memCreateOperation,
} from '@/lib/memory-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, hardeningLevel } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (isDbAvailable) {
      const session = await db.playerSession.findUnique({ where: { id: sessionId } });
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      if (!session.groqKey) return NextResponse.json({ error: 'Groq API key required. Configure in settings.' }, { status: 400 });

      const level = hardeningLevel || 1;
      const secret = generateSecret(level);

      const existingOp = await db.operation.findFirst({
        where: { sessionId, opCode: 'OP-ORACLE', status: 'active' },
      });
      if (existingOp) {
        await db.operation.update({
          where: { id: existingOp.id },
          data: { status: 'available', currentSecret: null, apiCallCount: 0, startedAt: null },
        });
      }

      const operation = await db.operation.create({
        data: {
          sessionId, opCode: 'OP-ORACLE', status: 'active',
          hardeningLevel: level, currentSecret: secret,
          apiCallBudget: 10000, startedAt: new Date(),
        },
      });

      return NextResponse.json({
        operationId: operation.id, hardeningLevel: level,
        difficultyLabel: getDifficultyLabel(level),
        secretDescription: getSecretDescription(level),
        apiCallBudget: operation.apiCallBudget,
        startedAt: operation.startedAt,
      });
    }

    // In-memory fallback
    const session = memFindSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!session.groqKey) return NextResponse.json({ error: 'Groq API key required. Configure in settings.' }, { status: 400 });

    const level = hardeningLevel || 1;
    const secret = generateSecret(level);

    const operation = memCreateOperation({
      sessionId, opCode: 'OP-ORACLE', status: 'active',
      hardeningLevel: level, currentSecret: secret,
      apiCallCount: 0, apiCallBudget: 10000,
      startedAt: new Date().toISOString(), solvedAt: null,
    });

    return NextResponse.json({
      operationId: operation.id, hardeningLevel: level,
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

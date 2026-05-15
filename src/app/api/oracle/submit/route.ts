import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOracleGuess, calculateOracleScore } from '@/lib/oracle-engine';
import { analyzeAndMutate } from '@/lib/mutation-engine';

// POST: Submit a guess for the secret
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, guess } = body;

    if (!operationId || !guess) {
      return NextResponse.json({ error: 'operationId and guess required' }, { status: 400 });
    }

    const operation = await db.operation.findUnique({
      where: { id: operationId },
      include: {
        session: true,
        submissions: true,
      },
    });

    if (!operation || operation.status !== 'active') {
      return NextResponse.json({ error: 'Operation not found or not active' }, { status: 404 });
    }

    // Validate guess
    const result = validateOracleGuess(operation.currentSecret!, guess);

    // Calculate time to solve
    const timeToSolve = operation.startedAt
      ? (Date.now() - operation.startedAt.getTime()) / 1000
      : 0;

    // Record submission
    await db.operationSubmission.create({
      data: {
        operationId,
        guess,
        isCorrect: result.correct,
        apiCallsUsed: operation.apiCallCount,
      },
    });

    if (result.correct) {
      // Calculate score
      const score = calculateOracleScore({
        apiCallsUsed: operation.apiCallCount,
        apiCallBudget: operation.apiCallBudget,
        hardeningLevel: operation.hardeningLevel,
        timeToSolveSeconds: timeToSolve,
        guessCount: operation.submissions.length + 1,
        hasAnomalySignals: false,
      });

      // Mark operation as solved
      await db.operation.update({
        where: { id: operationId },
        data: { status: 'solved', solvedAt: new Date() },
      });

      // Run mutation engine
      const mutation = analyzeAndMutate('OP-ORACLE', operation.hardeningLevel, {
        apiCallsUsed: operation.apiCallCount,
        guessCount: operation.submissions.length + 1,
        timeToSolve,
      });

      // Record mutation
      await db.mutationLog.create({
        data: {
          sessionId: operation.sessionId,
          operationId,
          opCode: 'OP-ORACLE',
          hardeningLevel: mutation.newHardeningLevel,
          ttpName: mutation.ttpName,
          ttpCategory: mutation.ttpCategory,
          description: mutation.description,
          mutationApplied: mutation.mutationApplied,
        },
      });

      return NextResponse.json({
        correct: true,
        accuracy: result.accuracy,
        score,
        mutation: {
          newHardeningLevel: mutation.newHardeningLevel,
          ttpName: mutation.ttpName,
          mutationApplied: mutation.mutationApplied,
        },
      });
    }

    return NextResponse.json({
      correct: false,
      accuracy: result.accuracy,
      hint: result.hint,
      apiCallsUsed: operation.apiCallCount,
    });
  } catch (error) {
    console.error('Oracle submit error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

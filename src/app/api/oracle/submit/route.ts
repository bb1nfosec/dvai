import { NextRequest, NextResponse } from 'next/server';
import { isDbAvailable, db } from '@/lib/db';
import { validateOracleGuess, calculateOracleScore } from '@/lib/oracle-engine';
import { analyzeAndMutate } from '@/lib/mutation-engine';
import {
  memFindOperation,
  memFindSession,
  memUpdateOperation,
  memCreateSubmission,
  memGetSubmissions,
  memCreateMutation,
} from '@/lib/memory-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationId, guess } = body;

    if (!operationId || !guess) {
      return NextResponse.json({ error: 'operationId and guess required' }, { status: 400 });
    }

    if (isDbAvailable) {
      const operation = await db.operation.findUnique({
        where: { id: operationId },
        include: { session: true, submissions: true },
      });
      if (!operation || operation.status !== 'active') {
        return NextResponse.json({ error: 'Operation not found or not active' }, { status: 404 });
      }

      const result = validateOracleGuess(operation.currentSecret!, guess);
      const timeToSolve = operation.startedAt
        ? (Date.now() - operation.startedAt.getTime()) / 1000 : 0;

      await db.operationSubmission.create({
        data: {
          operationId, guess, isCorrect: result.correct,
          apiCallsUsed: operation.apiCallCount,
        },
      });

      if (result.correct) {
        const score = calculateOracleScore({
          apiCallsUsed: operation.apiCallCount,
          apiCallBudget: operation.apiCallBudget,
          hardeningLevel: operation.hardeningLevel,
          timeToSolveSeconds: timeToSolve,
          guessCount: operation.submissions.length + 1,
          hasAnomalySignals: false,
        });

        await db.operation.update({
          where: { id: operationId },
          data: { status: 'solved', solvedAt: new Date() },
        });

        const mutation = analyzeAndMutate('OP-ORACLE', operation.hardeningLevel, {
          apiCallsUsed: operation.apiCallCount,
          guessCount: operation.submissions.length + 1,
          timeToSolve,
        });

        await db.mutationLog.create({
          data: {
            sessionId: operation.sessionId, operationId,
            opCode: 'OP-ORACLE', hardeningLevel: mutation.newHardeningLevel,
            ttpName: mutation.ttpName, ttpCategory: mutation.ttpCategory,
            description: mutation.description, mutationApplied: mutation.mutationApplied,
          },
        });

        return NextResponse.json({
          correct: true, accuracy: result.accuracy, score,
          mutation: {
            newHardeningLevel: mutation.newHardeningLevel,
            ttpName: mutation.ttpName,
            mutationApplied: mutation.mutationApplied,
          },
        });
      }

      return NextResponse.json({
        correct: false, accuracy: result.accuracy, hint: result.hint,
        apiCallsUsed: operation.apiCallCount,
      });
    }

    // In-memory fallback
    const operation = memFindOperation(operationId);
    if (!operation || operation.status !== 'active') {
      return NextResponse.json({ error: 'Operation not found or not active' }, { status: 404 });
    }

    const result = validateOracleGuess(operation.currentSecret!, guess);
    const timeToSolve = operation.startedAt
      ? (Date.now() - new Date(operation.startedAt).getTime()) / 1000 : 0;

    const existingSubs = memGetSubmissions(operationId);
    memCreateSubmission({
      operationId, guess, isCorrect: result.correct,
      apiCallsUsed: operation.apiCallCount,
      scoreBreakdown: null,
    });

    if (result.correct) {
      const score = calculateOracleScore({
        apiCallsUsed: operation.apiCallCount,
        apiCallBudget: operation.apiCallBudget,
        hardeningLevel: operation.hardeningLevel,
        timeToSolveSeconds: timeToSolve,
        guessCount: existingSubs.length + 1,
        hasAnomalySignals: false,
      });

      memUpdateOperation(operationId, {
        status: 'solved',
        solvedAt: new Date().toISOString(),
      });

      const mutation = analyzeAndMutate('OP-ORACLE', operation.hardeningLevel, {
        apiCallsUsed: operation.apiCallCount,
        guessCount: existingSubs.length + 1,
        timeToSolve,
      });

      memCreateMutation({
        sessionId: operation.sessionId,
        operationId,
        opCode: 'OP-ORACLE',
        hardeningLevel: mutation.newHardeningLevel,
        ttpName: mutation.ttpName,
        ttpCategory: mutation.ttpCategory,
        description: mutation.description,
        mutationApplied: mutation.mutationApplied,
        previousConfig: null,
        newConfig: null,
      });

      return NextResponse.json({
        correct: true, accuracy: result.accuracy, score,
        mutation: {
          newHardeningLevel: mutation.newHardeningLevel,
          ttpName: mutation.ttpName,
          mutationApplied: mutation.mutationApplied,
        },
      });
    }

    return NextResponse.json({
      correct: false, accuracy: result.accuracy, hint: result.hint,
      apiCallsUsed: operation.apiCallCount,
    });
  } catch (error) {
    console.error('Oracle submit error:', error);
    return NextResponse.json({ error: 'Failed to submit guess' }, { status: 500 });
  }
}

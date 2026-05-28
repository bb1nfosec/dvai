'use client';

import { useCallback, useRef } from 'react';
import { useSessionStore, type OpCode } from '@/store/session-store';

interface ScoreData {
  opCode: OpCode;
  totalScore: number;
  efficiencyScore: number;
  anomalySignals: number;
  timeToSolve: number;
  hardeningLevel: number;
  operationId: string;
}

/**
 * Hook that provides a function to submit scores to the competition leaderboard.
 * Only submits if competition mode is enabled and a callsign is set.
 * Prevents duplicate submissions for the same operation.
 */
export function useCompetitionSubmit() {
  const submittedRef = useRef<Set<string>>(new Set());

  const submitScore = useCallback(async (score: ScoreData) => {
    const state = useSessionStore.getState();
    if (!state.competitionMode || !state.callsign || !state.sessionId) {
      return;
    }

    // Prevent duplicate submissions
    const submissionKey = `${state.callsign}:${score.operationId}`;
    if (submittedRef.current.has(submissionKey)) {
      return;
    }

    submittedRef.current.add(submissionKey);

    try {
      const res = await fetch('/api/competition/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callsign: state.callsign,
          operationId: score.operationId,
          opCode: score.opCode,
          totalScore: Math.round(score.totalScore * 100) / 100,
          efficiencyScore: Math.round(score.efficiencyScore * 100) / 100,
          anomalySignals: score.anomalySignals,
          timeToSolve: Math.round(score.timeToSolve),
          hardeningLevel: score.hardeningLevel,
        }),
      });

      if (!res.ok) {
        console.warn('[Competition] Score submission failed:', await res.text());
        // Allow retry on failure
        submittedRef.current.delete(submissionKey);
      }
    } catch (error) {
      console.warn('[Competition] Score submission error:', error);
      submittedRef.current.delete(submissionKey);
    }
  }, []);

  return { submitScore };
}

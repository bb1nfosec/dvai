'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { BriefingPanel } from './briefing-panel';
import { ChallengePanel } from './challenge-panel';
import { ResultsPanel } from './results-panel';

export function SchemaPoisonView() {
  const { operations, schemaPoison } = useSessionStore();
  const spOp = operations['OP-SCHEMAPOISON'];
  const status = spOp.status;

  return (
    <div className="h-full overflow-y-auto">
      {status === 'available' && <BriefingPanel />}
      {status === 'active' && <ChallengePanel />}
      {status === 'solved' && <ResultsPanel />}
      {status === 'locked' && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="text-4xl opacity-30">&#x1F512;</div>
            <p className="text-sm text-muted-foreground">This operation is locked.</p>
          </div>
        </div>
      )}
    </div>
  );
}

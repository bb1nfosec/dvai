'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCompetitionSubmit } from '@/lib/use-competition-submit';
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Layers,
  ArrowRight,
  FileText,
  Award,
  Activity,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LAYER_NAMES: Record<number, string> = {
  1: 'GAG ORDER',
  2: 'LOGPROB SHIELD',
  3: 'RESPONSE ENTROPY',
  4: 'DECOY MECHANISM',
  5: 'OUTPUT AUDITOR',
};

const LAYER_STYLES: Record<number, { color: string; border: string }> = {
  1: { color: 'text-green-400', border: 'border-green-500/30' },
  2: { color: 'text-blue-400', border: 'border-blue-500/30' },
  3: { color: 'text-amber-400', border: 'border-amber-500/30' },
  4: { color: 'text-orange-400', border: 'border-orange-500/30' },
  5: { color: 'text-red-400', border: 'border-red-500/30' },
};

export function ResultsPanel() {
  const { cartesian, operations, updateOperation, resetCartesian, setActiveTab, competitionMode } = useSessionStore();
  const { submitScore } = useCompetitionSubmit();
  const score = cartesian.score;
  const submittedRef = React.useRef(false);

  // Extract individual primitives to avoid effect re-running on every store change
  const ctOperationId = operations['OP-CARTESIAN']?.operationId;
  const ctHardeningLevel = operations['OP-CARTESIAN']?.hardeningLevel;

  // Auto-submit score to competition leaderboard when in competition mode
  React.useEffect(() => {
    if (score && competitionMode && !submittedRef.current && ctOperationId) {
      submittedRef.current = true;
      submitScore({
        opCode: 'OP-CARTESIAN',
        totalScore: score.totalScore,
        efficiencyScore: score.callEfficiency,
        anomalySignals: score.breakdown.failedGuesses,
        timeToSolve: Math.round(score.timeToSolve),
        hardeningLevel: ctHardeningLevel,
        operationId: ctOperationId,
      });
    }
  }, [score, competitionMode, submitScore, ctOperationId, ctHardeningLevel]);

  const handleReplay = () => {
    resetCartesian();
  };

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30">
          <CheckCircle2 className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-red-400 tracking-wider">FINAL BOSS CLEARED</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-CARTESIAN — Mutation Engine Bypass — CLEARED
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            {cartesian.guessHistory.length > 0 ? 'DVAI Campaign Complete' : 'DVAI Campaign Status: ADVANCED'}
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-red-400" />
            Operational Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Score */}
            <div className="md:col-span-2 p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
              <div className="text-4xl font-bold font-mono text-red-400">
                {score.totalScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Operational Score
              </div>
            </div>

            {/* Hardening Level */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Mutation Level Survived</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  L{score.hardeningReached}
                </span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className={`flex-1 h-2 rounded-sm border ${
                      level <= score.hardeningReached
                        ? LAYER_STYLES[level]?.border?.replace('/30', '/60') || 'bg-red-500 border-red-500/60'
                        : 'bg-muted border-border'
                    } ${level <= score.hardeningReached ? (LAYER_STYLES[level]?.color?.replace('text-', 'bg-') || 'bg-red-500') : ''}`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Survived {score.mutationCount} mutation layer(s) beyond base
              </div>
            </div>

            {/* Call Efficiency */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">API Call Efficiency</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.callEfficiency}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${score.callEfficiency}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.apiCallsUsed} / {score.breakdown.apiCallBudget} calls used
              </div>
            </div>

            {/* Guess Accuracy */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">First-Try Success</span>
                </div>
                <span className="font-mono text-sm font-bold text-green-400">
                  {score.breakdown.totalGuesses <= 1 ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.totalGuesses} total guess{score.breakdown.totalGuesses !== 1 ? 'es' : ''} ({score.breakdown.failedGuesses} failed)
              </div>
            </div>

            {/* Time */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Time to Solve</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.timeToSolve < 60
                    ? `${Math.round(score.timeToSolve)}s`
                    : `${Math.floor(score.timeToSolve / 60)}m ${Math.round(score.timeToSolve % 60)}s`}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                From operation start to successful extraction
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mutation Layers Survived */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Defense Layers Bypassed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((level) => {
              const survived = level <= score.hardeningReached;
              const style = LAYER_STYLES[level];
              return (
                <div
                  key={level}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${
                    survived
                      ? `${style?.color?.replace('text-', 'bg-') || ''}/10 border ${style?.border || ''}`
                      : 'bg-muted/20 border border-border/50 opacity-40'
                  }`}
                >
                  <span className={`font-mono font-bold text-xs w-6 ${survived ? style?.color : 'text-muted-foreground'}`}>
                    {String(level).padStart(2, '0')}
                  </span>
                  <span className={`text-xs font-semibold ${survived ? style?.color : 'text-muted-foreground'}`}>
                    {LAYER_NAMES[level]}
                  </span>
                  {survived && (
                    <Badge className="text-[8px] h-4 px-1 ml-auto bg-green-500/20 text-green-400 border border-green-500/30">
                      BYPASSED
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">After-Action Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{score.feedback}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          onClick={handleReplay}
          className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          NEW OPERATION
        </Button>
        <Button
          variant="outline"
          onClick={() => setActiveTab('ttps')}
          className="border-border gap-2"
        >
          <FileText className="w-4 h-4" />
          VIEW TTP REGISTRY
        </Button>
      </div>
    </div>
  );
}

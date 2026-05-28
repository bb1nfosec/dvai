'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCompetitionSubmit } from '@/lib/use-competition-submit';
import {
  CheckCircle2,
  Zap,
  Target,
  TrendingUp,
  Radio,
  BarChart3,
  ArrowRight,
  FileText,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ResultsPanel() {
  const { oracle, operations, resetOracle, updateOperation, setActiveTab, competitionMode } = useSessionStore();
  const { submitScore } = useCompetitionSubmit();
  const score = oracle.score;
  const submittedRef = React.useRef(false);

  // Extract individual primitives to avoid effect re-running on every store change
  const oracleOperationId = operations['OP-ORACLE']?.operationId;
  const oracleHardeningLevel = operations['OP-ORACLE']?.hardeningLevel;

  // Auto-submit score to competition leaderboard when in competition mode
  React.useEffect(() => {
    if (score && competitionMode && !submittedRef.current && oracleOperationId) {
      submittedRef.current = true;
      const breakdown = score.breakdown;
      submitScore({
        opCode: 'OP-ORACLE',
        totalScore: score.totalScore,
        efficiencyScore: score.efficiencyScore,
        anomalySignals: score.anomalySignals,
        timeToSolve: breakdown.timeToSolve,
        hardeningLevel: breakdown.hardeningLevel,
        operationId: oracleOperationId,
      });
    }
  }, [score, competitionMode, submitScore, oracleOperationId, oracleHardeningLevel]);

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  const handleNewMutation = () => {
    resetOracle();
    updateOperation('OP-ORACLE', {
      status: 'available',
      hardeningLevel: operations['OP-ORACLE'].hardeningLevel,
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-green-400 tracking-wider">OPERATION COMPLETE</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-ORACLE — Hardening Level {score.breakdown.hardeningLevel} — CLEARED
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <Card className="border-green-500/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-green-400" />
            Operational Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Score */}
            <div className="md:col-span-2 p-4 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
              <div className="text-4xl font-bold font-mono text-green-400">
                {score.totalScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Operational Score
              </div>
            </div>

            {/* Efficiency */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Call Efficiency</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.efficiencyScore}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${Math.min(100, score.efficiencyScore)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60 flex justify-between">
                <span>Used: {score.breakdown.apiCallsUsed.toLocaleString()}</span>
                <span>Theoretical min: {score.breakdown.theoreticalMinimum.toLocaleString()}</span>
              </div>
            </div>

            {/* Transferability */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Transferability</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <div
                      key={star}
                      className={`w-3 h-3 rounded-sm ${
                        star <= score.transferabilityRating
                          ? 'bg-purple-400'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                How well this technique transfers across model variants
              </div>
            </div>

            {/* Anomaly Signals */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Anomaly Signals</span>
                </div>
                <span className={`font-mono text-sm font-bold ${score.anomalySignals > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {score.anomalySignals}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.anomalySignals > 0
                  ? 'Anomaly detection triggered during operation'
                  : 'Clean operation — no detection events'}
              </div>
            </div>

            {/* Novelty */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">Technique Novelty</span>
                </div>
                <Badge variant="outline" className={`text-[10px] ${score.techniqueNovelty ? 'border-cyan-500/30 text-cyan-400' : 'border-muted text-muted-foreground'}`}>
                  {score.techniqueNovelty ? 'NOVEL' : 'KNOWN'}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.techniqueNovelty
                  ? 'TTP not previously recorded — new technique flagged!'
                  : 'TTP matches known patterns in mutation log'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guess History */}
      {oracle.guessHistory.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {oracle.guessHistory.map((g, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground/60 font-mono w-6">#{i + 1}</span>
                  <code className="flex-1 font-mono bg-muted/50 px-2 py-1 rounded truncate">
                    {g.guess}
                  </code>
                  <span className={`font-mono w-12 text-right ${g.accuracy > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {g.accuracy}%
                  </span>
                  {g.correct && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          onClick={handleNewMutation}
          className="bg-green-500 hover:bg-green-600 text-black font-bold gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          NEW MUTATION (L{operations['OP-ORACLE'].hardeningLevel})
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

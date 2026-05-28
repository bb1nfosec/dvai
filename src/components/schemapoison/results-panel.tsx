'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCompetitionSubmit } from '@/lib/use-competition-submit';
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Radio,
  Database,
  ArrowRight,
  RotateCcw,
  FileText,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ResultsPanel() {
  const { schemaPoison, operations, resetSchemaPoison, setActiveTab, competitionMode } = useSessionStore();
  const { submitScore } = useCompetitionSubmit();
  const score = schemaPoison.score;
  const submittedRef = React.useRef(false);

  // Auto-submit score to competition leaderboard when in competition mode
  React.useEffect(() => {
    if (score && competitionMode && !submittedRef.current && operations['OP-SCHEMAPOISON'].operationId) {
      submittedRef.current = true;
      submitScore({
        opCode: 'OP-SCHEMAPOISON',
        totalScore: score.totalScore,
        efficiencyScore: Math.round((1 - score.breakdown.queriesUsed / score.breakdown.queryBudget) * 100),
        anomalySignals: 0,
        timeToSolve: 0,
        hardeningLevel: operations['OP-SCHEMAPOISON'].hardeningLevel,
        operationId: operations['OP-SCHEMAPOISON'].operationId!,
      });
    }
  }, [score, competitionMode, submitScore, operations]);

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  const handleReplay = () => {
    resetSchemaPoison();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30">
          <CheckCircle2 className="w-10 h-10 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-amber-400 tracking-wider">OPERATION COMPLETE</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-SCHEMAPOISON — RAG Knowledge Base Poisoning — CLEARED
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Operational Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Score */}
            <div className="md:col-span-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
              <div className="text-4xl font-bold font-mono text-amber-400">
                {score.totalScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Operational Score
              </div>
            </div>

            {/* Poison Success */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Poison Success Rate</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.totalQueries > 0
                    ? `${Math.round((score.poisonSuccessCount / score.totalQueries) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400 transition-all"
                  style={{
                    width: `${score.totalQueries > 0
                      ? Math.min(100, (score.poisonSuccessCount / score.totalQueries) * 100)
                      : 0}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.poisonSuccessCount} / {score.totalQueries} responses contained the poisoned claim
              </div>
            </div>

            {/* Retrieval Rate */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Doc Retrieval Relevance</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.injectedDocRelevance}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${score.injectedDocRelevance}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                How often your poisoned document was retrieved
              </div>
            </div>

            {/* Query Efficiency */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">Query Efficiency</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.breakdown.queriesUsed} / {score.breakdown.queryBudget}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.queriesUsed <= 10
                  ? 'Excellent — minimal queries used'
                  : score.breakdown.queriesUsed <= 20
                    ? 'Good — reasonable query count'
                    : 'Consider optimizing your approach'}
              </div>
            </div>

            {/* Retrieval Stats */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Retrieval Stats</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {Math.round(score.breakdown.retrievalRate * 100)}%
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.poisonedRetrievals} poisoned retrievals out of {score.breakdown.totalRetrievals} total
              </div>
            </div>
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
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2"
        >
          <ArrowRight className="w-4 h-4" />
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

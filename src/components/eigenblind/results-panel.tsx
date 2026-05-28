'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCompetitionSubmit } from '@/lib/use-competition-submit';
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Radio,
  Target,
  ArrowRight,
  FileText,
  Award,
  Ruler,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ResultsPanel() {
  const { eigenblind, operations, resetEigenblind, setActiveTab, competitionMode } = useSessionStore();
  const { submitScore } = useCompetitionSubmit();
  const score = eigenblind.score;
  const submittedRef = React.useRef(false);

  // Extract individual primitives to avoid effect re-running on every store change
  const ebOperationId = operations['OP-EIGENBLIND']?.operationId;
  const ebHardeningLevel = operations['OP-EIGENBLIND']?.hardeningLevel;

  // Auto-submit score to competition leaderboard when in competition mode
  React.useEffect(() => {
    if (score && competitionMode && !submittedRef.current && ebOperationId) {
      submittedRef.current = true;
      submitScore({
        opCode: 'OP-EIGENBLIND',
        totalScore: score.totalScore,
        efficiencyScore: score.breakdown.apiCallEfficiency,
        anomalySignals: score.apiCallsUsed,
        timeToSolve: score.apiCallsUsed * 3, // rough estimate: ~3s per API call
        hardeningLevel: ebHardeningLevel,
        operationId: ebOperationId,
      });
    }
  }, [score, competitionMode, submitScore, ebOperationId, ebHardeningLevel]);

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  const handleReplay = () => {
    resetEigenblind();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30">
          <CheckCircle2 className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-red-400 tracking-wider">OPERATION COMPLETE</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-EIGENBLIND — Adversarial Suffix Optimization — CLEARED
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

            {/* Consistency */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">Consistency Score</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.successRate}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${score.successRate}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Misclassification rate across 5 verification runs
              </div>
            </div>

            {/* Suffix Length */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Suffix Length</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.breakdown.suffixLengthRating} ({score.suffixLength})
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{
                    width: `${Math.max(5, 100 - score.suffixLength / 2)}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Shorter suffixes earn higher scores
              </div>
            </div>

            {/* API Efficiency */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">API Call Efficiency</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.apiCallsUsed} calls ({score.breakdown.apiCallEfficiency}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400 transition-all"
                  style={{ width: `${score.breakdown.apiCallEfficiency}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Fewer API calls = higher efficiency score
              </div>
            </div>

            {/* Task Info */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Classification Task</span>
                </div>
                <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/30 uppercase">
                  {eigenblind.taskType}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {eigenblind.correctClassification} → {eigenblind.targetClassification}
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
          className="bg-red-500 hover:bg-red-600 text-white font-bold gap-2"
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

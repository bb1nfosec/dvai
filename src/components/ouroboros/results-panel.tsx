'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Layers,
  ArrowRight,
  FileText,
  Award,
  Timer,
  Target,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ResultsPanel() {
  const { ouroboros, resetOuroboros, setActiveTab } = useSessionStore();
  const score = ouroboros.score;

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  const handleReplay = () => {
    resetOuroboros();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 border-2 border-purple-500/30">
          <CheckCircle2 className="w-10 h-10 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-purple-400 tracking-wider">OPERATION COMPLETE</h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-OUROBOROS — Multi-Stage Pipeline Exploitation — CLEARED
          </p>
        </div>
        <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10">
          PIPELINE MASTERED
        </Badge>
      </div>

      {/* Score Breakdown */}
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            Operational Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Score */}
            <div className="md:col-span-2 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 text-center">
              <div className="text-4xl font-bold font-mono text-purple-400">
                {score.totalScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Operational Score
              </div>
            </div>

            {/* Pipeline Runs Used */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Pipeline Runs Used</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.pipelineRunsUsed}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all"
                  style={{
                    width: `${Math.min(100, (score.pipelineRunsUsed / score.breakdown.apiCallBudget) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.pipelineRunsUsed} runs out of {score.breakdown.apiCallBudget} budget
              </div>
            </div>

            {/* Flag Precision */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">Flag Precision</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.flagPrecision}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${score.flagPrecision}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Percentage of runs that extracted the flag
              </div>
            </div>

            {/* Stages Exploited */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Stages Exploited</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.breakdown.stagesExploited} / 3
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Number of pipeline stages successfully manipulated
              </div>
            </div>

            {/* Flag Found At */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">First Extraction</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.breakdown.flagFoundAt > 0
                    ? `Run #${score.breakdown.flagFoundAt}`
                    : 'N/A'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.flagFoundAt <= 3
                  ? 'Excellent — found very quickly'
                  : score.breakdown.flagFoundAt <= 6
                    ? 'Good — efficient exploitation'
                    : 'Consider optimizing your approach'}
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
          className="bg-purple-500 hover:bg-purple-600 text-white font-bold gap-2"
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

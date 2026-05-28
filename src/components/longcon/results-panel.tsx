'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { useCompetitionSubmit } from '@/lib/use-competition-submit';
import {
  CheckCircle2,
  Zap,
  TrendingUp,
  Radio,
  Award,
  ArrowRight,
  FileText,
  Skull,
  Brain,
  Clock,
  Target,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function ResultsPanel() {
  const { operations, updateOperation, setActiveTab, competitionMode } = useSessionStore();
  const { submitScore } = useCompetitionSubmit();
  const op = operations['OP-LONGCON'];
  const submittedRef = React.useRef(false);
  const [score, setScore] = React.useState<{
    totalScore: number;
    turnsUsed: number;
    maxTurns: number;
    wonOnTurn: number | null;
    subtletyScore: number;
    efficiencyScore: number;
    timeBonus: number;
    feedback: string;
    breakdown: {
      turnsUsed: number;
      maxTurns: number;
      directAskPenalty: boolean;
      subtletyBonus: number;
      speedBonus: number;
    };
    success: boolean;
    targetClaim: string;
    scenarioName: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Load score from submit endpoint on mount
  React.useEffect(() => {
    async function loadScore() {
      try {
        const res = await fetch('/api/longcon/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          setScore(data);

          // Auto-submit to competition if in competition mode
          if (competitionMode && !submittedRef.current && op.operationId && data.success) {
            submittedRef.current = true;
            submitScore({
              opCode: 'OP-LONGCON',
              totalScore: data.totalScore,
              efficiencyScore: data.efficiencyScore,
              anomalySignals: 0,
              timeToSolve: 0,
              hardeningLevel: op.hardeningLevel,
              operationId: op.operationId,
            });
          }
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    loadScore();
  }, [competitionMode, submitScore, op.operationId, op.hardeningLevel]);

  const handleReplay = () => {
    updateOperation('OP-LONGCON', {
      status: 'available',
      apiCallsUsed: 0,
      operationId: null,
      startedAt: null,
      solvedAt: null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No score data available.</p>
      </div>
    );
  }

  const isSuccess = score.success;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Success/Failure Banner */}
      <div className="text-center space-y-4">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${
          isSuccess
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          {isSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : (
            <Skull className="w-10 h-10 text-red-400" />
          )}
        </div>
        <div>
          <h1 className={`text-2xl font-bold tracking-wider ${
            isSuccess ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isSuccess ? 'OPERATION COMPLETE' : 'OPERATION FAILED'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            OP-LONGCON &mdash; {score.scenarioName} &mdash; {isSuccess ? 'CLEARED' : 'DENIED'}
          </p>
        </div>
      </div>

      {/* Target reminder */}
      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Target Claim</span>
        </div>
        <p className="text-xs font-mono text-muted-foreground">{score.targetClaim}</p>
      </div>

      {/* Score Breakdown */}
      <Card className={isSuccess ? 'border-emerald-500/20' : 'border-red-500/20'}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Operational Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Score */}
            <div className="md:col-span-2 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
              <div className={`text-4xl font-bold font-mono ${
                isSuccess ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {score.totalScore}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                Total Operational Score
              </div>
            </div>

            {/* Efficiency Score */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Efficiency Score</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.efficiencyScore}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, score.efficiencyScore)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.turnsUsed} of {score.breakdown.maxTurns} turns used
                {score.wonOnTurn && ` — won on turn ${score.wonOnTurn}`}
              </div>
            </div>

            {/* Subtlety Score */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className={`w-4 h-4 ${score.breakdown.directAskPenalty ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span className="text-xs text-muted-foreground">Subtlety Score</span>
                </div>
                <span className={`font-mono text-sm font-bold ${score.breakdown.directAskPenalty ? 'text-amber-400' : ''}`}>
                  {score.subtletyScore}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${score.breakdown.directAskPenalty ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, score.subtletyScore)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.directAskPenalty
                  ? 'Penalty: Direct request pattern detected in conversation'
                  : 'No direct asks detected — clean social engineering'}
              </div>
            </div>

            {/* Speed Bonus */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Speed Bonus</span>
                </div>
                <span className="font-mono text-sm font-bold">{score.timeBonus}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all"
                  style={{ width: `${Math.min(100, score.timeBonus * 5)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                Faster completion earns more bonus points (max 20)
              </div>
            </div>

            {/* Turns Used */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Turns Used</span>
                </div>
                <span className="font-mono text-sm font-bold">
                  {score.breakdown.turnsUsed} / {score.breakdown.maxTurns}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-400 transition-all"
                  style={{ width: `${(score.breakdown.turnsUsed / score.breakdown.maxTurns) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground/60">
                {score.breakdown.turnsUsed <= 5
                  ? 'Extraordinary — minimal turns used'
                  : score.breakdown.turnsUsed <= 10
                    ? 'Good — efficient manipulation'
                    : score.breakdown.turnsUsed <= 15
                      ? 'Moderate — room for improvement'
                      : 'Consider using more efficient techniques'}
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
          <p className={`text-sm leading-relaxed ${isSuccess ? 'text-emerald-400/80' : 'text-muted-foreground'}`}>
            {score.feedback}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <Button
          onClick={handleReplay}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-2"
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

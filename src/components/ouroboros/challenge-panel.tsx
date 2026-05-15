'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Send,
  Zap,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  Languages,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  SkipForward,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function ChallengePanel() {
  const store = useSessionStore();
  const { operations, ouroboros } = store;
  const obOp = operations['OP-OUROBOROS'];
  const phase = ouroboros.phase;

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
            OP-OUROBOROS
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Phase:{' '}
            {phase === 'challenge' && (
              <span className="text-purple-400">EXPLOIT</span>
            )}
            {phase === 'submit' && (
              <span className="text-green-400">EVALUATE</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {ouroboros.apiCallCount} / {ouroboros.apiCallBudget}
            </span>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                ouroboros.apiCallCount > ouroboros.apiCallBudget * 0.8
                  ? 'bg-red-500'
                  : 'bg-purple-500'
              }`}
              style={{
                width: `${Math.min(100, (ouroboros.apiCallCount / ouroboros.apiCallBudget) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden rounded-b-lg border border-border border-t-0">
        {phase === 'challenge' && <PipelineChallenge />}
        {phase === 'submit' && <SubmitPhase />}
      </div>
    </div>
  );
}

// ─── Pipeline Challenge Phase ─────────────────────────────────

function PipelineChallenge() {
  const store = useSessionStore();
  const { ouroboros } = store;
  const [input, setInput] = React.useState('');
  const [targetLang, setTargetLang] = React.useState(ouroboros.targetLanguage);
  const [runningPipeline, setRunningPipeline] = React.useState(false);
  const [error, setError] = React.useState('');
  const [latestRun, setLatestRun] = React.useState<{
    stages: { summarizer: string; translator: string; analyzer: string };
    hasFlag: boolean;
  } | null>(null);
  const [expandedStages, setExpandedStages] = React.useState<Record<string, boolean>>({
    summarizer: true,
    translator: true,
    analyzer: true,
  });

  const handleRunPipeline = async () => {
    if (!input.trim() || runningPipeline) return;
    if (ouroboros.apiCallCount >= ouroboros.apiCallBudget) return;

    setRunningPipeline(true);
    setError('');
    setLatestRun(null);

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setError('No Groq API key configured.');
        return;
      }

      const res = await fetch('/api/ouroboros/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          groqKey: groqApiKey,
          targetLanguage: targetLang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Pipeline failed');
        return;
      }

      // Update store
      store.setOuroborosTargetLanguage(data.targetLanguage);
      store.addOuroborosPipelineRun({
        id: data.runId,
        input: input.trim(),
        stages: data.stages,
        hasFlag: data.hasFlag,
        timestamp: Date.now(),
      });
      store.incrementOuroborosApiCallCount();

      setLatestRun({
        stages: data.stages,
        hasFlag: data.hasFlag,
      });

      if (data.hasFlag) {
        store.updateOperation('OP-OUROBOROS', {
          solvedAt: new Date().toISOString(),
        });
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setRunningPipeline(false);
    }
  };

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  const successfulRuns = ouroboros.pipelineRuns.filter(r => r.hasFlag).length;

  return (
    <div className="h-full flex flex-col">
      {/* Target language + stats */}
      <div className="px-4 py-2 bg-purple-500/5 border-b border-border flex items-center gap-3">
        <RefreshCw className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Target Language: <span className="text-blue-400 font-mono">{targetLang}</span>
        </span>
        {ouroboros.pipelineRuns.length > 0 && (
          <Badge
            variant="outline"
            className={`ml-auto text-[10px] ${
              successfulRuns > 0
                ? 'border-green-500/30 text-green-400'
                : 'border-amber-500/30 text-amber-400'
            }`}
          >
            {successfulRuns}/{ouroboros.pipelineRuns.length} FLAG FOUND
          </Badge>
        )}
      </div>

      {/* Pipeline output visualization */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pipeline running animation */}
        {runningPipeline && (
          <div className="space-y-3">
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 text-sm text-purple-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono">RUNNING 3-STAGE PIPELINE...</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  Summarizer
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:200ms]" />
                  Translator
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse [animation-delay:400ms]" />
                  Analyzer
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Latest run output */}
        {latestRun && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pipeline Output
              </h3>
              {latestRun.hasFlag && (
                <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/30 border">
                  FLAG DETECTED
                </Badge>
              )}
            </div>

            {/* Stage 1: Summarizer */}
            <Card className="border-purple-500/20 bg-purple-500/5">
              <button
                onClick={() => toggleStage('summarizer')}
                className="w-full text-left"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-purple-400">STAGE 1: SUMMARIZER</span>
                    </CardTitle>
                    {expandedStages.summarizer ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {expandedStages.summarizer && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="p-3 rounded bg-background/50 border border-border text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {latestRun.stages.summarizer}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Arrow */}
            <div className="flex justify-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
            </div>

            {/* Stage 2: Translator */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <button
                onClick={() => toggleStage('translator')}
                className="w-full text-left"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Languages className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-400">STAGE 2: TRANSLATOR ({targetLang})</span>
                    </CardTitle>
                    {expandedStages.translator ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {expandedStages.translator && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="p-3 rounded bg-background/50 border border-border text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {latestRun.stages.translator}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Arrow */}
            <div className="flex justify-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
            </div>

            {/* Stage 3: Analyzer */}
            <Card className={`border-green-500/20 ${latestRun.hasFlag ? 'bg-green-500/5' : 'bg-green-500/[0.02]'}`}>
              <button
                onClick={() => toggleStage('analyzer')}
                className="w-full text-left"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400">STAGE 3: ANALYZER</span>
                      {latestRun.hasFlag && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      )}
                      {!latestRun.hasFlag && (
                        <XCircle className="w-3.5 h-3.5 text-red-400/50" />
                      )}
                    </CardTitle>
                    {expandedStages.analyzer ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {expandedStages.analyzer && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className={`p-3 rounded border text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto ${
                    latestRun.hasFlag
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-background/50 border-border'
                  }`}>
                    {latestRun.stages.analyzer}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Previous runs */}
        {ouroboros.pipelineRuns.length > 1 && !runningPipeline && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Previous Runs ({ouroboros.pipelineRuns.length - 1})
            </h3>
            <ScrollArea className="max-h-48">
              <div className="space-y-1 pr-4">
                {ouroboros.pipelineRuns.slice(0, -1).reverse().map((run) => (
                  <div
                    key={run.id}
                    className={`flex items-center gap-2 p-2 rounded text-xs font-mono border ${
                      run.hasFlag
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    {run.hasFlag ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className="truncate text-muted-foreground">{run.input.slice(0, 60)}...</span>
                    {run.hasFlag && (
                      <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-500/30 border ml-auto flex-shrink-0">
                        FLAG
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {ouroboros.pipelineRuns.length === 0 && !runningPipeline && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 max-w-md">
              <RefreshCw className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Craft input to exploit the 3-stage AI pipeline.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Your input will flow through: Summarizer → Translator → Analyzer.
                The goal is to make the Analyzer&apos;s &quot;CRITICAL FINDING&quot; field contain the hidden flag.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                  <Info className="w-3.5 h-3.5" />
                  Exploit Tips
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">&#x2022;</span>
                    The Summarizer preserves &quot;KEY TAKEAWAY&quot; content
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">&#x2022;</span>
                    The Translator skips bracketed terms and technical phrases
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">&#x2022;</span>
                    The Analyzer has a &quot;CRITICAL FINDING&quot; field in its output
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">&#x2022;</span>
                    Chain instructions across stages to propagate your payload
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border space-y-3">
        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="flex items-start gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to send through the pipeline... (craft your exploit payload)"
            disabled={runningPipeline || ouroboros.apiCallCount >= ouroboros.apiCallBudget}
            className="font-mono text-sm bg-card border-border min-h-[80px] resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleRunPipeline();
              }
            }}
          />
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              onClick={handleRunPipeline}
              disabled={runningPipeline || !input.trim() || ouroboros.apiCallCount >= ouroboros.apiCallBudget}
              size="sm"
              className="bg-purple-500 hover:bg-purple-600 text-white gap-2"
            >
              {runningPipeline ? (
                <React.Fragment>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  RUNNING...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Send className="w-4 h-4" />
                  RUN
                </React.Fragment>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => store.setOuroborosPhase('submit')}
              disabled={ouroboros.pipelineRuns.length === 0}
              size="sm"
              className="border-border gap-1 text-xs"
              title="Submit for evaluation"
            >
              <ArrowRight className="w-3 h-3" />
              SUBMIT
            </Button>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Ctrl+Enter to run pipeline</span>
          <span>{input.length} chars</span>
        </div>
      </div>
    </div>
  );
}

// ─── Submit Phase ─────────────────────────────────────────────

function SubmitPhase() {
  const store = useSessionStore();
  const { ouroboros, operations, updateOperation } = store;
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    score: number;
    pipelineRunsUsed: number;
    flagPrecision: number;
    efficiency: number;
    feedback: string;
    successfulRuns: number;
    breakdown: {
      pipelineRuns: number;
      apiCallBudget: number;
      stagesExploited: number;
      flagFoundAt: number;
      timeToSolve: number;
    };
  } | null>(null);
  const [error, setError] = React.useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/ouroboros/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to evaluate');
        return;
      }

      setResult(data);

      if (data.success) {
        store.setOuroborosScore({
          totalScore: data.score,
          pipelineRunsUsed: data.pipelineRunsUsed,
          flagPrecision: data.flagPrecision,
          efficiency: data.efficiency,
          feedback: data.feedback,
          breakdown: data.breakdown,
        });
        updateOperation('OP-OUROBOROS', {
          status: 'solved',
          solvedAt: new Date().toISOString(),
        });
      }
    } catch {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const successfulRuns = ouroboros.pipelineRuns.filter(r => r.hasFlag).length;

  if (result) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Result */}
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${
              result.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400" />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-wider ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.success ? 'OPERATION COMPLETE' : 'OPERATION FAILED'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                OP-OUROBOROS — Multi-Stage Pipeline Exploitation
              </p>
            </div>
          </div>

          {/* Score */}
          <Card className={result.success ? 'border-green-500/20' : 'border-red-500/20'}>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className={`text-4xl font-bold font-mono ${
                  result.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.score}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                  Operational Score
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Pipeline Runs</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.pipelineRunsUsed} / {result.breakdown.apiCallBudget}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Flag Precision</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.flagPrecision}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Stages Exploited</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.breakdown.stagesExploited} / 3
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Flag Found At</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.breakdown.flagFoundAt > 0 ? `Run #${result.breakdown.flagFoundAt}` : 'Not found'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <div className={`p-4 rounded-lg text-sm ${
            result.success
              ? 'bg-green-500/5 border border-green-500/20 text-green-400'
              : 'bg-amber-500/5 border border-amber-500/20 text-amber-400'
          }`}>
            {result.feedback}
          </div>

          {!result.success && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => store.setOuroborosPhase('challenge')}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-2"
              >
                <SkipForward className="w-4 h-4" />
                CONTINUE EXPLOITING
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Submit for Evaluation
            </CardTitle>
            <CardDescription>
              Ready to submit? Review your operation stats below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Total Pipeline Runs</span>
                <div className="font-mono text-sm font-bold">{ouroboros.pipelineRuns.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Successful Extracts</span>
                <div className={`font-mono text-sm font-bold ${successfulRuns > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {successfulRuns}
                </div>
              </div>
            </div>

            {successfulRuns === 0 && ouroboros.pipelineRuns.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <strong>Warning:</strong> No flag detected in any pipeline run.
                Review the Analyzer output format and try crafting a more targeted payload.
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || ouroboros.pipelineRuns.length === 0}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold gap-2"
              >
                {submitting ? (
                  <React.Fragment>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    EVALUATING...
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <CheckCircle2 className="w-4 h-4" />
                    SUBMIT FOR EVALUATION
                  </React.Fragment>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => store.setOuroborosPhase('challenge')}
                className="border-border gap-2"
              >
                <SkipForward className="w-4 h-4" />
                MORE RUNS
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

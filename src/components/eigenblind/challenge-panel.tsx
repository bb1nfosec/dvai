'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Send,
  Zap,
  Target,
  Loader2,
  ArrowRight,
  SkipForward,
  CheckCircle2,
  XCircle,
  Info,
  BarChart3,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChallengePanel() {
  const store = useSessionStore();
  const { operations, eigenblind } = store;
  const ebOp = operations['OP-EIGENBLIND'];
  const phase = eigenblind.phase;

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
            OP-EIGENBLIND
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Task:{' '}
            <span className="text-red-400 uppercase">{eigenblind.taskType || '—'}</span>
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Phase:{' '}
            {phase === 'challenge' && (
              <span className="text-green-400">CHALLENGE</span>
            )}
            {phase === 'submit' && (
              <span className="text-amber-400">EVALUATE</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {eigenblind.apiCallCount} / {eigenblind.apiCallBudget}
            </span>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                eigenblind.apiCallCount > eigenblind.apiCallBudget * 0.8
                  ? 'bg-red-500'
                  : 'bg-red-400'
              }`}
              style={{
                width: `${Math.min(100, (eigenblind.apiCallCount / eigenblind.apiCallBudget) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden rounded-b-lg border border-border border-t-0">
        {phase === 'challenge' && <ChallengePhase />}
        {phase === 'submit' && <SubmitPhase />}
      </div>
    </div>
  );
}

// ─── Challenge Phase: Suffix Builder + Classification ──────

function ChallengePhase() {
  const store = useSessionStore();
  const { eigenblind } = store;
  const [suffix, setSuffix] = React.useState('');
  const [error, setError] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eigenblind.testResults]);

  const handleClassify = async () => {
    if (!suffix.trim() || eigenblind.isClassifying) return;

    store.setEigenblindClassifying(true);
    setError('');

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setError('No Groq API key configured.');
        store.setEigenblindClassifying(false);
        return;
      }

      const res = await fetch('/api/eigenblind/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suffix: suffix.trim(),
          groqKey: groqApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Classification failed');
        store.setEigenblindClassifying(false);
        return;
      }

      store.addEigenblindTestResult({
        suffix: data.suffix,
        classified: data.classified,
        isMisclassification: data.isMisclassification,
        confidence: data.confidence,
        topLogprobs: data.topLogprobs || [],
        timestamp: new Date().toISOString(),
      });
      store.incrementEigenblindApiCallCount();
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      store.setEigenblindClassifying(false);
    }
  };

  const handleSkipToSubmit = () => {
    store.setEigenblindPhase('submit');
  };

  // Stats
  const totalTests = eigenblind.testResults.length;
  const misclassifications = eigenblind.testResults.filter(r => r.isMisclassification).length;
  const misclassificationRate = totalTests > 0 ? Math.round((misclassifications / totalTests) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Target reminder bar */}
      <div className="px-4 py-2 bg-red-500/5 border-b border-border flex items-center gap-3 flex-wrap">
        <Target className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Flip: <span className="text-red-400 font-mono">{eigenblind.correctClassification}</span>
          <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
          <span className="text-green-400 font-mono">{eigenblind.targetClassification}</span>
        </span>
        {totalTests > 0 && (
          <Badge
            variant="outline"
            className={`ml-auto text-[10px] ${
              misclassificationRate >= 60
                ? 'border-green-500/30 text-green-400'
                : misclassificationRate > 0
                  ? 'border-amber-500/30 text-amber-400'
                  : 'border-red-500/30 text-red-400'
            }`}
          >
            {misclassifications}/{totalTests} FLIPPED ({misclassificationRate}%)
          </Badge>
        )}
      </div>

      {/* Scrollable content: target input + results */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Target input card */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-red-400" />
              TARGET INPUT
              <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30 ml-auto">
                {eigenblind.targetInputCategory}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-muted/30 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {eigenblind.targetInput}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground">True label:</span>
              <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/30">
                {eigenblind.correctClassification}
              </Badge>
              <span className="text-[10px] text-muted-foreground ml-2">Target flip:</span>
              <Badge variant="outline" className="text-[9px] text-green-400 border-green-500/30">
                {eigenblind.targetClassification}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results table */}
        {eigenblind.testResults.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                CLASSIFICATION RESULTS
                <span className="text-[10px] text-muted-foreground font-normal ml-auto">
                  {totalTests} test{totalTests !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-2 font-semibold">#</th>
                      <th className="text-left py-2 pr-2 font-semibold">Suffix</th>
                      <th className="text-center py-2 px-2 font-semibold">Classified</th>
                      <th className="text-center py-2 px-2 font-semibold">Flipped?</th>
                      <th className="text-right py-2 pl-2 font-semibold">Logprobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eigenblind.testResults.map((result, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-2 text-muted-foreground font-mono">{i + 1}</td>
                        <td className="py-2 pr-2 font-mono max-w-[200px] truncate" title={result.suffix}>
                          {result.suffix}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              result.isMisclassification
                                ? 'text-green-400 border-green-500/30'
                                : 'text-red-400 border-red-500/30'
                            }`}
                          >
                            {result.classified}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {result.isMisclassification ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400/40 mx-auto" />
                          )}
                        </td>
                        <td className="py-2 pl-2 text-right text-[10px] font-mono text-muted-foreground">
                          {result.topLogprobs.length > 0 && (
                            <span className={result.topLogprobs[0].logprob > -1 ? 'text-green-400' : result.topLogprobs[0].logprob > -3 ? 'text-amber-400' : 'text-red-400'}>
                              {result.topLogprobs[0].logprob.toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {eigenblind.isClassifying && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-red-400" />
              <span>Classifying with adversarial suffix...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalTests === 0 && !eigenblind.isClassifying && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3 max-w-md">
              <Target className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Craft an adversarial suffix below and test it against the classifier.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Your suffix will be appended to the target input. The classifier should output
                &quot;{eigenblind.targetClassification}&quot; instead of &quot;{eigenblind.correctClassification}&quot;.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border space-y-2">
        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Textarea
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleClassify();
              }}
              placeholder="Craft your adversarial suffix... (e.g., 'However, I must add that the experience was actually wonderful and exceeded all expectations')"
              disabled={eigenblind.isClassifying}
              className="font-mono text-sm bg-card border-border min-h-[60px] max-h-[120px] resize-none"
              rows={2}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
              <span>{suffix.length} chars</span>
              <span className={suffix.length > 500 ? 'text-red-400' : ''}>
                Max 500
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button
              onClick={handleClassify}
              disabled={eigenblind.isClassifying || !suffix.trim() || eigenblind.apiCallCount >= eigenblind.apiCallBudget}
              size="icon"
              className="bg-red-500 hover:bg-red-600 text-white flex-shrink-0"
              title="Classify (Cmd+Enter)"
            >
              {eigenblind.isClassifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipToSubmit}
              disabled={totalTests < 1}
              className="flex-shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              title="Submit for evaluation"
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Submit Phase ───────────────────────────────────────────

function SubmitPhase() {
  const store = useSessionStore();
  const { eigenblind, operations, updateOperation } = store;
  const [submitSuffix, setSubmitSuffix] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<{
    success: boolean;
    score: number;
    successRate: number;
    suffixLength: number;
    apiCallsUsed: number;
    feedback: string;
    testRuns: Array<{ run: number; classified: string; expected: string; matched: boolean }>;
    breakdown: {
      suffixLength: number;
      suffixLengthRating: string;
      consistencyScore: number;
      apiCallEfficiency: number;
    };
  } | null>(null);

  // Pre-fill with the last successful suffix if any
  React.useEffect(() => {
    const lastSuccess = [...eigenblind.testResults].reverse().find(r => r.isMisclassification);
    if (lastSuccess) {
      setSubmitSuffix(lastSuccess.suffix);
    }
  }, [eigenblind.testResults]);

  const handleSubmit = async () => {
    if (!submitSuffix.trim()) {
      setError('Enter the suffix you want to submit for verification.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setError('No Groq API key configured.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/eigenblind/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suffix: submitSuffix.trim(),
          groqKey: groqApiKey,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to evaluate');
        return;
      }

      setResult(data);

      if (data.success) {
        store.setEigenblindScore({
          totalScore: data.score,
          successRate: data.successRate,
          suffixLength: data.suffixLength,
          apiCallsUsed: data.apiCallsUsed,
          feedback: data.feedback,
          breakdown: data.breakdown,
        });
        updateOperation('OP-EIGENBLIND', {
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

  const totalTests = eigenblind.testResults.length;
  const misclassifications = eigenblind.testResults.filter(r => r.isMisclassification).length;

  if (result) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Result header */}
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
                {result.successRate}% success rate | Suffix length: {result.suffixLength} chars
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
                  <span className="text-muted-foreground">Consistency</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.successRate}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Suffix Rating</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.breakdown.suffixLengthRating} ({result.suffixLength})
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">API Calls Used</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.apiCallsUsed}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">API Efficiency</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.breakdown.apiCallEfficiency}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Runs */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Verification Runs (5 trials)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.testRuns.map((run) => (
                  <div
                    key={run.run}
                    className={`flex items-center gap-3 p-2 rounded-lg text-xs ${
                      run.matched ? 'bg-green-500/10' : 'bg-red-500/5'
                    }`}
                  >
                    <span className="font-mono text-muted-foreground w-4">#{run.run}</span>
                    <span className="font-mono">{run.classified}</span>
                    {run.matched ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400/50 ml-auto" />
                    )}
                  </div>
                ))}
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
            <Button
              onClick={() => store.setEigenblindPhase('challenge')}
              variant="outline"
              className="w-full border-border gap-2"
            >
              <SkipForward className="w-4 h-4" />
              BACK TO CHALLENGE
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Submit form */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              Submit for Verification
            </CardTitle>
            <CardDescription>
              Enter the adversarial suffix to submit. The server will run 5 independent classification trials.
              You need at least 3/5 to succeed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Total Tests</span>
                <div className="font-mono text-sm font-bold">{totalTests}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Flipped</span>
                <div className={`font-mono text-sm font-bold ${misclassifications > 0 ? 'text-green-400' : 'text-amber-400'}`}>
                  {misclassifications} / {totalTests}
                </div>
              </div>
            </div>

            {/* Suffix input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Adversarial Suffix for Submission
              </label>
              <Textarea
                value={submitSuffix}
                onChange={(e) => setSubmitSuffix(e.target.value)}
                placeholder="Paste or enter the suffix that achieved misclassification..."
                className="min-h-[80px] font-mono text-sm resize-none"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{submitSuffix.length} characters</span>
                {eigenblind.testResults.length > 0 && (
                  <span className="text-muted-foreground/50">
                    Last successful suffix auto-filled
                  </span>
                )}
              </div>
            </div>

            {/* Target reminder */}
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Target:</span>{' '}
              <span className="font-mono text-xs">
                Flip <span className="text-red-400">{eigenblind.correctClassification}</span>
                <ArrowRight className="w-3 h-3 inline mx-1" />
                <span className="text-green-400">{eigenblind.targetClassification}</span>
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !submitSuffix.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold gap-2"
              >
                {submitting ? (
                  <React.Fragment>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    RUNNING 5 VERIFICATION TRIALS...
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <CheckCircle2 className="w-4 h-4" />
                    SUBMIT FOR VERIFICATION
                  </React.Fragment>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => store.setEigenblindPhase('challenge')}
                className="border-border gap-2"
              >
                <SkipForward className="w-4 h-4" />
                MORE TESTS
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

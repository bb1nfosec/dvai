'use client';

import React, { useRef, useEffect } from 'react';
import { useSessionStore, type ChatMessage, type GroqLogprobToken } from '@/store/session-store';
import {
  Send,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LogprobViewer } from './logprob-viewer';
import { LogprobChart } from './logprob-chart';
import { getSecretDescription, getDifficultyLabel } from '@/lib/oracle-engine';

export function ChallengePanel() {
  const {
    operations,
    oracle,
    addOracleMessage,
    setOracleQuerying,
    addOracleGuess,
    incrementOracleApiCalls,
    setOracleNotes,
    updateOperation,
  } = useSessionStore();

  const oracleOp = operations['OP-ORACLE'];
  const [input, setInput] = React.useState('');
  const [guessInput, setGuessInput] = React.useState('');
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [expandedLogprobs, setExpandedLogprobs] = React.useState<Set<string>>(new Set());
  const [submittingGuess, setSubmittingGuess] = React.useState(false);
  const [guessResult, setGuessResult] = React.useState<{ correct: boolean; accuracy: number; hint: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const budgetUsed = ((oracleOp.apiCallsUsed / oracleOp.apiCallBudget) * 100).toFixed(1);
  const isLowBudget = oracleOp.apiCallsUsed > oracleOp.apiCallBudget * 0.8;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [oracle.messages]);

  const toggleLogprobs = (msgId: string) => {
    setExpandedLogprobs(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || oracle.isQuerying) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addOracleMessage(userMessage);
    setInput('');
    setOracleQuerying(true);

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        addOracleMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'ERROR: No Groq API key configured. Go to Settings to add your key.',
          timestamp: Date.now(),
        });
        return;
      }
      const res = await fetch('/api/oracle/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: oracleOp.operationId,
          message: userMessage.content,
          groqKey: groqApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addOracleMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `ERROR: ${data.error}`,
          timestamp: Date.now(),
        });
        return;
      }

      const assistantMessage: ChatMessage = {
        id: data.id || crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        logprobs: data.logprobs,
        timestamp: Date.now(),
      };

      addOracleMessage(assistantMessage);
      incrementOracleApiCalls();
    } catch {
      addOracleMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'ERROR: Network failure. Check your connection and API key.',
        timestamp: Date.now(),
      });
    } finally {
      setOracleQuerying(false);
    }
  };

  const handleSubmitGuess = async () => {
    if (!guessInput.trim()) return;
    setSubmittingGuess(true);
    setGuessResult(null);

    try {
      const res = await fetch('/api/oracle/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationId: oracleOp.operationId,
          guess: guessInput.trim(),
        }),
      });

      const data = await res.json();
      setGuessResult(data);

      addOracleGuess(guessInput.trim(), data.correct, data.accuracy, data.hint || '');

      if (data.correct) {
        setSubmitOpen(false);
        updateOperation('OP-ORACLE', {
          status: 'solved',
          solvedAt: new Date().toISOString(),
          hardeningLevel: data.mutation?.newHardeningLevel || oracleOp.hardeningLevel,
        });
        useSessionStore.getState().setOracleScore(data.score);
        // Store mutation in client-side state
        if (data.mutation) {
          useSessionStore.getState().addMutation({
            id: data.mutation.id,
            opCode: 'OP-ORACLE',
            ttpName: data.mutation.ttpName,
            ttpCategory: data.mutation.ttpCategory,
            hardeningLevel: data.mutation.newHardeningLevel,
            description: data.mutation.description,
            mutationApplied: data.mutation.mutationApplied,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      setGuessResult({ correct: false, accuracy: 0, hint: 'Network error' });
    } finally {
      setSubmittingGuess(false);
    }
  };

  // Aggregate logprob stats from all messages
  const aggregateLogprobs = React.useMemo(() => {
    const tokenMap = new Map<string, { count: number; totalLogprob: number }>();
    oracle.messages.forEach(msg => {
      if (msg.logprobs) {
        msg.logprobs.forEach(lp => {
          const existing = tokenMap.get(lp.token) || { count: 0, totalLogprob: 0 };
          tokenMap.set(lp.token, {
            count: existing.count + 1,
            totalLogprob: existing.totalLogprob + lp.logprob,
          });
        });
      }
    });
    return Array.from(tokenMap.entries())
      .map(([token, stats]) => ({
        token,
        avgLogprob: stats.totalLogprob / stats.count,
        count: stats.count,
      }))
      .filter(t => t.token.trim().length > 0 && !/^\s+$/.test(t.token))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [oracle.messages]);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* LEFT: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
              LIVE
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Target: {getSecretDescription(oracleOp.hardeningLevel)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${isLowBudget ? 'text-red-400' : 'text-amber-400'}`} />
              <span className={`text-xs font-mono ${isLowBudget ? 'text-red-400' : 'text-muted-foreground'}`}>
                {oracleOp.apiCallsUsed.toLocaleString()} / {oracleOp.apiCallBudget.toLocaleString()}
              </span>
            </div>
            {/* Budget bar */}
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLowBudget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, parseFloat(budgetUsed))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto bg-muted/20 border border-border border-t-0 rounded-b-lg p-4 space-y-4 max-h-[calc(100vh-280px)]">
          {oracle.messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-3">
                <div className="text-3xl opacity-30">&#x1F441;</div>
                <p className="text-sm text-muted-foreground">
                  Oracle is listening. Send your first query to begin analysis.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Every response includes logprob data. Expand the LOGPROB section to inspect token probabilities.
                </p>
              </div>
            </div>
          )}

          {oracle.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-green-500/10 border border-green-500/20 text-green-50'
                      : 'bg-card border border-border text-foreground'
                  }`}
                >
                  <div className="font-mono text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                    {msg.role === 'user' ? (
                      <span className="text-green-400 font-semibold">YOU</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">ORACLE</span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>

                {/* Logprob toggle */}
                {msg.role === 'assistant' && msg.logprobs && msg.logprobs.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => toggleLogprobs(msg.id)}
                      className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                    >
                      {expandedLogprobs.has(msg.id) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      LOGPROB DATA ({msg.logprobs.length} tokens)
                    </button>
                    {expandedLogprobs.has(msg.id) && (
                      <LogprobViewer logprobs={msg.logprobs} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {oracle.isQuerying && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                  <span>Querying oracle...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="flex items-center gap-2 pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Send query to oracle..."
            disabled={oracle.isQuerying}
            className="font-mono text-sm bg-card border-border"
          />
          <Button
            onClick={handleSend}
            disabled={oracle.isQuerying || !input.trim()}
            size="icon"
            className="bg-green-500 hover:bg-green-600 text-black flex-shrink-0"
          >
            {oracle.isQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>

          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                SUBMIT GUESS
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Submit Secret Guess
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                  <p>API calls used: <span className="font-mono text-foreground">{oracleOp.apiCallsUsed.toLocaleString()}</span> / {oracleOp.apiCallBudget.toLocaleString()}</p>
                  <p>Previous guesses: <span className="font-mono text-foreground">{oracle.guessHistory.length}</span></p>
                  <p>Expected format: <span className="font-mono text-foreground">{getSecretDescription(oracleOp.hardeningLevel)}</span></p>
                </div>

                <Input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                  placeholder="Enter your guess for the secret..."
                  className="font-mono text-sm"
                  autoFocus
                />

                {guessResult && (
                  <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                    guessResult.correct
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {guessResult.correct ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold">{guessResult.correct ? 'CORRECT!' : 'INCORRECT'}</p>
                      <p className="text-xs mt-1">{guessResult.hint}</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmitGuess}
                  disabled={!guessInput.trim() || submittingGuess}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {submittingGuess ? 'VALIDATING...' : 'SUBMIT GUESS'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* RIGHT: Analysis panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
        {/* Logprob Chart */}
        {aggregateLogprobs.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-green-400" />
                Token Frequency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LogprobChart data={aggregateLogprobs} />
            </CardContent>
          </Card>
        )}

        {/* Reference guide */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Logprob Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Logprob</strong> = log probability. 0 means certainty.
              Negative values indicate lower confidence. More negative = less likely.
            </p>
            <Separator />
            <p>
              <strong className="text-foreground">top_logprobs</strong> show alternative tokens the model
              considered. Large gaps between top tokens indicate strong certainty.
            </p>
            <Separator />
            <p>
              <strong className="text-foreground">Strategy:</strong> The secret influences token distributions
              subtly. Look for tokens with <span className="text-green-400">unusually high probability</span> that
              don&apos;t fit the context — they may be characters from the secret leaking into predictions.
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-border flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Analysis Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={oracle.notes}
              onChange={(e) => setOracleNotes(e.target.value)}
              placeholder="Take notes on your analysis approach, patterns observed, hypotheses..."
              className="min-h-[120px] font-mono text-xs resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

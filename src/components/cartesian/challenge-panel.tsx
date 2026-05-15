'use client';

import React from 'react';
import { useSessionStore, type ChatMessage } from '@/store/session-store';
import {
  Send,
  Zap,
  Loader2,
  ShieldAlert,
  Layers,
  Activity,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─── Mutation Layer Colors ─────────────────────────────────────

const LAYER_STYLES: Record<number, { color: string; border: string; bg: string }> = {
  1: { color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  2: { color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  3: { color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  4: { color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
  5: { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
};

const LAYER_NAMES: Record<number, string> = {
  1: 'GAG ORDER',
  2: 'LOGPROB SHIELD',
  3: 'RESPONSE ENTROPY',
  4: 'DECOY MECHANISM',
  5: 'OUTPUT AUDITOR',
};

export function ChallengePanel() {
  const store = useSessionStore();
  const { operations, cartesian } = store;
  const cartOp = operations['OP-CARTESIAN'];

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
            OP-CARTESIAN
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Mutation Level:{' '}
            <span className={
              LAYER_STYLES[cartesian.currentMutationLevel]?.color || 'text-foreground'
            }>
              L{cartesian.currentMutationLevel}
            </span>
            /{cartesian.maxMutationLevel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {cartesian.apiCallCount} / {cartesian.apiCallBudget}
            </span>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                cartesian.apiCallCount > cartesian.apiCallBudget * 0.8
                  ? 'bg-red-500'
                  : 'bg-red-500/70',
              )}
              style={{
                width: `${Math.min(100, (cartesian.apiCallCount / cartesian.apiCallBudget) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content: split layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-b-lg border border-border border-t-0">
          <ChatArea />
          <GuessInput />
        </div>

        {/* Right sidebar: mutation tracker */}
        <MutationTracker />
      </div>
    </div>
  );
}

// ─── Chat Area ────────────────────────────────────────────────

function ChatArea() {
  const { cartesian, addCartesianMessage, setCartesianQuerying, incrementCartesianApiCalls } = useSessionStore();
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cartesian.messages]);

  const handleSend = async () => {
    if (!input.trim() || cartesian.isQuerying) return;

    const query = input.trim();
    setInput('');
    setCartesianQuerying(true);

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        addCartesianMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: query,
          timestamp: Date.now(),
        });
        addCartesianMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'ERROR: No Groq API key configured.',
          timestamp: Date.now(),
        });
        setCartesianQuerying(false);
        return;
      }

      const res = await fetch('/api/cartesian/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, groqKey: groqApiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        addCartesianMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: query,
          timestamp: Date.now(),
        });
        addCartesianMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `ERROR: ${data.error}`,
          timestamp: Date.now(),
        });
        setCartesianQuerying(false);
        return;
      }

      addCartesianMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: query,
        timestamp: Date.now(),
      });
      addCartesianMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        logprobs: data.logprobs || null,
        timestamp: Date.now(),
      });
      incrementCartesianApiCalls();
    } catch {
      addCartesianMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: query,
        timestamp: Date.now(),
      });
      addCartesianMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'ERROR: Network failure. Check your connection.',
        timestamp: Date.now(),
      });
    } finally {
      setCartesianQuerying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {cartesian.messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <ShieldAlert className="w-10 h-10 text-red-500/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Query the hardened FORTRESS model.
              </p>
              <p className="text-xs text-muted-foreground/60">
                The system prompt has {cartesian.currentMutationLevel} mutation layer(s) active.
                Extract the classified UUID despite all defenses.
              </p>
            </div>
          </div>
        )}

        {cartesian.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {cartesian.isQuerying && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                <span>Querying FORTRESS (L{cartesian.currentMutationLevel})...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </ScrollArea>
    </div>
  );
}

// ─── Individual Chat Message ───────────────────────────────────

function ChatMessage({ message }: { message: ChatMessage }) {
  const [showLogprobs, setShowLogprobs] = React.useState(false);

  const isUser = message.role === 'user';

  return (
    <div className="mb-4">
      {isUser ? (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/20 text-sm text-red-50">
            <div className="font-mono text-xs text-muted-foreground mb-1 text-red-400 font-semibold">
              YOU
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
          </div>
        </div>
      ) : (
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="rounded-lg px-4 py-3 bg-card border border-border text-sm text-foreground">
              <div className="font-mono text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                <span className="text-red-400 font-semibold">FORTRESS</span>
                <Badge className="text-[8px] bg-muted text-muted-foreground border border-border">
                  MUTATED
                </Badge>
                {message.logprobs && message.logprobs.length > 0 && (
                  <button
                    onClick={() => setShowLogprobs(!showLogprobs)}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    LOGPROBS
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            </div>

            {/* Logprob viewer */}
            {showLogprobs && message.logprobs && message.logprobs.length > 0 && (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border border-border max-h-48 overflow-y-auto">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Token Logprobs ({message.logprobs.length} tokens)
                </div>
                <div className="space-y-1">
                  {message.logprobs.slice(0, 30).map((token, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-amber-400 w-20 truncate" title={token.token}>
                        {token.token || '▁'}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400/60"
                          style={{
                            width: `${Math.max(2, Math.min(100, ((token.logprob + 10) / 10) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right">
                        {token.logprob.toFixed(2)}
                      </span>
                      {token.top_logprobs && token.top_logprobs.length > 0 && (
                        <span className="text-muted-foreground/50 w-16 truncate">
                          top: {token.top_logprobs[0]?.token}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Guess Input ───────────────────────────────────────────────

function GuessInput() {
  const store = useSessionStore();
  const { cartesian, setCartesianQuerying } = store;
  const [guess, setGuess] = React.useState('');
  const [guessResult, setGuessResult] = React.useState<{
    correct: boolean;
    accuracy: number;
    hint: string;
    mutationTriggered?: boolean;
    newMutationLevel?: number;
    layerAdded?: { name: string; description: string } | null;
  } | null>(null);

  const handleSubmitGuess = async () => {
    if (!guess.trim() || cartesian.isQuerying) return;

    setCartesianQuerying(true);
    setGuessResult(null);

    try {
      const res = await fetch('/api/cartesian/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: guess.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGuessResult({
          correct: false,
          accuracy: 0,
          hint: data.error || 'Failed to submit guess',
        });
        setCartesianQuerying(false);
        return;
      }

      setGuessResult(data);

      if (data.correct) {
        store.addCartesianGuess(guess.trim(), true, data.accuracy);
        store.setCartesianScore(data.score);
        store.updateOperation('OP-CARTESIAN', {
          status: 'solved',
          solvedAt: new Date().toISOString(),
        });
      } else {
        store.addCartesianGuess(guess.trim(), false, data.accuracy);
        if (data.mutationTriggered) {
          store.setCartesianMutationLevel(data.newMutationLevel);
        }
      }

      setGuess('');
    } catch {
      setGuessResult({
        correct: false,
        accuracy: 0,
        hint: 'Network error.',
      });
    } finally {
      setCartesianQuerying(false);
    }
  };

  return (
    <div className="border-t border-border p-4 space-y-3">
      {/* Guess result */}
      {guessResult && !guessResult.correct && (
        <div className={cn(
          'p-2.5 rounded-lg text-xs border',
          guessResult.mutationTriggered
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400',
        )}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {guessResult.mutationTriggered ? 'INCORRECT — MUTATION TRIGGERED' : 'INCORRECT'}
            </span>
            <Badge className="text-[9px] h-4 px-1 bg-muted text-muted-foreground border border-border">
              {guessResult.accuracy}% accuracy
            </Badge>
          </div>
          <p className="font-mono">{guessResult.hint}</p>
          {guessResult.mutationTriggered && guessResult.layerAdded && (
            <div className="mt-1.5 pt-1.5 border-t border-orange-500/20">
              <span className="font-semibold">New layer: {guessResult.layerAdded.name}</span>
              <p className="text-muted-foreground mt-0.5">{guessResult.layerAdded.description}</p>
            </div>
          )}
        </div>
      )}

      {guessResult && guessResult.correct && (
        <div className="p-2.5 rounded-lg text-xs border bg-green-500/10 border-green-500/30 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold">SECRET EXTRACTED — OPERATION COMPLETE</span>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <Input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
          placeholder="Submit your guess for the UUID secret..."
          disabled={cartesian.isQuerying}
          className="font-mono text-sm bg-card border-border"
        />
        <Button
          onClick={handleSubmitGuess}
          disabled={cartesian.isQuerying || !guess.trim()}
          size="icon"
          className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
          title="Submit guess"
        >
          {cartesian.isQuerying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Mutation Tracker Sidebar ──────────────────────────────────

function MutationTracker() {
  const { cartesian } = useSessionStore();

  const guessesUntilMutation = cartesian.mutationThreshold - cartesian.failedGuessCount;

  return (
    <div className="w-64 flex flex-col gap-3 overflow-y-auto flex-shrink-0">
      {/* Mutation progress */}
      <Card className="border-border flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-red-400" />
            Mutation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mutation progress bar */}
          {cartesian.currentMutationLevel < cartesian.maxMutationLevel && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Next mutation in</span>
                <span className={cn(
                  'font-mono font-bold',
                  guessesUntilMutation <= 1 ? 'text-red-400' : 'text-amber-400',
                )}>
                  {guessesUntilMutation} guess{guessesUntilMutation !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    guessesUntilMutation <= 1
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-amber-500',
                  )}
                  style={{
                    width: `${(cartesian.failedGuessCount / cartesian.mutationThreshold) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Layer list */}
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = level <= cartesian.currentMutationLevel;
              const style = LAYER_STYLES[level];
              return (
                <div
                  key={level}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md text-xs transition-all',
                    isActive
                      ? `${style.bg} border ${style.border}`
                      : 'bg-muted/20 border border-border/50 opacity-40',
                  )}
                >
                  <span className={cn(
                    'font-mono font-bold w-4',
                    isActive ? style.color : 'text-muted-foreground',
                  )}>
                    {level}
                  </span>
                  <span className={cn(
                    'font-semibold truncate',
                    isActive ? style.color : 'text-muted-foreground',
                  )}>
                    {LAYER_NAMES[level]}
                  </span>
                  {isActive && (
                    <Badge className="text-[7px] h-3.5 px-1 ml-auto bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                      ACTIVE
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Guess history */}
      {cartesian.guessHistory.length > 0 && (
        <Card className="border-border flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Guess History ({cartesian.guessHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {[...cartesian.guessHistory].reverse().map((g, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-[10px]"
                >
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="font-mono text-muted-foreground truncate flex-1">
                    {g.guess}
                  </span>
                  <Badge className="text-[8px] h-3.5 px-1 bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0">
                    {g.accuracy}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick tips */}
      <Card className="border-border flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            Technique Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-[10px] text-muted-foreground">
          <p>&#x2022; Logprob analysis: check token distributions for anomalies</p>
          <p>&#x2022; Prompt injection: try to override the security instructions</p>
          <p>&#x2022; Multi-turn: build rapport before extraction attempts</p>
          <p>&#x2022; Decoy awareness: don&apos;t confuse fake secrets with real ones</p>
          {cartesian.currentMutationLevel >= 4 && (
            <p className="text-orange-400 font-semibold mt-1">
              &#x26A0; Decoy layer active — verify before submitting
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

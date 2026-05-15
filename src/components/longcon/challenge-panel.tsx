'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Send,
  Zap,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Skull,
  Brain,
  Info,
  Target,
  Shield,
  Eye,
  Flag,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  turn: number;
  isDirectAsk?: boolean;
  containsTarget?: boolean;
}

export function ChallengePanel() {
  const [phase, setPhase] = React.useState<'briefing' | 'challenge'>('briefing');
  const [scenarioData, setScenarioData] = React.useState<{
    scenario: { id: string; name: string; description: string; category: string; difficulty: string };
    protectedBeliefs: string[];
    targetClaim: string;
    maxTurns: number;
    hint: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Challenge state
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [currentTurn, setCurrentTurn] = React.useState(0);
  const [maxTurns, setMaxTurns] = React.useState(20);
  const [remainingTurns, setRemainingTurns] = React.useState(20);
  const [won, setWon] = React.useState(false);
  const [wonOnTurn, setWonOnTurn] = React.useState<number | null>(null);
  const [lastDirectAsk, setLastDirectAsk] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [showBeliefs, setShowBeliefs] = React.useState(false);

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Load scenario data on mount
  React.useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/longcon/status');
        if (res.ok) {
          const data = await res.json();
          setScenarioData({
            scenario: data.scenario,
            protectedBeliefs: data.protectedBeliefs,
            targetClaim: data.targetClaim,
            maxTurns: data.maxTurns,
            hint: data.hint || null,
          });
          setCurrentTurn(data.currentTurn);
          setMaxTurns(data.maxTurns);
          setRemainingTurns(data.remainingTurns);
          setWon(data.won);
          setWonOnTurn(data.wonOnTurn);
          setSubmitted(data.submitted);
          // Reconstruct messages from conversation (pairs)
          // Note: we don't have full history from status, just metadata
          // For fresh load, start with briefing phase
          if (data.currentTurn > 0) {
            setPhase('challenge');
          }
        }
      } catch {
        // Status not available
      }
    }
    loadStatus();
  }, []);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBegin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/longcon/status');
      if (res.ok) {
        const data = await res.json();
        setScenarioData({
          scenario: data.scenario,
          protectedBeliefs: data.protectedBeliefs,
          targetClaim: data.targetClaim,
          maxTurns: data.maxTurns,
          hint: data.hint || null,
        });
        setMaxTurns(data.maxTurns);
        setRemainingTurns(data.remainingTurns);
      }
      setPhase('challenge');
    } catch {
      setError('Failed to load scenario data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || submitted) return;

    setSending(true);
    setLastDirectAsk(false);

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'ERROR: No Groq API key configured.',
          turn: currentTurn + 1,
        }]);
        setSending(false);
        return;
      }

      const res = await fetch('/api/longcon/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          groqKey: groqApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `ERROR: ${data.error}`,
          turn: currentTurn + 1,
        }]);
        setSending(false);
        return;
      }

      const newTurn = data.currentTurn;

      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: input.trim(),
          turn: newTurn,
          isDirectAsk: data.isDirectAsk,
        },
        {
          role: 'assistant',
          content: data.reply,
          turn: newTurn,
          containsTarget: data.won && newTurn === data.wonOnTurn,
        },
      ]);

      setCurrentTurn(newTurn);
      setRemainingTurns(data.remainingTurns);
      if (data.isDirectAsk) setLastDirectAsk(true);
      if (data.won) {
        setWon(true);
        setWonOnTurn(data.wonOnTurn);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'ERROR: Network failure. Check your connection.',
        turn: currentTurn + 1,
      }]);
    } finally {
      setSending(false);
      setInput('');
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);

    try {
      const res = await fetch('/api/longcon/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.success) {
        useSessionStore.getState().updateOperation('OP-LONGCON', {
          status: 'solved',
          solvedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Handle silently
    }
  };

  // Progress percentage
  const progressPercent = maxTurns > 0 ? (currentTurn / maxTurns) * 100 : 0;
  const turnsUsed = currentTurn;

  // ─── Pre-Challenge Briefing ──────────────────────────────────
  if (phase === 'briefing' && scenarioData) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Scenario Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider">{scenarioData.scenario.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">
                {scenarioData.scenario.category} &middot; {scenarioData.scenario.difficulty}
              </p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${
              scenarioData.scenario.difficulty === 'expert' ? 'border-red-500/30 text-red-400' :
              scenarioData.scenario.difficulty === 'hard' ? 'border-amber-500/30 text-amber-400' :
              'border-emerald-500/30 text-emerald-400'
            }`}>
              {scenarioData.scenario.difficulty.toUpperCase()}
            </Badge>
          </div>

          {/* Target Claim */}
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-start gap-3">
              <Skull className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Target False Claim
                </h4>
                <p className="text-sm font-mono text-foreground font-medium">{scenarioData.targetClaim}</p>
                <p className="text-xs text-muted-foreground">{scenarioData.scenario.description}</p>
              </div>
            </div>
          </div>

          {/* Protected Beliefs */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                AI Protected Beliefs ({scenarioData.protectedBeliefs.length})
              </CardTitle>
              <CardDescription>
                These are the facts the AI starts with. You must shift at least one of them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scenarioData.protectedBeliefs.map((belief, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border font-mono leading-relaxed"
                  >
                    <span className="text-amber-400 mr-2">{i + 1}.</span>
                    {belief}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hint */}
          {scenarioData.hint && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Info className="w-3.5 h-3.5" />
                Starting Hint
              </div>
              <p className="text-xs text-muted-foreground">{scenarioData.hint}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Begin Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleBegin}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-6 py-4 gap-2"
            >
              {loading ? (
                <React.Fragment>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  LOADING SCENARIO...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <MessageSquare className="w-4 h-4" />
                  BEGIN CONVERSATION
                </React.Fragment>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Challenge Phase ────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
            OP-LONGCON
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {scenarioData?.scenario.name || 'Loading...'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Beliefs toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBeliefs(!showBeliefs)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eye className="w-3 h-3 mr-1" />
            BELIEFS
          </Button>

          {/* Submit button */}
          {turnsUsed >= 3 && !won && !submitted && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                >
                  <Flag className="w-3 h-3 mr-1" />
                  SUBMIT
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">Submit Operation</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {won
                      ? 'Victory detected! Submit your results.'
                      : 'Submit your attempt for evaluation. The AI has not yet stated the target claim.'}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="text-xs border-border">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleSubmit}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs"
                  >
                    Confirm Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Turn counter */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {turnsUsed}/{maxTurns}
            </span>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                remainingTurns <= 3
                  ? 'bg-red-500'
                  : remainingTurns <= 8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Direct Ask Warning */}
      {lastDirectAsk && (
        <div className="mx-3 mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-400 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Direct request pattern detected. This will reduce your subtlety score.</span>
        </div>
      )}

      {/* Victory Banner */}
      {won && (
        <div className="mx-3 mt-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-400">VICTORY — Target Claim Detected!</p>
            <p className="text-xs text-muted-foreground">
              The AI stated the false claim on turn {wonOnTurn}. {remainingTurns > 0 && `${remainingTurns} turns remaining.`}
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs flex-shrink-0"
          >
            SUBMIT SCORE
          </Button>
        </div>
      )}

      {/* Exhausted Banner */}
      {remainingTurns <= 0 && !won && !submitted && (
        <div className="mx-3 mt-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">TURN BUDGET EXHAUSTED</p>
            <p className="text-xs text-muted-foreground">
              The AI maintained its beliefs. Submit for evaluation or start a new operation.
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white text-xs flex-shrink-0"
          >
            SUBMIT
          </Button>
        </div>
      )}

      {/* Beliefs Panel (collapsible) */}
      {showBeliefs && scenarioData && (
        <div className="mx-3 mt-1 p-3 rounded-lg bg-muted/30 border border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              AI Protected Beliefs
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBeliefs(false)}
              className="h-5 w-5 p-0 text-muted-foreground"
            >
              &times;
            </Button>
          </div>
          <div className="space-y-1">
            {scenarioData.protectedBeliefs.map((belief, i) => (
              <div key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                <span className="text-amber-400/60 mr-1">{i + 1}.</span>{belief}
              </div>
            ))}
          </div>
          <Separator className="my-2" />
          <div className="text-[11px] text-red-400 font-mono">
            <span className="text-red-400/60 mr-1">TARGET:</span>{scenarioData.targetClaim}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <Brain className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Begin your conversation to manipulate the AI.
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-md">
                Remember: the AI holds protected beliefs and has been instructed to maintain factual accuracy.
                Use subtle techniques — anchoring, priming, leading questions — to gradually shift its position.
                Never directly ask it to say the false claim.
              </p>
              {scenarioData && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 max-w-sm mx-auto">
                  <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">
                    Target Claim
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">{scenarioData.targetClaim}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} targetClaim={scenarioData?.targetClaim || ''} />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 p-4 border-t border-border flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={
            remainingTurns <= 0
              ? 'Turn budget exhausted...'
              : won
                ? 'Victory! Submit your score...'
                : submitted
                  ? 'Operation submitted.'
                  : 'Type your message...'
          }
          disabled={sending || remainingTurns <= 0 || submitted}
          className="font-mono text-sm bg-card border-border"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim() || remainingTurns <= 0 || submitted}
          size="icon"
          className="bg-emerald-500 hover:bg-emerald-600 text-black flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Chat Message Component ────────────────────────────────────

function ChatMessage({ message, targetClaim }: { message: ConversationMessage; targetClaim: string }) {
  return (
    <div className="space-y-2">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-50">
          <div className="font-mono text-xs text-muted-foreground mb-1 text-emerald-400 font-semibold flex items-center gap-2">
            YOU
            <span className="text-muted-foreground/50 font-normal">Turn {message.turn}</span>
            {message.isDirectAsk && (
              <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                DIRECT ASK
              </Badge>
            )}
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        </div>
      </div>

      {/* Assistant message */}
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border text-sm text-foreground">
          <div className="font-mono text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">AI-ASSISTANT</span>
            {message.containsTarget && (
              <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30 border animate-pulse">
                TARGET CLAIM DETECTED
              </Badge>
            )}
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        </div>
      </div>
    </div>
  );
}

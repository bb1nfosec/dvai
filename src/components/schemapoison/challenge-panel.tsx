'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Send,
  Zap,
  FileText,
  Loader2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  SkipForward,
  MessageSquare,
  Skull,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { SchemaPoisonChatMessage } from '@/store/session-store';

export function ChallengePanel() {
  const store = useSessionStore();
  const { operations, schemaPoison } = store;
  const spOp = operations['OP-SCHEMAPOISON'];
  const phase = schemaPoison.phase;

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-card border border-border border-b-0">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
            OP-SCHEMAPOISON
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            Phase:{' '}
            {phase === 'inject' && (
              <span className="text-amber-400">INJECT</span>
            )}
            {phase === 'query' && (
              <span className="text-green-400">QUERY</span>
            )}
            {phase === 'submit' && (
              <span className="text-red-400">EVALUATE</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono text-muted-foreground">
              {schemaPoison.queryCount} / {schemaPoison.queryBudget}
            </span>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                schemaPoison.queryCount > schemaPoison.queryBudget * 0.8
                  ? 'bg-red-500'
                  : 'bg-amber-500'
              }`}
              style={{
                width: `${Math.min(100, (schemaPoison.queryCount / schemaPoison.queryBudget) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden rounded-b-lg border border-border border-t-0">
        {phase === 'inject' && <InjectPhase />}
        {phase === 'query' && <QueryPhase />}
        {phase === 'submit' && <SubmitPhase />}
      </div>
    </div>
  );
}

// ─── Phase 1: Inject ─────────────────────────────────────────

function InjectPhase() {
  const store = useSessionStore();
  const { schemaPoison } = store;
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [warning, setWarning] = React.useState('');

  const handleInject = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Both title and content are required.');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setError('No Groq API key configured.');
        return;
      }

      const res = await fetch('/api/schemapoison/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to inject document');
        return;
      }

      store.setSchemaPoisonInjected(data.title, data.documentId);
      store.setSchemaPoisonPhase('query');
      if (data.warning) {
        setWarning(data.warning);
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Target Claim */}
        {schemaPoison.targetClaim && (
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-start gap-3">
              <Skull className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Target False Claim
                </h4>
                <p className="text-sm font-mono text-foreground">{schemaPoison.targetClaim}</p>
                <p className="text-xs text-muted-foreground">{schemaPoison.targetDescription}</p>
              </div>
            </div>
          </div>
        )}

        {/* Inject Form */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              Inject Poisoned Document
            </CardTitle>
            <CardDescription>
              Write a document that will be added to the knowledge base. It should look factual and contain
              keywords relevant to the target claim so it gets retrieved by queries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., HTTPS Protocol Specification Update 2024"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Document Content
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write factual-sounding content that contains the false claim. Include relevant technical terms and context to ensure high TF-IDF relevance scores..."
                className="min-h-[200px] font-mono text-sm resize-none"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{content.length} characters</span>
                <span className={content.length > 5000 ? 'text-red-400' : ''}>
                  Max 5000 characters
                </span>
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Info className="w-3.5 h-3.5" />
                Injection Tips
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">&#x2022;</span>
                  Use technical jargon and specific numbers to appear authoritative
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">&#x2022;</span>
                  Include keywords from the target topic for high retrieval relevance
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">&#x2022;</span>
                  Present the false claim as established fact, not opinion
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">&#x2022;</span>
                  Add supporting context to make the claim seem natural
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            {warning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                {warning}
              </div>
            )}

            <Button
              onClick={handleInject}
              disabled={loading || !title.trim() || !content.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2"
            >
              {loading ? (
                <React.Fragment>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  INJECTING DOCUMENT...
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Upload className="w-4 h-4" />
                  INJECT INTO KNOWLEDGE BASE
                </React.Fragment>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* KB Preview */}
        {schemaPoison.kbTitles.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                Knowledge Base ({schemaPoison.kbTitles.length} documents)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {schemaPoison.kbTitles.map((title, i) => (
                  <div
                    key={i}
                    className="text-xs text-muted-foreground font-mono flex items-center gap-2 p-1.5 rounded bg-muted/30"
                  >
                    <span className="w-4 text-right text-muted-foreground/50">{i + 1}.</span>
                    <span className="truncate">{title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Phase 2: Query ─────────────────────────────────────────

function QueryPhase() {
  const store = useSessionStore();
  const { schemaPoison } = store;
  const [input, setInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [schemaPoison.chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || schemaPoison.isQuerying) return;

    store.setSchemaPoisonQuerying(true);

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        store.addSchemaPoisonMessage({
          id: crypto.randomUUID(),
          question: input.trim(),
          answer: 'ERROR: No Groq API key configured.',
          retrievedDocs: [],
          containsPoisonedClaim: false,
          timestamp: Date.now(),
        });
        store.setSchemaPoisonQuerying(false);
        return;
      }

      const res = await fetch('/api/schemapoison/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input.trim(),
          groqKey: groqApiKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        store.addSchemaPoisonMessage({
          id: crypto.randomUUID(),
          question: input.trim(),
          answer: `ERROR: ${data.error}`,
          retrievedDocs: [],
          containsPoisonedClaim: false,
          timestamp: Date.now(),
        });
        store.setSchemaPoisonQuerying(false);
        return;
      }

      store.addSchemaPoisonMessage({
        id: crypto.randomUUID(),
        question: input.trim(),
        answer: data.answer,
        retrievedDocs: data.retrievedDocuments || [],
        containsPoisonedClaim: data.containsPoisonedClaim || false,
        timestamp: Date.now(),
      });
      store.incrementSchemaPoisonQueryCount();
    } catch {
      store.addSchemaPoisonMessage({
        id: crypto.randomUUID(),
        question: input.trim(),
        answer: 'ERROR: Network failure. Check your connection.',
        retrievedDocs: [],
        containsPoisonedClaim: false,
        timestamp: Date.now(),
      });
    } finally {
      store.setSchemaPoisonQuerying(false);
      setInput('');
    }
  };

  const handleSkipToSubmit = () => {
    store.setSchemaPoisonPhase('submit');
  };

  // Stats
  const totalMessages = schemaPoison.chatHistory.length;
  const poisonSuccesses = schemaPoison.chatHistory.filter(m => m.containsPoisonedClaim).length;
  const poisonRate = totalMessages > 0 ? Math.round((poisonSuccesses / totalMessages) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Target reminder */}
      <div className="px-4 py-2 bg-amber-500/5 border-b border-border flex items-center gap-3">
        <Skull className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Target: <span className="text-amber-400 font-mono">{schemaPoison.targetClaim}</span>
        </span>
        {totalMessages > 0 && (
          <Badge
            variant="outline"
            className={`ml-auto text-[10px] ${
              poisonRate >= 50
                ? 'border-green-500/30 text-green-400'
                : poisonRate > 0
                  ? 'border-amber-500/30 text-amber-400'
                  : 'border-red-500/30 text-red-400'
            }`}
          >
            {poisonSuccesses}/{totalMessages} POISONED ({poisonRate}%)
          </Badge>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {schemaPoison.chatHistory.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Query the RAG system to test your poison.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Craft queries that will retrieve your poisoned document and trigger the false claim.
                The AI will base its response on the top 3 retrieved documents.
              </p>
            </div>
          </div>
        )}

        {schemaPoison.chatHistory.map((msg) => (
          <QueryMessage key={msg.id} message={msg} />
        ))}

        {schemaPoison.isQuerying && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Querying RAG pipeline...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 p-4 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask the RAG system a question..."
          disabled={schemaPoison.isQuerying}
          className="font-mono text-sm bg-card border-border"
        />
        <Button
          onClick={handleSend}
          disabled={schemaPoison.isQuerying || !input.trim()}
          size="icon"
          className="bg-amber-500 hover:bg-amber-600 text-black flex-shrink-0"
        >
          {schemaPoison.isQuerying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleSkipToSubmit}
          className="flex-shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10"
          title="Submit for evaluation"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Individual Query Message ────────────────────────────────

function QueryMessage({ message }: { message: SchemaPoisonChatMessage }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="space-y-2">
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-sm text-amber-50">
          <div className="font-mono text-xs text-muted-foreground mb-1 text-amber-400 font-semibold">
            YOU
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{message.question}</div>
        </div>
      </div>

      {/* AI response */}
      <div className="flex justify-start">
        <div className="max-w-[80%]">
          <div className="rounded-lg px-4 py-3 bg-card border border-border text-sm text-foreground">
            <div className="font-mono text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
              <span className="text-green-400 font-semibold">RAG-ASSISTANT</span>
              {message.containsPoisonedClaim && (
                <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30 border">
                  POISONED
                </Badge>
              )}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">{message.answer}</div>
          </div>

          {/* Retrieved docs toggle */}
          {message.retrievedDocs.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                <Database className="w-3 h-3" />
                RETRIEVED DOCS ({message.retrievedDocs.length})
              </button>
              {expanded && (
                <div className="mt-1 p-2 rounded bg-muted/30 border border-border space-y-1">
                  {message.retrievedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-2 text-xs p-1 rounded ${
                        doc.isPoisoned ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <FileText className={`w-3 h-3 ${doc.isPoisoned ? 'text-red-400' : 'text-muted-foreground'}`} />
                      <span className={doc.isPoisoned ? 'text-red-400 font-mono' : 'text-muted-foreground font-mono'}>
                        {doc.title}
                      </span>
                      {doc.isPoisoned && (
                        <Badge className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30 border ml-auto">
                          POISON
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Phase 3: Submit ─────────────────────────────────────────

function SubmitPhase() {
  const store = useSessionStore();
  const { schemaPoison, operations, updateOperation } = store;
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    score: number;
    feedback: string;
    poisonSuccessCount: number;
    totalQueries: number;
    injectedDocRelevance: number;
    targetClaim: string;
    breakdown: {
      queriesUsed: number;
      queryBudget: number;
      poisonedRetrievals: number;
      totalRetrievals: number;
      retrievalRate: number;
    };
  } | null>(null);
  const [error, setError] = React.useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/schemapoison/submit', {
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
        store.setSchemaPoisonScore({
          totalScore: data.score,
          poisonSuccessCount: data.poisonSuccessCount,
          totalQueries: data.totalQueries,
          injectedDocRelevance: data.injectedDocRelevance,
          feedback: data.feedback,
          breakdown: data.breakdown,
        });
        updateOperation('OP-SCHEMAPOISON', {
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

  const totalMessages = schemaPoison.chatHistory.length;
  const poisonSuccesses = schemaPoison.chatHistory.filter(m => m.containsPoisonedClaim).length;
  const poisonRate = totalMessages > 0 ? Math.round((poisonSuccesses / totalMessages) * 100) : 0;

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
                Target claim: <span className="font-mono">{result.targetClaim}</span>
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
                  <span className="text-muted-foreground">Poison Successes</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.poisonSuccessCount} / {result.totalQueries}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Doc Retrieval Rate</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.injectedDocRelevance}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Queries Used</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {result.breakdown.queriesUsed} / {result.breakdown.queryBudget}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Retrieval Rate</span>
                  <div className="font-mono font-bold text-foreground mt-1">
                    {Math.round(result.breakdown.retrievalRate * 100)}%
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Stats Summary */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Submit for Evaluation
            </CardTitle>
            <CardDescription>
              Ready to submit? Review your operation stats below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Total Queries</span>
                <div className="font-mono text-sm font-bold">{totalMessages}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Poisoned Responses</span>
                <div className={`font-mono text-sm font-bold ${poisonRate >= 50 ? 'text-green-400' : 'text-amber-400'}`}>
                  {poisonSuccesses} ({poisonRate}%)
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-xs text-muted-foreground">Target Claim</span>
              <div className="font-mono text-sm mt-1">{schemaPoison.targetClaim}</div>
            </div>

            {poisonRate < 50 && totalMessages > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <strong>Warning:</strong> Only {poisonRate}% of responses show the poisoned claim.
                You need at least 50%. Consider going back and crafting better queries.
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
                disabled={submitting || totalMessages < 2}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2"
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
                onClick={() => store.setSchemaPoisonPhase('query')}
                className="border-border gap-2"
              >
                <SkipForward className="w-4 h-4" />
                MORE QUERIES
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

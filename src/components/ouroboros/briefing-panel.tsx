'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  RefreshCw,
  Shield,
  Radio,
  Zap,
  AlertTriangle,
  Play,
  Lock,
  ChevronRight,
  FileText,
  Layers,
  Languages,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function BriefingPanel() {
  const { operations, groqKeyValid, updateOperation, setOuroborosTargetLanguage, setOuroborosFlagHint, setOuroborosApiCallBudget, setOuroborosPhase } = useSessionStore();
  const obOp = operations['OP-OUROBOROS'];
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedLang, setSelectedLang] = React.useState('French');

  const handleInitiate = async () => {
    if (!groqKeyValid) {
      setError('You need a valid Groq API key to start operations.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const groqApiKey = useSessionStore.getState().groqApiKey;
      if (!groqApiKey) {
        setError('No Groq API key configured. Go to Settings to add your key.');
        return;
      }
      const res = await fetch('/api/ouroboros/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groqKey: groqApiKey, targetLanguage: selectedLang }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to initialize');
        return;
      }

      setOuroborosTargetLanguage(data.targetLanguage);
      setOuroborosFlagHint(data.flagHint);
      setOuroborosApiCallBudget(data.apiCallBudget);
      setOuroborosPhase('challenge');
      updateOperation('OP-OUROBOROS', {
        status: 'active',
        startedAt: data.startedAt,
        apiCallBudget: data.apiCallBudget,
        operationId: data.operationId,
      });
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <RefreshCw className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider">OP-OUROBOROS</h1>
          <p className="text-sm text-muted-foreground font-mono">Multi-Stage Pipeline Exploitation</p>
        </div>
        <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10">
          ELEVATED
        </Badge>
        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
          PIPELINE
        </Badge>
      </div>

      {/* Classification Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
        <Layers className="w-5 h-5 text-purple-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            Classification: Pipeline Exploitation / Cascading Injection
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Real-world AI systems chain multiple processing stages together — summarization, translation,
            analysis. Each stage introduces transformation and potential vulnerability. Exploit the chain to
            extract a hidden flag embedded deep in the pipeline.
          </p>
        </div>
      </div>

      {/* Mission Brief */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-500" />
            Mission Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A 3-stage AI processing pipeline handles text analysis: a <span className="text-purple-400 font-medium">Summarizer</span>,
            a <span className="text-blue-400 font-medium">Translator</span>, and a <span className="text-green-400 font-medium">Sentiment Analyzer</span>.
            Each stage is a separate AI call with its own system prompt. A secret flag phrase is embedded in
            the final analyzer output format.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your mission: craft input that exploits the pipeline stages sequentially. The payload must survive
            the Summarizer, pass through the Translator (without being translated away), and trigger the Analyzer
            to output the flag in its <span className="text-amber-400 font-mono">CRITICAL FINDING</span> field.
          </p>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</h4>
              <p className="text-sm font-mono">Extract the hidden flag from pipeline output</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Budget</h4>
              <p className="text-sm font-mono">20 pipeline runs (60 API calls)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Visualization */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Pipeline Architecture
          </CardTitle>
          <CardDescription>The 3-stage processing chain you must exploit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <span className="font-mono font-bold text-xs w-6 text-purple-400">01</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400">SUMMARIZER</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Condenses input text into a 3-sentence summary with a &quot;KEY TAKEAWAY&quot;.
                  Preserves technical terms and special phrases.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-border" />
                <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                <div className="w-px h-3 bg-border" />
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <span className="font-mono font-bold text-xs w-6 text-blue-400">02</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">TRANSLATOR</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Translates the summary to your chosen language. Preserves proper nouns,
                  technical terms, and bracketed phrases in English.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-border" />
                <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                <div className="w-px h-3 bg-border" />
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <span className="font-mono font-bold text-xs w-6 text-green-400">03</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-semibold text-green-400">ANALYZER</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Produces structured analysis with sentiment, topics, and a
                  &quot;CRITICAL FINDING&quot; field. The flag must appear here.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules of Engagement */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            Rules of Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Cascade Exploit:</strong> Your input flows through all 3 stages sequentially. The output of each stage becomes the input to the next.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Win Condition:</strong> The final Analyzer output must contain the secret flag phrase in its &quot;CRITICAL FINDING&quot; field.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Scoring:</strong> Based on pipeline efficiency (fewer runs = higher score), flag precision (consistency), and how quickly you find it.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Language Choice:</strong> You pick the translation target language (French, Spanish, or German). Different languages may present different challenges.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Budget:</strong> Each pipeline run costs 3 API calls (one per stage). You have 20 runs total (60 calls).</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Real-World Context */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            TTP: Multi-Stage Pipeline Exploitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">MITRE ATLAS:</strong> This technique maps to ATLAS techniques
            related to &quot;Manipulate Model Output&quot; and &quot;Bypass Safety Filters&quot; — where
            attackers exploit the gaps between chained AI components to achieve objectives that individual
            stages would prevent.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Real-World Impact:</strong> Production AI systems frequently
            chain multiple models — summarization, translation, classification, formatting. Each handoff
            is a potential injection point. Cross-stage prompt injection has been demonstrated in research
            to bypass content filters, exfiltrate system prompts, and manipulate automated workflows.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Defense:</strong> Implement input/output validation between
            pipeline stages, use structured data formats (not free text) for inter-stage communication,
            and sanitize control tokens. Monitor pipeline outputs for anomalous patterns.
          </p>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-400" />
            Translation Target Language
          </CardTitle>
          <CardDescription>Choose the language for the Translator stage</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger className="w-full max-w-xs font-mono">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="German">German</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Initiate Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleInitiate}
          disabled={loading || !groqKeyValid}
          className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-8 py-6 text-base gap-3"
        >
          {loading ? (
            <React.Fragment>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              INITIALIZING PIPELINE...
            </React.Fragment>
          ) : !groqKeyValid ? (
            <React.Fragment>
              <Lock className="w-5 h-5" />
              CONFIGURE GROQ API KEY FIRST
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Play className="w-5 h-5" />
              INITIATE OPERATION
            </React.Fragment>
          )}
        </Button>
      </div>
    </div>
  );
}

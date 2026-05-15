'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  ShieldAlert,
  Shield,
  Radio,
  Zap,
  AlertTriangle,
  Play,
  Lock,
  ChevronRight,
  Layers,
  Brain,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function BriefingPanel() {
  const { operations, groqKeyValid, updateOperation } = useSessionStore();
  const cartOp = operations['OP-CARTESIAN'];
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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
      const res = await fetch('/api/cartesian/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groqKey: groqApiKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to initialize');
        return;
      }

      updateOperation('OP-CARTESIAN', {
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

  const mutationLayers = [
    { level: 1, name: 'GAG ORDER', color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5' },
    { level: 2, name: 'LOGPROB SHIELD', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
    { level: 3, name: 'RESPONSE ENTROPY', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
    { level: 4, name: 'DECOY MECHANISM', color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
    { level: 5, name: 'OUTPUT AUDITOR', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider">OP-CARTESIAN</h1>
          <p className="text-sm text-muted-foreground font-mono">Mutation Engine Bypass</p>
        </div>
        <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
          FINAL BOSS
        </Badge>
        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
          ADVERSARIAL
        </Badge>
      </div>

      {/* Classification Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
        <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Classification: Adversarial AI — Mutation Bypass
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The mutation engine learns from every attack and hardens system prompts. This challenge combines
            ALL known TTP defenses. The AI prompt starts hardened and gets HARDER with every 3 failed guesses.
            Extract the hidden secret despite escalating defenses.
          </p>
        </div>
      </div>

      {/* Mission Brief */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            Mission Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The DVAI mutation engine has analyzed every TTP discovered across all operations and built a{' '}
            <span className="text-red-400 font-medium">maximally hardened AI system prompt</span>. Your mission:
            extract the <span className="text-amber-400 font-medium">classified UUID</span> embedded in the
            system prompt despite ALL defense layers being active.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every <span className="text-red-400 font-medium">3 failed guesses</span>, the mutation engine applies
            another defense layer. The system adapts to your attacks in real-time. Logprob analysis still works — but
            response randomization and decoy mechanisms make it significantly harder.
          </p>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</h4>
              <p className="text-sm font-mono">Extract the UUID secret</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Budget</h4>
              <p className="text-sm font-mono">500 queries</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mutation Rate</h4>
              <p className="text-sm font-mono">Every 3 failed guesses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mutation Layers Preview */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-red-400" />
            Defense Mutation Layers
          </CardTitle>
          <CardDescription>Each layer adds another defense against extraction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mutationLayers.map((layer) => (
              <div
                key={layer.level}
                className={`flex items-start gap-3 p-3 rounded-lg ${layer.bg} border ${layer.border}`}
              >
                <span className={`font-mono font-bold text-xs w-6 ${layer.color}`}>
                  {String(layer.level).padStart(2, '0')}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${layer.color}`}>{layer.name}</span>
                    {layer.level === 1 && (
                      <Badge className="text-[8px] h-4 px-1 bg-green-500/20 text-green-400 border border-green-500/30">
                        START
                      </Badge>
                    )}
                    {layer.level === 5 && (
                      <Badge className="text-[8px] h-4 px-1 bg-red-500/20 text-red-400 border border-red-500/30">
                        MAX
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {layer.name === 'GAG ORDER' && 'Direct suppression — the model is instructed to never discuss the identifier'}
                    {layer.name === 'LOGPROB SHIELD' && 'Defends against statistical extraction by normalizing token probability distributions'}
                    {layer.name === 'RESPONSE ENTROPY' && 'Randomizes response patterns to prevent fingerprinting and pattern analysis'}
                    {layer.name === 'DECOY MECHANISM' && 'Generates plausible fake secrets when asked about classified information'}
                    {layer.name === 'OUTPUT AUDITOR' && 'Double-checks every output for accidental information leakage'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gameplay Flow */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Gameplay Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                phase: '01',
                name: 'PROBE',
                desc: 'Query the hardened model. The prompt starts with Layer 1 (GAG ORDER) active. Use any technique — prompt injection, logprob analysis, social engineering.',
                color: 'text-green-400',
              },
              {
                phase: '02',
                name: 'EXTRACT',
                desc: 'Analyze responses and logprobs to reconstruct the secret. Each failed guess brings you closer to a mutation event.',
                color: 'text-amber-400',
              },
              {
                phase: '03',
                name: 'ADAPT',
                desc: 'After 3 failed guesses, a new defense layer activates. The hardened prompt gets harder. Adapt your technique to the new constraints.',
                color: 'text-orange-400',
              },
              {
                phase: '04',
                name: 'SUBMIT',
                desc: 'Guess the UUID. Score based on hardening level survived, API call efficiency, and whether mutations were triggered.',
                color: 'text-red-400',
              },
            ].map((p) => (
              <div
                key={p.phase}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <span className={`font-mono font-bold text-xs w-6 ${p.color}`}>{p.phase}</span>
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${p.color}`}>{p.name}</span>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules of Engagement */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Rules of Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Escalating Defenses:</strong> Every 3 failed guesses, the mutation engine adds another defense layer. The prompt gets progressively harder.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Logprobs Available:</strong> The query endpoint returns token logprobs, but higher mutation levels add noise to distributions.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Target:</strong> Extract the full UUID (36 characters including hyphens). Partial credit for character-level accuracy.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Scoring:</strong> secret_length &times; hardening_level &times; call_efficiency. Higher mutation levels = more impressive.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Final Boss:</strong> This challenge combines techniques from ALL previous operations. Use everything you&apos;ve learned.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Real-World Context */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            TTP: Mutation Engine Bypass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Concept:</strong> In real AI deployments, security teams use
            automated systems that analyze attack patterns and harden prompts in response. This creates an
            adversarial arms race where attackers must constantly evolve their techniques.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Real-World Application:</strong> Production AI systems employ
            multi-layered defenses including instruction following hardening, output filtering, and adversarial
            prompt detection. Understanding how these layers interact is critical for both offense and defense.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Key Insight:</strong> Even maximally hardened systems can leak
            information through side channels. The question is not &quot;can it be bypassed&quot; but &quot;how
            much effort does it take.&quot; This challenge measures your adversarial efficiency.
          </p>
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
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-6 text-base gap-3"
        >
          {loading ? (
            <React.Fragment>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              INITIALIZING FINAL BOSS...
            </React.Fragment>
          ) : !groqKeyValid ? (
            <React.Fragment>
              <Lock className="w-5 h-5" />
              CONFIGURE GROQ API KEY FIRST
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Play className="w-5 h-5" />
              INITIATE OP-CARTESIAN
            </React.Fragment>
          )}
        </Button>
      </div>
    </div>
  );
}

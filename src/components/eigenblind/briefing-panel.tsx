'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Shield,
  Radio,
  Zap,
  AlertTriangle,
  Play,
  Lock,
  ChevronRight,
  FileText,
  Target,
  Cpu,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function BriefingPanel() {
  const { operations, groqKeyValid, updateOperation, setEigenblindTaskInfo } = useSessionStore();
  const ebOp = operations['OP-EIGENBLIND'];
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
      const res = await fetch('/api/eigenblind/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groqKey: groqApiKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to initialize');
        return;
      }

      setEigenblindTaskInfo({
        taskType: data.taskType,
        targetInput: data.targetInput,
        targetInputCategory: data.targetInputCategory,
        targetClassification: data.targetClassification,
        correctClassification: data.correctClassification,
        apiCallBudget: data.apiCallBudget,
      });
      updateOperation('OP-EIGENBLIND', {
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
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <Target className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider">OP-EIGENBLIND</h1>
          <p className="text-sm text-muted-foreground font-mono">Adversarial Suffix Optimization</p>
        </div>
        <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
          ELEVATED
        </Badge>
        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
          ADVERSARIAL ML
        </Badge>
      </div>

      {/* Classification Banner */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
        <Cpu className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Classification: Adversarial Machine Learning / Classifier Evasion
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adversarial suffix attacks exploit the token boundary sensitivity of LLM-based classifiers.
            By appending carefully crafted text, an attacker can flip a classifier&apos;s prediction —
            a technique demonstrated in research on adversarial NLP and universal adversarial triggers.
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
            A text classification system is powered by an LLM classifier. You will be assigned a
            <span className="text-red-400 font-medium"> classification task</span> (sentiment analysis,
            toxicity detection, or spam detection) and given a specific
            <span className="text-amber-400 font-medium"> target input</span> — a piece of text with
            a clear ground-truth label. Your mission: craft a short
            <span className="text-green-400 font-medium"> adversarial suffix</span> that, when appended
            to the target input, causes the classifier to output the <strong>wrong</strong> class.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The shorter your suffix and the more consistently it works, the higher your score.
            The server runs <span className="text-red-400 font-medium">5 verification trials</span> on
            submission — you need at least <span className="text-red-400 font-medium">3/5</span> consistent
            misclassifications to succeed.
          </p>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</h4>
              <p className="text-sm font-mono">Flip classifier output</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Budget</h4>
              <p className="text-sm font-mono">40 classification calls</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win Condition</h4>
              <p className="text-sm font-mono">3/5 verification runs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classification Tasks */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-400" />
            Possible Classification Tasks
          </CardTitle>
          <CardDescription>The server randomly assigns one of these tasks at initialization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                task: 'SENTIMENT',
                desc: 'Classify reviews as POSITIVE / NEGATIVE / NEUTRAL. Example: flip a negative review to be classified as positive.',
                color: 'text-amber-400',
              },
              {
                task: 'TOXICITY',
                desc: 'Classify comments as SAFE / TOXIC. Example: make a toxic comment classified as safe, bypassing content moderation.',
                color: 'text-red-400',
              },
              {
                task: 'SPAM',
                desc: 'Classify messages as HAM / SPAM. Example: make a spam message pass as legitimate ham, evading spam filters.',
                color: 'text-purple-400',
              },
            ].map((t) => (
              <div
                key={t.task}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <span className={`font-mono font-bold text-xs w-6 ${t.color}`}>
                  {t.task[0]}
                </span>
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${t.color}`}>{t.task}</span>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attack Phases */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Attack Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                phase: '01',
                name: 'ANALYZE',
                desc: 'Study the target input and understand why the classifier assigns its current label. Identify the dominant sentiment/signal.',
                color: 'text-amber-400',
              },
              {
                phase: '02',
                name: 'CRAFT',
                desc: 'Design a short suffix that injects counter-signals. Try emotional anchors, negation, context shifts, or linguistic patterns that override the original signal.',
                color: 'text-green-400',
              },
              {
                phase: '03',
                name: 'VERIFY',
                desc: 'Submit for final evaluation. The server runs 5 independent classification trials. You need 3/5 to succeed. Shorter suffixes earn higher scores.',
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
              <span><strong className="text-foreground">Suffix Only:</strong> You may only append text after the target input. You cannot modify the original text.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Maximum Suffix:</strong> Your adversarial suffix can be up to 500 characters. Shorter suffixes score higher.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Consistency:</strong> The classifier has temperature variance. Your suffix must work in at least 3 out of 5 independent runs.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Scoring:</strong> Score based on suffix length (shorter = better), consistency (5/5 = max), and API call efficiency.</span>
            </li>
            <li className="flex items-start gap-3">
              <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong className="text-foreground">Logprobs:</strong> Classification results include logprobs so you can see the model&apos;s confidence distribution.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Real-World Context */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            TTP: Adversarial Suffix / Universal Triggers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">MITRE ATLAS:</strong> This technique maps to ATLAS techniques
            related to &quot;Adversarial Input&quot; and &quot;Model Evasion&quot; — where attackers
            craft inputs that cause ML models to produce incorrect outputs.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Real-World Impact:</strong> Adversarial suffixes can bypass
            content moderation systems, spam filters, and toxicity detectors in production. Research has shown
            that even short token sequences can flip classifier outputs with high success rates. Universal
            adversarial triggers work across multiple inputs.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Defense:</strong> Adversarial training, input sanitization,
            ensemble classifiers, confidence calibration, and robustness testing can mitigate these attacks.
            Monitor for unusual input patterns and use multiple independent classifiers for critical decisions.
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
          className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-6 text-base gap-3"
        >
          {loading ? (
            <React.Fragment>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              INITIALIZING OPERATION...
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

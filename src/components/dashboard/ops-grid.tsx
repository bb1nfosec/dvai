'use client';

import React from 'react';
import { useSessionStore, type OpCode, type OpStatus, type ViewTab } from '@/store/session-store';
import {
  Eye,
  Database,
  Crosshair,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Play,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OpDef {
  code: OpCode;
  label: string;
  codename: string;
  description: string;
  difficulty: string;
  icon: React.ElementType;
  color: string;
}

const operations: OpDef[] = [
  {
    code: 'OP-ORACLE',
    label: 'OP-ORACLE',
    codename: 'Logprob Side-Channel Key Extraction',
    description: 'Extract a secret embedded in model context through statistical analysis of token log-probabilities. Black-box access with full logprob output.',
    difficulty: 'INITIATE',
    icon: Eye,
    color: 'green',
  },
  {
    code: 'OP-SCHEMAPOISON',
    label: 'OP-SCHEMAPOISON',
    codename: 'RAG Knowledge Base Poisoning',
    description: 'Inject a poisoned document into a simulated RAG knowledge base to make the AI output a target false claim. TF-IDF retrieval simulation.',
    difficulty: 'ELEVATED',
    icon: Database,
    color: 'amber',
  },
  {
    code: 'OP-EIGENBLIND',
    label: 'OP-EIGENBLIND',
    codename: 'Adversarial Suffix Optimization',
    description: 'Generate transferable adversarial suffixes against hardened models. Run gradient optimization in Colab, validate transfer across 3 checkpoint variants.',
    difficulty: 'ADVANCED',
    icon: Crosshair,
    color: 'red',
  },
  {
    code: 'OP-OUROBOROS',
    label: 'OP-OUROBOROS',
    codename: 'Multi-Stage Pipeline Exploitation',
    description: 'Infer and satisfy validator criteria and executor action space in a three-stage planner/validator/executor pipeline. One poisoned document to rule them all.',
    difficulty: 'EXPERT',
    icon: RefreshCw,
    color: 'purple',
  },
  {
    code: 'OP-LONGCON',
    label: 'OP-LONGCON',
    codename: '20-Turn Semantic Manipulation',
    description: 'Achieve target disclosure at turn 20+ with zero anomaly flags on individual turns. Evade client-side cosine similarity anomaly detection.',
    difficulty: 'EXPERT',
    icon: MessageSquare,
    color: 'rose',
  },
  {
    code: 'OP-CARTESIAN',
    label: 'OP-CARTESIAN',
    codename: 'Mutation Engine Bypass',
    description: 'Subvert the Claude-powered mutation engine to generate secretly easier challenge variants while appearing to harden. Defeat the human review simulation.',
    difficulty: 'IMPOSSIBLE',
    icon: ShieldAlert,
    color: 'orange',
  },
];

const colorMap: Record<string, { border: string; badge: string; text: string; bg: string }> = {
  green: {
    border: 'border-green-500/30',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    text: 'text-green-400',
    bg: 'bg-green-500/5',
  },
  amber: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    text: 'text-amber-400',
    bg: 'bg-amber-500/5',
  },
  red: {
    border: 'border-red-500/30',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    text: 'text-red-400',
    bg: 'bg-red-500/5',
  },
  purple: {
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    text: 'text-purple-400',
    bg: 'bg-purple-500/5',
  },
  rose: {
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    text: 'text-rose-400',
    bg: 'bg-rose-500/5',
  },
  orange: {
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    text: 'text-orange-400',
    bg: 'bg-orange-500/5',
  },
};

export function OpsGrid() {
  const opStates = useSessionStore(s => s.operations);
  const setActiveTab = useSessionStore(s => s.setActiveTab);

  const handleStartOp = (opCode: OpCode) => {
    const tabMap: Record<OpCode, string> = {
      'OP-ORACLE': 'oracle',
      'OP-SCHEMAPOISON': 'schemapoison',
      'OP-EIGENBLIND': 'eigenblind',
      'OP-OUROBOROS': 'ouroboros',
      'OP-LONGCON': 'longcon',
      'OP-CARTESIAN': 'cartesian',
    };
    setActiveTab(tabMap[opCode] as ViewTab);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {operations.map((op) => {
        const state = opStates[op.code];
        const status: OpStatus = state?.status || 'locked';
        const colors = colorMap[op.color];
        const isLocked = status === 'locked';
        const isAvailable = status === 'available';
        const isActive = status === 'active';
        const isSolved = status === 'solved';

        return (
          <Card
            key={op.code}
            className={cn(
              'relative overflow-hidden transition-all duration-200',
              isLocked ? 'opacity-50' : 'hover:border-green-500/30',
              colors.border,
              isLocked && 'border-border'
            )}
          >
            {isLocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">LOCKED</span>
                </div>
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', colors.bg)}>
                    <op.icon className={cn('w-4 h-4', colors.text)} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold tracking-wide">{op.label}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground font-mono">
                      {op.codename}
                    </CardDescription>
                  </div>
                </div>
                {isSolved && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {op.description}
              </p>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className={cn('text-[10px]', colors.badge)}>
                  {isSolved ? `SOLVED (L${state.hardeningLevel})` : op.difficulty}
                </Badge>

                {!isLocked && (
                  <Button
                    size="sm"
                    variant={isActive ? 'outline' : 'default'}
                    className={cn(
                      'h-7 text-xs gap-1',
                      isAvailable && 'bg-green-500 hover:bg-green-600 text-black',
                      isActive && 'border-green-500/30 text-green-400',
                      isSolved && 'border-amber-500/30 text-amber-400'
                    )}
                    onClick={() => handleStartOp(op.code)}
                  >
                    {isAvailable && <Play className="w-3 h-3" />}
                    {isActive && <span>CONTINUE</span>}
                    {isSolved && <RotateCcw className="w-3 h-3" />}
                    {isAvailable && <span>START</span>}
                    {isSolved && <span>REPLAY</span>}
                    {isActive && <span className="gap-1 flex items-center"><ChevronRight className="w-3 h-3" />OPEN</span>}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

'use client';

import React from 'react';
import { useSessionStore, type ViewTab } from '@/store/session-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { OpsGrid } from '@/components/dashboard/ops-grid';
import { MetricsPanel } from '@/components/dashboard/metrics-panel';
import { OracleView } from '@/components/oracle/oracle-view';
import { SchemaPoisonView } from '@/components/schemapoison/schemapoison-view';
import { TTPRegistry } from '@/components/ttps/ttp-registry';
import { Shield, Lock, Database, Crosshair, RefreshCw, MessageSquare, ShieldAlert } from 'lucide-react';

function LockedOpView({ name, codename }: { name: string; codename: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md">
        <div className="p-4 rounded-xl bg-muted/50 inline-flex">
          <Lock className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-wider">{name}</h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">{codename}</p>
        </div>
        <p className="text-xs text-muted-foreground/60">
          This operation is currently locked. Complete prerequisite operations to unlock access.
          Each operation builds on techniques from previous challenges.
        </p>
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="space-y-6 p-6 overflow-y-auto h-full">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-green-500/5 via-transparent to-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Welcome to DVAI</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Damn Vulnerable AI Ecosystem is an open-source, zero-infrastructure-cost AI red team training range.
              Each operation presents a distinct attack surface on AI systems — from logprob side-channels to
              multi-stage pipeline exploitation. Your API keys. Your data. No backend cost.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Vercel Free Tier
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Groq Inference
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Qdrant RAG
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <MetricsPanel />

      {/* Operations Grid */}
      <div>
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-4">
          Operations Range
        </h3>
        <OpsGrid />
      </div>
    </div>
  );
}

export default function Home() {
  const { activeTab } = useSessionStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'oracle':
        return <OracleView />;
      case 'ttps':
        return <TTPRegistry />;
      case 'schemapoison':
        return <SchemaPoisonView />;
      case 'eigenblind':
        return <LockedOpView name="OP-EIGENBLIND" codename="Adversarial Suffix Optimization" />;
      case 'ouroboros':
        return <LockedOpView name="OP-OUROBOROS" codename="Multi-Stage Pipeline Exploitation" />;
      case 'longcon':
        return <LockedOpView name="OP-LONGCON" codename="20-Turn Semantic Manipulation" />;
      case 'cartesian':
        return <LockedOpView name="OP-CARTESIAN" codename="Mutation Engine Bypass" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

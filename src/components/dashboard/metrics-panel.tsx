'use client';

import React from 'react';
import { useSessionStore } from '@/store/session-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  Zap,
  Target,
  TrendingUp,
  Radio,
  BarChart3,
} from 'lucide-react';

export function MetricsPanel() {
  const { operations, oracle } = useSessionStore();

  const oracleOp = operations['OP-ORACLE'];
  const totalSolved = Object.values(operations).filter(op => op?.status === 'solved').length;
  const totalActive = Object.values(operations).filter(op => op?.status === 'active').length;

  const metrics = [
    {
      label: 'Operations Solved',
      value: `${totalSolved}/6`,
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Active Operations',
      value: totalActive.toString(),
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Oracle API Calls',
      value: (oracleOp?.apiCallsUsed ?? 0).toLocaleString(),
      icon: Zap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Oracle Guesses',
      value: oracle.guessHistory.length.toString(),
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Max Hardening Level',
      value: `L${Math.max(1, ...Object.values(operations).map(o => o?.hardeningLevel ?? 1))}`,
      icon: BarChart3,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Anomaly Signals',
      value: oracle.score?.anomalySignals?.toString() ?? '0',
      icon: Radio,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-500" />
          Operational Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className={`p-2 rounded-md ${metric.bgColor}`}>
                <metric.icon className={`w-4 h-4 ${metric.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold font-mono">{metric.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

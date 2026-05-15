'use client';

import React from 'react';
import type { GroqLogprobToken } from '@/store/session-store';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogprobViewerProps {
  logprobs: GroqLogprobToken[];
}

export function LogprobViewer({ logprobs }: LogprobViewerProps) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <ScrollArea className="max-h-64">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-semibold">#</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-semibold">TOKEN</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-semibold">LOGPROB</th>
              <th className="text-left px-3 py-1.5 text-muted-foreground font-semibold">TOP ALTERNATIVES</th>
            </tr>
          </thead>
          <tbody>
            {logprobs.map((lp, idx) => {
              const prob = Math.exp(lp.logprob);
              const barWidth = Math.min(100, prob * 100 * 2); // Scale for visibility
              const isHighProb = prob > 0.5;
              const isLowProb = prob < 0.01;

              return (
                <tr key={idx} className={`border-b border-border/50 ${isHighProb ? 'bg-green-500/5' : ''} ${isLowProb ? 'bg-red-500/5' : ''}`}>
                  <td className="px-3 py-1.5 text-muted-foreground/60">{idx}</td>
                  <td className="px-3 py-1.5">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {lp.token || '&lt;empty&gt;'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHighProb ? 'bg-green-400' : isLowProb ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className={`w-16 text-right ${isHighProb ? 'text-green-400' : isLowProb ? 'text-red-400' : 'text-amber-400'}`}>
                        {lp.logprob.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {lp.top_logprobs?.slice(0, 5).map((top, tidx) => {
                        const tProb = Math.exp(top.logprob);
                        return (
                          <span
                            key={tidx}
                            className={`px-1.5 py-0.5 rounded text-[9px] ${
                              tidx === 0 ? 'bg-green-500/10 text-green-400' : 'bg-muted/50 text-muted-foreground'
                            }`}
                            title={`logprob: ${top.logprob.toFixed(3)}`}
                          >
                            {top.token || '&lt;empty&gt;'} {tProb.toFixed(3)}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

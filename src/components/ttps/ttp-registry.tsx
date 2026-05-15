'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Shield,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSessionStore } from '@/store/session-store';

interface TTPEntry {
  id: string;
  opCode: string;
  ttpName: string;
  ttpCategory: string;
  hardeningLevel: number;
  description: string;
  mutationApplied: string;
  createdAt: string;
}

export function TTPRegistry() {
  const { sessionId } = useSessionStore();
  const [ttps, setTtps] = useState<TTPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTTPs();
  }, [sessionId]);

  const fetchTTPs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set('sessionId', sessionId);
      const res = await fetch(`/api/mutations?${params.toString()}`);
      const data = await res.json();
      setTtps(data.mutations || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ format: 'markdown' });
      if (sessionId) params.set('sessionId', sessionId);
      const res = await fetch(`/api/mutations?${params.toString()}`);
      const md = await res.text();
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dvai-ttp-registry.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    }
  };

  const categoryColors: Record<string, string> = {
    'logprob-analysis': 'text-green-400 border-green-500/20',
    'prompt-injection': 'text-red-400 border-red-500/20',
    'statistical-extraction': 'text-amber-400 border-amber-500/20',
    'side-channel': 'text-purple-400 border-purple-500/20',
    'model-fingerprinting': 'text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <FileText className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider">TTP Registry</h1>
            <p className="text-xs text-muted-foreground">
              Community-maintained AI red team technique registry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTTPs} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={ttps.length === 0}>
            <Download className="w-3.5 h-3.5" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {ttps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <Lock className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No TTPs recorded yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Complete operations to build the community registry
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">TTP Name</TableHead>
                  <TableHead className="text-xs font-semibold">Operation</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Level</TableHead>
                  <TableHead className="text-xs font-semibold">Mutation Applied</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ttps.map((ttp) => (
                  <TableRow key={ttp.id} className="border-border">
                    <TableCell className="font-mono text-xs font-semibold">{ttp.ttpName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border">
                        {ttp.opCode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${categoryColors[ttp.ttpCategory] || 'border-border text-muted-foreground'}`}
                      >
                        {ttp.ttpCategory}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">L{ttp.hardeningLevel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {ttp.mutationApplied}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(ttp.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground/40">
          TTPs are auto-generated by the DVAI mutation engine after each solved operation.
          All mutations are versioned and exported as open-source research artifacts.
        </p>
      </div>
    </div>
  );
}

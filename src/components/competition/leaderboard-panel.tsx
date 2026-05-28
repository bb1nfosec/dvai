'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useSessionStore, type LeaderboardEntry, type CompetitionFeedEntry, type CompetitionStats } from '@/store/session-store';
import {
  Trophy,
  Medal,
  TrendingUp,
  Users,
  Activity,
  Zap,
  Timer,
  Target,
  RefreshCw,
  Shield,
  Swords,
  ShieldCheck,
} from 'lucide-react';
import { AdminPanel } from './admin-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const POLL_INTERVAL = 15000; // 15 seconds

export function CompetitionView() {
  const {
    sessionId,
    callsign,
    competitionMode,
    setCompetitionMode,
    leaderboard,
    recentScores,
    competitionStats,
    lastLeaderboardFetch,
    setLeaderboard,
  } = useSessionStore();

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetching = useRef(false);

  const [adminOpen, setAdminOpen] = React.useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await fetch('/api/competition/leaderboard?feed=true');
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data);
    } catch {
      // Silently fail - will retry on next poll
    } finally {
      isFetching.current = false;
    }
  }, [setLeaderboard]);

  const sendHeartbeat = useCallback(async () => {
    if (!callsign || !sessionId) return;
    try {
      await fetch('/api/competition/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign, sessionId }),
      });
    } catch {
      // Silently fail
    }
  }, [callsign, sessionId]);

  // Initial fetch + polling
  useEffect(() => {
    if (competitionMode) {
      fetchLeaderboard();
      sendHeartbeat();

      pollingRef.current = setInterval(() => {
        fetchLeaderboard();
        sendHeartbeat();
      }, POLL_INTERVAL);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [competitionMode, fetchLeaderboard, sendHeartbeat]);

  // Manual refresh
  const handleRefresh = () => {
    fetchLeaderboard();
    sendHeartbeat();
  };

  if (!competitionMode) {
    return <CompetitionLobby onEnable={() => setCompetitionMode(true)} />;
  }

  const isLoading = leaderboard.length === 0 && lastLeaderboardFetch === 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Competition Header */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-green-500/5 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Swords className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                BSides Village Competition
                <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                  LIVE
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">
                Compete against other operators in real-time. Solve operations, earn points, and claim the top of the leaderboard.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdminOpen(true)}
              className="gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="CTF Organizer Panel (admin)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </Button>
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCompetitionMode(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Leave
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {competitionStats && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
              <Users className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-lg font-bold font-mono">{competitionStats.activePlayers}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
              <Users className="w-4 h-4 text-green-400" />
              <div>
                <div className="text-lg font-bold font-mono">{competitionStats.totalPlayers}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Players</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
              <Target className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-lg font-bold font-mono">{competitionStats.totalOperationsSolved}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ops Solved</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
              <Activity className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-lg font-bold font-mono">{competitionStats.totalScoresSubmitted}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Scores Submitted</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="xl:col-span-2">
          <LeaderboardTable entries={leaderboard} currentCallsign={callsign} />
        </div>

        {/* Activity Feed */}
        <div>
          <ActivityFeed entries={recentScores} />
        </div>
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}

// ─── Competition Lobby (before joining) ────────────────────────

function CompetitionLobby({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Swords className="w-10 h-10 text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-wider">BSides Village Competition</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Compete against other security researchers in real-time AI red teaming challenges.
            Solve operations, earn points based on efficiency and technique quality, and climb the leaderboard.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <Zap className="w-4 h-4 text-green-400 mx-auto" />
            <div className="text-xs font-semibold">Solve Ops</div>
            <div className="text-[10px] text-muted-foreground">Earn points</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <TrendingUp className="w-4 h-4 text-amber-400 mx-auto" />
            <div className="text-xs font-semibold">Compete</div>
            <div className="text-[10px] text-muted-foreground">Real-time rankings</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <Trophy className="w-4 h-4 text-purple-400 mx-auto" />
            <div className="text-xs font-semibold">Win</div>
            <div className="text-[10px] text-muted-foreground">Top the board</div>
          </div>
        </div>

        <Button
          onClick={onEnable}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8"
        >
          <Swords className="w-4 h-4 mr-2" />
          JOIN COMPETITION
        </Button>

        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" />
            Encrypted scoring
          </span>
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-amber-500" />
            Real-time updates
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3 text-red-500" />
            Anti-cheat protected
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard Table ─────────────────────────────────────────

function LeaderboardTable({
  entries,
  currentCallsign,
}: {
  entries: LeaderboardEntry[];
  currentCallsign: string | null;
}) {
  if (entries.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Medal className="w-12 h-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No scores yet</p>
            <p className="text-xs text-muted-foreground/60">
              Be the first to solve an operation in competition mode!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-amber-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return null;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Leaderboard
        </CardTitle>
        <Badge variant="outline" className="text-[10px] border-border">
          {entries.length} players
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12">Rank</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ops</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Efficiency</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Best</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCurrentPlayer = entry.callsign === currentCallsign;
                return (
                  <tr
                    key={entry.callsign}
                    className={cn(
                      'border-b border-border/50 transition-colors hover:bg-muted/30',
                      isCurrentPlayer && 'bg-amber-500/5'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getRankIcon(entry.rank) || (
                          <span className="text-xs font-mono text-muted-foreground w-4 text-center">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-mono text-sm font-semibold',
                          isCurrentPlayer ? 'text-amber-400' : 'text-foreground'
                        )}>
                          {entry.callsign}
                        </span>
                        {isCurrentPlayer && (
                          <Badge variant="outline" className="text-[9px] h-4 border-amber-500/30 text-amber-400">
                            YOU
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-bold">
                        {entry.totalScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.operationsSolved}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.avgEfficiency.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px] border-border font-mono">
                        {entry.bestOperation}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Activity Feed ─────────────────────────────────────────────

function ActivityFeed({ entries }: { entries: CompetitionFeedEntry[] }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Activity className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 15).map((entry, i) => (
              <div
                key={`${entry.callsign}-${entry.solvedAt}-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold truncate">
                      {entry.callsign}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 border-border font-mono">
                      {entry.opCode}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-green-400 font-mono">
                      +{entry.totalScore.toFixed(0)} pts
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      L{entry.hardeningLevel}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Timer className="w-2.5 h-2.5" />
                      {Math.floor(entry.timeToSolve / 60)}m
                    </span>
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground/50 font-mono">
                  {new Date(entry.solvedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

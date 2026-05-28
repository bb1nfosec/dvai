'use client';

import React from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  Activity,
  Target,
  Star,
  Timer,
  X,
  RotateCcw,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface AdminPlayer {
  callsign: string;
  totalScore: number;
  operationsSolved: number;
  avgEfficiency: number;
  lastActive: string;
  joinedAt: string;
  topScore: number;
}

interface AdminScore {
  callsign: string;
  operationId: string;
  opCode: string;
  totalScore: number;
  efficiencyScore: number;
  anomalySignals: number;
  timeToSolve: number;
  hardeningLevel: number;
  solvedAt: string;
}

interface AdminActiveSession {
  sessionId: string;
  callsign: string;
  lastHeartbeat: string;
  secondsSinceHeartbeat: number;
}

interface AdminStats {
  totalPlayers: number;
  activePlayers: number;
  totalScoresSubmitted: number;
  totalOperationsSolved: number;
}

interface AdminOverview {
  players: AdminPlayer[];
  scores: AdminScore[];
  activeSessions: AdminActiveSession[];
  stats: AdminStats;
  leaderboard: unknown[];
  fetchedAt: string;
}

// ─── Admin Panel Component ─────────────────────────────────

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [adminKey, setAdminKey] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [overview, setOverview] = React.useState<AdminOverview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showKey, setShowKey] = React.useState(false);
  const [resetConfirm, setResetConfirm] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'players' | 'scores' | 'sessions'>('overview');

  const handleLogin = async () => {
    if (!adminKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/competition/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.trim() },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Authentication failed');
      }
      setIsAuthenticated(true);
      // Fetch full overview
      await fetchOverview();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/competition/admin', {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      if (!res.ok) throw new Error('Failed to fetch overview');
      const data = await res.json();
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/competition/reset', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim() },
      });
      if (res.ok) {
        setResetConfirm(false);
        await fetchOverview();
      }
    } catch {
      // Silently fail
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-card p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-bold tracking-wider">CTF Organizer Access</h2>
            <p className="text-sm text-muted-foreground">
              Enter the admin key to access competition management and full visibility.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Admin key"
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-sm font-mono focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                autoFocus
                disabled={loading}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading || !adminKey.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authenticate
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main admin panel
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider">CTF Organizer Panel</h2>
            <p className="text-[10px] text-muted-foreground">
              Full competition visibility &middot; Last updated: {overview?.fetchedAt ? new Date(overview.fetchedAt).toLocaleTimeString() : '...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOverview} className="gap-1.5 text-xs">
            <Timer className="w-3 h-3" /> Refresh
          </Button>
          {resetConfirm ? (
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <span className="text-[10px] text-red-400 font-semibold ml-1">Reset all data?</span>
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 text-[10px] text-red-400 hover:text-red-300 px-2">
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResetConfirm(false)} className="h-6 text-[10px] text-muted-foreground px-2">
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setResetConfirm(true)} className="gap-1.5 text-xs text-red-400 hover:text-red-300">
              <RotateCcw className="w-3 h-3" /> Reset Competition
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {overview?.stats && (
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-xl font-bold font-mono">{overview.stats.totalPlayers}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Players</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Activity className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-xl font-bold font-mono">{overview.stats.activePlayers}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Now</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Target className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xl font-bold font-mono">{overview.stats.totalOperationsSolved}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ops Solved</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Star className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-xl font-bold font-mono">{overview.stats.totalScoresSubmitted}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Scores Submitted</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/20">
        {(['overview', 'players', 'scores', 'sessions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors',
              activeTab === tab
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab}
          </button>
        ))}
        {overview && (
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
            {overview.activeSessions.length} active session{overview.activeSessions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Leaderboard Quick View */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Top Players (Leaderboard)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12">Rank</th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ops</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Eff.</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Score</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.players.map((player, i) => (
                      <tr key={player.callsign} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-sm font-semibold">{player.callsign}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono text-sm font-bold">{player.totalScore.toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono text-xs text-muted-foreground">{player.operationsSolved}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono text-xs text-muted-foreground">{player.avgEfficiency.toFixed(0)}%</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="font-mono text-xs text-muted-foreground">{player.topScore.toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right hidden md:table-cell">
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {new Date(player.joinedAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-green-400" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overview.activeSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground mt-2">No active sessions</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Session ID</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Last Heartbeat</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.activeSessions.map((session) => {
                        const isFresh = session.secondsSinceHeartbeat < 30;
                        return (
                          <tr key={session.sessionId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-sm font-semibold">{session.callsign}</span>
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <span className="font-mono text-[10px] text-muted-foreground">{session.sessionId}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-xs text-muted-foreground font-mono">
                                {new Date(session.lastHeartbeat).toLocaleTimeString()}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Badge variant="outline" className={cn(
                                'text-[9px] h-4',
                                isFresh ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'
                              )}>
                                {isFresh ? 'ACTIVE' : 'STALE'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Recent Scores Feed */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-purple-400" />
                  Recent Score Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overview.scores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Star className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground mt-2">No scores yet</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Operation</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Efficiency</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Time</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.scores.slice(0, 50).map((score, i) => (
                        <tr key={`${score.callsign}-${score.operationId}-${i}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-sm font-semibold">{score.callsign}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-[9px] border-border font-mono">{score.opCode}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-mono text-sm font-bold">{score.totalScore.toFixed(0)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-mono text-xs text-muted-foreground">{score.efficiencyScore}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-right hidden md:table-cell">
                            <span className="text-xs text-muted-foreground font-mono">
                              {score.timeToSolve < 60
                                ? `${score.timeToSolve.toFixed(0)}s`
                                : `${Math.floor(score.timeToSolve / 60)}m`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                              {new Date(score.solvedAt).toLocaleTimeString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'players' && overview && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                All Players ({overview.players.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Callsign</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Score</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ops Solved</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Efficiency</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Score</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Joined</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.players.map((player, i) => (
                    <tr key={player.callsign} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-sm font-semibold">{player.callsign}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-sm font-bold">{player.totalScore.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs text-muted-foreground">{player.operationsSolved}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs text-muted-foreground">{player.avgEfficiency.toFixed(0)}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs text-muted-foreground">{player.topScore.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {new Date(player.joinedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {new Date(player.lastActive).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'scores' && overview && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-purple-400" />
                All Score Submissions ({overview.scores.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Op Code</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Efficiency</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lvl</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Anomalies</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Time</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Solved At</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.scores.map((score, i) => (
                    <tr key={`${score.callsign}-${score.operationId}-${i}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-sm font-semibold">{score.callsign}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[9px] border-border font-mono">{score.opCode}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-sm font-bold">{score.totalScore.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs text-muted-foreground">{score.efficiencyScore}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs text-muted-foreground">L{score.hardeningLevel}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn(
                          'font-mono text-xs',
                          score.anomalySignals > 0 ? 'text-red-400' : 'text-muted-foreground'
                        )}>
                          {score.anomalySignals}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <span className="text-xs text-muted-foreground font-mono">
                          {score.timeToSolve < 60
                            ? `${score.timeToSolve.toFixed(0)}s`
                            : `${Math.floor(score.timeToSolve / 60)}m ${Math.round(score.timeToSolve % 60)}s`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {new Date(score.solvedAt).toLocaleTimeString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sessions' && overview && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                Active Sessions ({overview.activeSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {overview.activeSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground mt-2">No active sessions</p>
                  <p className="text-xs text-muted-foreground/60">Players appear here when they join the competition</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Session ID</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Last Heartbeat</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Age (s)</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.activeSessions.map((session) => {
                      const isFresh = session.secondsSinceHeartbeat < 30;
                      return (
                        <tr key={session.sessionId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-sm font-semibold">{session.callsign}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[10px] text-muted-foreground">{session.sessionId}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(session.lastHeartbeat).toLocaleTimeString()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-mono text-xs text-muted-foreground">
                              {session.secondsSinceHeartbeat}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge variant="outline" className={cn(
                              'text-[9px] h-4',
                              isFresh ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'
                            )}>
                              {isFresh ? 'ACTIVE' : 'STALE'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

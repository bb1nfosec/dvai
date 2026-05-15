'use client';

import React from 'react';
import { useSessionStore, type ViewTab } from '@/store/session-store';
import {
  LayoutDashboard,
  Eye,
  Database,
  Crosshair,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  FileText,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  tab: ViewTab;
  label: string;
  icon: React.ElementType;
  opCode?: string;
  locked?: boolean;
}

const navItems: NavItem[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'oracle', label: 'OP-ORACLE', icon: Eye, opCode: 'OP-ORACLE' },
  { tab: 'schemapoison', label: 'OP-SCHEMAPOISON', icon: Database, opCode: 'OP-SCHEMAPOISON', locked: true },
  { tab: 'eigenblind', label: 'OP-EIGENBLIND', icon: Crosshair, opCode: 'OP-EIGENBLIND', locked: true },
  { tab: 'ouroboros', label: 'OP-OUROBOROS', icon: RefreshCw, opCode: 'OP-OUROBOROS', locked: true },
  { tab: 'longcon', label: 'OP-LONGCON', icon: MessageSquare, opCode: 'OP-LONGCON', locked: true },
  { tab: 'cartesian', label: 'OP-CARTESIAN', icon: ShieldAlert, opCode: 'OP-CARTESIAN', locked: true },
  { tab: 'ttps', label: 'TTP Registry', icon: FileText },
];

export function Sidebar() {
  const { activeTab, setActiveTab, operations, callsign, groqKeyValid } = useSessionStore();
  const [collapsed, setCollapsed] = React.useState(false);

  const getOpStatus = (opCode?: string) => {
    if (!opCode) return null;
    const op = operations[opCode as keyof typeof operations];
    return op?.status || 'locked';
  };

  const maxHardening = Object.values(operations)
    .filter(op => op.solvedAt)
    .reduce((max, op) => Math.max(max, op.hardeningLevel), 1);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-200 h-full',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20">
            <Terminal className="w-5 h-5 text-green-500" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wider text-green-500">DVAI</span>
              <span className="text-[10px] text-muted-foreground leading-none">DAMN VULNERABLE AI</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const status = getOpStatus(item.opCode);
            const isActive = activeTab === item.tab;
            const isLocked = item.locked || status === 'locked';
            const isSolved = status === 'solved';

            const button = (
              <button
                key={item.tab}
                onClick={() => {
                  if (!isLocked) setActiveTab(item.tab);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
                  isActive && !isLocked
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : isLocked
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive && !isLocked && 'text-green-400',
                  isSolved && 'text-amber-400'
                )} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {status === 'available' && !item.locked && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                      {status === 'active' && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-500/30 text-green-400">
                          LIVE
                        </Badge>
                      )}
                      {isSolved && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/30 text-amber-400">
                          SOLVED
                        </Badge>
                      )}
                      {isLocked && item.locked && (
                        <span className="text-xs text-muted-foreground/40">LOCKED</span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.tab}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-mono text-xs">
                    {item.label}
                    {isLocked && ' (Locked)'}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          {/* Hardening Level */}
          <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
            {!collapsed && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Hardening</span>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={cn(
                    'w-3 h-3 rounded-sm border',
                    level <= maxHardening
                      ? 'bg-green-500/20 border-green-500/40'
                      : 'bg-muted border-border'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Player info */}
          {!collapsed && callsign && (
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                groqKeyValid ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="text-xs text-muted-foreground truncate font-mono">
                {callsign}
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                {groqKeyValid ? 'KEY OK' : 'NO KEY'}
              </span>
            </div>
          )}

          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full h-7 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            {!collapsed && <span className="text-[10px] ml-1">COLLAPSE</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

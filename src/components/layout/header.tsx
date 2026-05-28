'use client';

import React, { useState } from 'react';
import { useSessionStore } from '@/store/session-store';
import {
  Shield,
  Key,
  Settings,
  Swords,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Header() {
  const { callsign, groqKeyValid, sessionId, isInitialized, competitionMode } = useSessionStore();

  if (!isInitialized) {
    return <SessionSetupDialog />;
  }

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="font-mono text-sm text-muted-foreground">
            AI RED TEAM RANGE
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <Badge variant="outline" className="font-mono text-xs border-green-500/30 text-green-400">
          {callsign}
        </Badge>
        {competitionMode && (
          <>
            <div className="h-4 w-px bg-border" />
            <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-400 flex items-center gap-1">
              <Swords className="w-3 h-3" />
              COMPETITION
            </Badge>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Key className="w-3.5 h-3.5" />
          <span>Groq API:</span>
          <span className={groqKeyValid ? 'text-green-400' : 'text-red-400'}>
            {groqKeyValid ? 'ACTIVE' : 'NOT CONFIGURED'}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <SettingsDialog />
      </div>
    </header>
  );
}

function SessionSetupDialog() {
  const { setSession, setGroqApiKey, completeSetup } = useSessionStore();
  const [inputCallsign, setInputCallsign] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'callsign' | 'apikey'>('callsign');

  const handleCreateSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign: inputCallsign }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create session');
        return;
      }
      // Set session data but DON'T complete setup yet (need API key next)
      setSession(data.id, data.callsign);
      setStep('apikey');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetApiKey = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groqKey: inputKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid API key');
        return;
      }
      setGroqApiKey(inputKey);
      useSessionStore.getState().setGroqKeyValid(true);
      completeSetup();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    completeSetup();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
            <Shield className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-green-500 mb-1">DVAI</h1>
          <p className="text-sm text-muted-foreground">Damn Vulnerable AI Ecosystem</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Open-Source AI Red Team Training Range</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {step === 'callsign' ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Choose your callsign</Label>
                <Input
                  placeholder="e.g. spectre, ghost, phantom..."
                  value={inputCallsign}
                  onChange={(e) => setInputCallsign(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                  className="font-mono"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button
                onClick={handleCreateSession}
                disabled={inputCallsign.length < 2 || loading}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
              >
                {loading ? 'INITIALIZING...' : 'ENTER THE RANGE'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Configure Groq API Key
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  Operations route through your own Groq API key. Get one free at console.groq.com
                </p>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                  className="font-mono"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button
                onClick={handleSetApiKey}
                disabled={inputKey.length < 10 || loading}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
              >
                {loading ? 'VALIDATING...' : 'ACTIVATE KEY'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-muted-foreground text-xs"
              >
                Skip for now (limited functionality)
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          Zero infrastructure cost. Your API keys. Your data. Open source.
        </p>
      </div>
    </div>
  );
}

function SettingsDialog() {
  const { groqKeyValid, setGroqKeyValid, setGroqApiKey } = useSessionStore();
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateKey = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groqKey: inputKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid key');
        return;
      }
      setGroqApiKey(inputKey);
      setGroqKeyValid(true);
      setInputKey('');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Session Settings</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage your API keys and session configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Groq API Key</Label>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${groqKeyValid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {groqKeyValid ? 'Active' : 'Not configured'}
              </span>
            </div>
            <Input
              type="password"
              placeholder="gsk_..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button
            onClick={handleUpdateKey}
            disabled={inputKey.length < 10 || loading}
            size="sm"
            className="w-full"
          >
            {loading ? 'Validating...' : 'Update Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

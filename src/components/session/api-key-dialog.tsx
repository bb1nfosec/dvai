"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionStore } from "@/store/session-store";
import { Key, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export function ApiKeyDialog() {
  const { sessionId, setGroqKeyValid, setGroqApiKey } = useSessionStore();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);

  const validateAndSave = async () => {
    if (!key.trim() || !sessionId) return;
    setValidating(true);

    try {
      const res = await fetch("/api/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, groqKey: key.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setGroqApiKey(key.trim());
        setGroqKeyValid(true);
        toast.success("API key validated and saved");
        setOpen(false);
        setKey("");
      } else {
        toast.error(data.error || "Invalid API key");
      }
    } catch {
      toast.error("Failed to validate API key");
    } finally {
      setValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-mono gap-1.5">
          <Key className="h-3 w-3" />
          CONFIGURE API KEY
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">CONFIGURE GROQ API KEY</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">
              GROQ API KEY
            </Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="gsk_..."
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              Your key is stored locally and used to query the Groq API on your behalf.
              Get a free key at{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                console.groq.com
              </a>
            </p>
          </div>

          {!sessionId && (
            <p className="text-[10px] font-mono text-destructive">
              ⚠ Create a session first (enter a callsign).
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={validateAndSave}
              disabled={!key.trim() || !sessionId || validating}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs"
            >
              {validating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  VALIDATING...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  VALIDATE & SAVE
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="font-mono text-xs"
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

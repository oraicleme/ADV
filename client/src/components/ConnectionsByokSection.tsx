/**
 * STORY-172: BYOK — LLM API key form under Workspace Settings → Connections.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import {
  getEnvLlmApiKey,
  getUserStoredLlmApiKey,
  setUserLlmApiKey,
  LLM_API_KEY_CHANGED_EVENT,
} from '@/lib/llm-api-key-storage';

export default function ConnectionsByokSection() {
  const [draft, setDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasEnv, setHasEnv] = useState(false);

  const sync = useCallback(() => {
    setHasSaved(!!getUserStoredLlmApiKey());
    setHasEnv(!!getEnvLlmApiKey());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(LLM_API_KEY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(LLM_API_KEY_CHANGED_EVENT, sync);
  }, [sync]);

  const handleSave = () => {
    const t = draft.trim();
    if (!t) return;
    setUserLlmApiKey(t);
    setDraft('');
    sync();
  };

  const handleClear = () => {
    setUserLlmApiKey(null);
    setDraft('');
    sync();
  };

  let status: string;
  if (hasSaved) {
    status = 'Using saved key in this browser (overrides environment).';
  } else if (hasEnv) {
    status = 'Using key from environment (e.g. VITE_IONET_API_KEY). Paste below to override.';
  } else {
    status = 'No key — paste an API key below or set VITE_IONET_API_KEY in .env.local.';
  }

  return (
    <div className="space-y-3 pt-2" data-testid="connections-byok-section">
      <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/20 px-2.5 py-2">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/90" aria-hidden />
        <p className="text-[11px] leading-snug text-muted-foreground">{status}</p>
      </div>

      <div className="relative">
        <Input
          type={showKey ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste API key (io.net or compatible)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9 pr-10 font-mono text-[11px]"
          data-testid="connections-byok-input"
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={showKey ? 'Hide key' : 'Show key'}
        >
          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={!draft.trim()}
          data-testid="connections-byok-save"
        >
          Save key
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleClear}
          disabled={!hasSaved}
          data-testid="connections-byok-clear"
        >
          Clear saved key
        </Button>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground/90">
        Stored only in this browser&apos;s localStorage. Anyone with access to this profile can read it — avoid on shared devices.
        Oraicle agent rules stay in app code; this key only authenticates API calls.
      </p>
    </div>
  );
}

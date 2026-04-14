/**
 * STORY-175: Workspace Settings → Agent — creative brief (persisted, additive to system prompts).
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AGENT_BRIEF_CHANGED_EVENT,
  MAX_AGENT_BRIEF_CHARS,
  readAgentBrief,
  setAgentBrief,
} from '@/lib/agent-brief-storage';
import { Bot } from 'lucide-react';

export default function AgentBriefSection() {
  const [draft, setDraft] = useState('');
  /** Last persisted value — for dirty detection. */
  const [baseline, setBaseline] = useState('');

  const sync = useCallback(() => {
    const s = readAgentBrief();
    setDraft(s);
    setBaseline(s);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(AGENT_BRIEF_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AGENT_BRIEF_CHANGED_EVENT, sync);
  }, [sync]);

  const handleSave = () => {
    setAgentBrief(draft);
    sync();
  };

  const handleClear = () => {
    setAgentBrief(null);
    sync();
  };

  const atLimit = draft.length >= MAX_AGENT_BRIEF_CHARS;
  const hasSaved = baseline.length > 0;
  const dirty = draft !== baseline;

  return (
    <div className="space-y-3 pt-2" data-testid="agent-brief-section">
      <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/20 px-2.5 py-2">
        <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/90" aria-hidden />
        <p className="text-[11px] leading-snug text-muted-foreground">
          {hasSaved
            ? 'Saved brief is merged into agent context on each message (additive only).'
            : 'Optional: persistent instructions for tone, brand voice, or market — they do not replace Oraicle safety rules.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_AGENT_BRIEF_CHARS))}
          placeholder="e.g. Always use informal Serbian; avoid ALL CAPS; prefer Hoco branding when mentioned."
          className="min-h-[100px] resize-y text-[11px] leading-relaxed"
          data-testid="agent-brief-textarea"
          spellCheck
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{draft.length} / {MAX_AGENT_BRIEF_CHARS}</span>
          {atLimit ? <span className="text-amber-600 dark:text-amber-500">Character limit reached</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={!dirty}
          data-testid="agent-brief-save"
        >
          Save brief
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleClear}
          disabled={!hasSaved && !draft.trim()}
          data-testid="agent-brief-clear"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

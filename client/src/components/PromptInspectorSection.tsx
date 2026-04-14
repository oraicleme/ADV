/**
 * STORY-183: Read-only merged system prompts for power users (copy to external tools).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AGENT_MAIN_CHAT_SYSTEM_PROMPT,
  PROACTIVE_SUGGESTION_SYSTEM_PROMPT,
} from '@/lib/agent-chat-engine';
import {
  AGENT_BRIEF_CHANGED_EVENT,
  mergeAgentBriefIntoSystemPrompt,
  readAgentBrief,
} from '@/lib/agent-brief-storage';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);
  return (
    <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={handle}>
      {done ? 'Copied' : label}
    </Button>
  );
}

export default function PromptInspectorSection() {
  const [brief, setBrief] = useState(() => readAgentBrief());
  useEffect(() => {
    const sync = () => setBrief(readAgentBrief());
    window.addEventListener(AGENT_BRIEF_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AGENT_BRIEF_CHANGED_EVENT, sync);
  }, []);

  const mainMerged = useMemo(
    () => mergeAgentBriefIntoSystemPrompt(AGENT_MAIN_CHAT_SYSTEM_PROMPT, brief || undefined),
    [brief],
  );
  const proactiveMerged = useMemo(
    () => mergeAgentBriefIntoSystemPrompt(PROACTIVE_SUGGESTION_SYSTEM_PROMPT, brief || undefined),
    [brief],
  );

  return (
    <div className="space-y-4 pt-2" data-testid="prompt-inspector-section">
      <p className="text-[11px] leading-snug text-muted-foreground">
        These are the system instructions Oraicle sends to io.net for the main chat and for proactive
        suggestions, including your workspace brief when set. Copy them into another AI or editor if you
        want to experiment outside the app.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-foreground">Main chat (merged)</span>
          <CopyButton text={mainMerged} label="Copy" />
        </div>
        <pre className="max-h-[220px] overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-snug text-muted-foreground whitespace-pre-wrap break-words">
          {mainMerged}
        </pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-foreground">Proactive suggestions (merged)</span>
          <CopyButton text={proactiveMerged} label="Copy" />
        </div>
        <pre className="max-h-[160px] overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-snug text-muted-foreground whitespace-pre-wrap break-words">
          {proactiveMerged}
        </pre>
      </div>
    </div>
  );
}

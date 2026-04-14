/**
 * STORY-98: AI Agent Chat Panel — Industry-Standard Redesign
 * STORY-62: Original AI Agent Chat Panel (Phase 1)
 * STORY-63: Contrast fix — fixed dark panel theme
 *
 * ChatGPT-style chat UI: large centered prompt box on empty state,
 * suggestion chips, auto-growing textarea, full-height layout.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw, Lightbulb, Check, X, ArrowUp, Volume2, VolumeX } from 'lucide-react';
import type { ConversationMessage, ChatModelMode } from '../lib/agent-chat-engine';
import type { AgentAction } from '../lib/agent-actions';

const DEFAULT_QUICK_PROMPTS = [
  'Dark background with SALE badge',
  'Professional look, minimal style',
  'Add prices with discounts',
  'Bright colors, holiday theme',
];

export interface AgentChatStarterPrompt {
  label: string;
  text: string;
}

export interface AgentChatPanelProps {
  messages: ConversationMessage[];
  onSend: (message: string) => Promise<void>;
  pending: boolean;
  error: string | null;
  model: ChatModelMode;
  onModelChange: (v: ChatModelMode) => void;
  onUndo: () => void;
  canUndo: boolean;
  suggestionsEnabled?: boolean;
  onSuggestionsToggle?: (enabled: boolean) => void;
  /** STORY-169: proactive API muted for this session only (chat still works). */
  proactiveSessionMuted?: boolean;
  onProactiveSessionMuteToggle?: () => void;
  onApplySuggestion?: (timestamp: number, actions: AgentAction[]) => void;
  onDismissSuggestion?: (timestamp: number) => void;
  /** STORY-189: optional intent starters (search / design / full ad); when set, replaces default chips. */
  starterPrompts?: AgentChatStarterPrompt[];
  /** @deprecated Panel now uses a fixed dark theme — this prop is ignored. */
  textColor?: string;
}

export default function AgentChatPanel({
  messages,
  onSend,
  pending,
  error,
  model,
  onModelChange,
  onUndo,
  canUndo,
  suggestionsEnabled = true,
  onSuggestionsToggle,
  proactiveSessionMuted = false,
  onProactiveSessionMuteToggle,
  onApplySuggestion,
  onDismissSuggestion,
  starterPrompts,
}: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0 && !pending;

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pending]);

  const resetTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resetTextareaHeight();
  }, [input, resetTextareaHeight]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || pending) return;
      setInput('');
      await onSend(trimmed);
      textareaRef.current?.focus();
    },
    [input, pending, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChipClick = useCallback((prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  }, []);

  const emptyStateChips = starterPrompts ?? DEFAULT_QUICK_PROMPTS.map((p) => ({ label: p, text: p }));

  /* ─── Header bar (always visible) ──────────────────────────────────── */
  const headerBar = (
    <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-orange-400" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          AI Design Assistant
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onSuggestionsToggle !== undefined && (
          <button
            type="button"
            onClick={() => onSuggestionsToggle(!suggestionsEnabled)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
              suggestionsEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-400'
            }`}
            title={suggestionsEnabled ? 'Suggestions on' : 'Suggestions off'}
            aria-pressed={suggestionsEnabled}
            data-testid="chat-suggestions-toggle"
          >
            <Lightbulb className="h-3 w-3" aria-hidden />
            Suggestions
          </button>
        )}
        {suggestionsEnabled && onProactiveSessionMuteToggle !== undefined && (
          <button
            type="button"
            onClick={onProactiveSessionMuteToggle}
            className={`rounded-md p-1.5 transition ${
              proactiveSessionMuted
                ? 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={
              proactiveSessionMuted
                ? 'Resume proactive tips (this session)'
                : 'Mute proactive tips until you refresh the page or click resume'
            }
            aria-pressed={proactiveSessionMuted}
            data-testid="chat-proactive-session-mute"
            aria-label={
              proactiveSessionMuted ? 'Resume proactive suggestions for this session' : 'Mute proactive suggestions for this session'
            }
          >
            {proactiveSessionMuted ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        )}
        <div className="flex overflow-hidden rounded-lg bg-slate-800 p-0.5" role="group" aria-label="AI model selection">
          <button
            type="button"
            onClick={() => onModelChange('fast')}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
              model === 'fast' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-pressed={model === 'fast'}
            data-testid="chat-model-fast"
          >
            Fast
          </button>
          <button
            type="button"
            onClick={() => onModelChange('smart')}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
              model === 'smart' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-pressed={model === 'smart'}
            data-testid="chat-model-smart"
          >
            Smart
          </button>
          <button
            type="button"
            onClick={() => onModelChange('custom')}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
              model === 'custom' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-pressed={model === 'custom'}
            title="Uses primary/fallback from Settings → Models"
            data-testid="chat-model-custom"
          >
            Custom
          </button>
        </div>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
          title="Undo last AI change"
          aria-label="Undo last AI change"
          data-testid="chat-undo-button"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );

  /* ─── Prompt box (ChatGPT-style: textarea + send inside a container) ── */
  const promptBox = (docked: boolean) => (
    <div className={docked ? 'border-t border-slate-700/60 bg-slate-900/80 px-3 py-3' : ''}>
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border border-slate-600/80 bg-slate-800 shadow-lg transition-colors focus-within:border-orange-500/60"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your ad design..."
          disabled={pending}
          maxLength={500}
          rows={docked ? 1 : 3}
          className="block w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
          style={{ minHeight: docked ? '48px' : '96px', maxHeight: '200px' }}
          data-testid="chat-input"
          aria-label="Chat message"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-400 disabled:bg-slate-600 disabled:text-slate-400"
            data-testid="chat-send-button"
            aria-label="Send message"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </form>
    </div>
  );

  /* ─── Empty state (hero layout — big prompt box is the star) ────────── */
  if (isEmpty) {
    return (
      <div className="flex h-full flex-col bg-slate-900" data-testid="agent-chat-panel">
        {headerBar}
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div className="w-full max-w-lg">
            {promptBox(false)}
          </div>

          {/* Suggestion chips below the box (STORY-189: intent starters when provided) */}
          <div
            className="mt-4 grid w-full max-w-lg grid-cols-2 gap-2"
            data-testid="chat-starter-prompts"
            aria-label="Suggested prompts"
          >
            {emptyStateChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.text)}
                title={chip.text}
                className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 text-left text-xs text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
                data-testid="chat-starter-chip"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mx-3 mb-3 rounded-lg bg-red-950/60 px-3 py-2 text-center text-xs text-red-400" data-testid="chat-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ─── Active chat state (messages + docked input) ──────────────────── */
  return (
    <div className="flex h-full flex-col bg-slate-900" data-testid="agent-chat-panel">
      {headerBar}

      {/* Message history */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
        data-testid="chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Chat history"
      >
        {messages.map((msg) => (
          <div key={msg.timestamp} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-orange-500 text-white'
                  : msg.isSuggestion
                    ? 'rounded-bl-sm border border-amber-500/40 bg-slate-800 text-slate-100'
                    : 'rounded-bl-sm bg-slate-700/80 text-slate-100'
              }`}
              data-testid={
                msg.role === 'user'
                  ? 'chat-user-bubble'
                  : msg.isSuggestion
                    ? 'chat-suggestion-bubble'
                    : 'chat-agent-bubble'
              }
            >
              {msg.content}
              {msg.role === 'assistant' && msg.actions !== undefined && msg.actions.length > 0 && !msg.isSuggestion && (
                <span className="mt-1 block text-xs text-slate-400">
                  {msg.actions.length} change{msg.actions.length !== 1 ? 's' : ''} applied
                </span>
              )}
              {/* A-2: surface catalog_filter debug reasons (0-candidate BM25 or empty LLM result) */}
              {msg.role === 'assistant' && !msg.isSuggestion && msg.actions && (
                <>
                  {msg.actions
                    .filter(
                      (a): boolean =>
                        a.type === 'catalog_filter' &&
                        !!(a.payload as Record<string, unknown>)?._debugReason,
                    )
                    .map((a, i) => (
                      <span
                        key={i}
                        className="mt-1 block text-xs italic text-amber-400/70"
                        data-testid="chat-debug-reason"
                      >
                        {(a.payload as Record<string, unknown>)._debugReason as string}
                      </span>
                    ))}
                </>
              )}
              {msg.role === 'assistant' && msg.isSuggestion && onDismissSuggestion && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {onApplySuggestion && (msg.actions?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(msg.timestamp, msg.actions ?? [])}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-500/80 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-500"
                      data-testid="suggestion-apply"
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      Apply
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDismissSuggestion(msg.timestamp)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-600 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-500"
                    data-testid="suggestion-dismiss"
                  >
                    <X className="h-3 w-3" aria-hidden />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-700/80 px-4 py-3" aria-label="AI is thinking">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-950/60 px-3 py-2 text-center text-xs text-red-400" data-testid="chat-error" role="alert">
            {error}
          </p>
        )}

        <div ref={messagesEndRef} aria-hidden />
      </div>

      {promptBox(true)}
    </div>
  );
}

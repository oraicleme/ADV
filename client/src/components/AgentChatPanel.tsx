/**
 * STORY-62: AI Agent Chat Panel (Phase 1)
 * STORY-63: Contrast fix — fixed dark panel theme
 *
 * Chat UI for the conversational ad design assistant.
 * Uses a fixed dark slate background so it is always readable regardless of
 * the canvas background color (white, dark, colorful — all work).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw, Send, Lightbulb, Check, X } from 'lucide-react';
import type { ConversationMessage, ChatModelMode } from '../lib/agent-chat-engine';
import type { AgentAction } from '../lib/agent-actions';

export interface AgentChatPanelProps {
  messages: ConversationMessage[];
  onSend: (message: string) => Promise<void>;
  pending: boolean;
  error: string | null;
  model: ChatModelMode;
  onModelChange: (v: ChatModelMode) => void;
  onUndo: () => void;
  canUndo: boolean;
  /** STORY-62 Phase 2: proactive suggestions on/off. */
  suggestionsEnabled?: boolean;
  onSuggestionsToggle?: (enabled: boolean) => void;
  /** Apply suggestion: run actions and remove the suggestion message. */
  onApplySuggestion?: (timestamp: number, actions: AgentAction[]) => void;
  /** Dismiss suggestion: remove the suggestion message. */
  onDismissSuggestion?: (timestamp: number) => void;
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
  onApplySuggestion,
  onDismissSuggestion,
}: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages update or pending state changes
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pending]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || pending) return;
      setInput('');
      await onSend(trimmed);
      inputRef.current?.focus();
    },
    [input, pending, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit],
  );

  return (
    <div
      className="mt-3 flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
      style={{ maxHeight: '340px', minHeight: '200px' }}
      data-testid="agent-chat-panel"
    >
      {/* Header row: title + model toggle + undo */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-700/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
            AI Design Assistant
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Suggestions on/off (Phase 2) */}
          {onSuggestionsToggle !== undefined && (
            <button
              type="button"
              onClick={() => onSuggestionsToggle(!suggestionsEnabled)}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                suggestionsEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-400'
              }`}
              title={suggestionsEnabled ? 'Suggestions on — turn off' : 'Suggestions off — turn on'}
              aria-pressed={suggestionsEnabled}
              data-testid="chat-suggestions-toggle"
            >
              <Lightbulb className="h-3 w-3" aria-hidden />
              Suggestions
            </button>
          )}
          {/* Model toggle */}
          <div
            className="flex overflow-hidden rounded-md bg-slate-800 p-0.5"
            role="group"
            aria-label="AI model selection"
          >
            <button
              type="button"
              onClick={() => onModelChange('fast')}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                model === 'fast'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-pressed={model === 'fast'}
              title="Fast model — quick, basic changes"
              data-testid="chat-model-fast"
            >
              Fast
            </button>
            <button
              type="button"
              onClick={() => onModelChange('smart')}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                model === 'smart'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-pressed={model === 'smart'}
              title="Smart model — holistic design decisions (default)"
              data-testid="chat-model-smart"
            >
              Smart
            </button>
          </div>

          {/* Undo last AI change */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded p-1 text-slate-400 transition hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo last AI change"
            aria-label="Undo last AI change"
            data-testid="chat-undo-button"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Message history */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
        data-testid="chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Chat history"
      >
        {messages.length === 0 && !pending && (
          <p className="py-4 text-center text-xs text-slate-400">
            Describe what you want — the AI will design your ad.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.timestamp}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-orange-500 text-white'
                  : msg.isSuggestion
                    ? 'rounded-bl-sm border border-amber-500/40 bg-slate-800 text-slate-100'
                    : 'rounded-bl-sm bg-slate-700 text-slate-100'
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
              {msg.role === 'assistant' &&
                msg.actions !== undefined &&
                msg.actions.length > 0 &&
                !msg.isSuggestion && (
                  <span className="mt-1 block text-[10px] text-slate-400">
                    {msg.actions.length} change{msg.actions.length !== 1 ? 's' : ''} applied
                  </span>
                )}
              {msg.role === 'assistant' && msg.isSuggestion && onApplySuggestion && onDismissSuggestion && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onApplySuggestion(msg.timestamp, msg.actions ?? [])}
                    className="inline-flex items-center gap-1 rounded bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-500"
                    data-testid="suggestion-apply"
                  >
                    <Check className="h-2.5 w-2.5" aria-hidden />
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissSuggestion(msg.timestamp)}
                    className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-slate-500"
                    data-testid="suggestion-dismiss"
                  >
                    <X className="h-2.5 w-2.5" aria-hidden />
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {pending && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm bg-slate-700 px-3 py-2"
              aria-label="AI is thinking"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-hidden />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="rounded-lg bg-red-950/60 px-2 py-1.5 text-center text-[10px] text-red-400" data-testid="chat-error" role="alert">
            {error}
          </p>
        )}

        <div ref={messagesEndRef} aria-hidden />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-slate-700/80 bg-slate-900/50 p-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "Dark background, add SALE badge, 3 columns"'
          disabled={pending}
          maxLength={500}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500/70 focus:outline-none disabled:opacity-50"
          data-testid="chat-input"
          aria-label="Chat message"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-orange-400 disabled:opacity-40"
          data-testid="chat-send-button"
          aria-label="Send message"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </form>
    </div>
  );
}

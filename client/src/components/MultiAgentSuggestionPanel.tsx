/**
 * Multi-Agent Suggestion Panel
 * Displays suggestions from multiple specialized agents with apply/dismiss actions
 */

import React, { useState } from 'react';
import { Sparkles, Check, X, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import type { MultiAgentSuggestion, MultiAgentSuggestionResult } from '../lib/multi-agent-suggestions';
import type { AgentAction } from '../lib/agent-actions';

interface MultiAgentSuggestionPanelProps {
  result: MultiAgentSuggestionResult | null;
  isLoading: boolean;
  error: string | null;
  onApplySuggestion: (suggestion: MultiAgentSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

export default function MultiAgentSuggestionPanel({
  result,
  isLoading,
  error,
  onApplySuggestion,
  onDismissSuggestion,
}: MultiAgentSuggestionPanelProps) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  if (!result && !isLoading && !error) {
    return null;
  }

  const handleApply = (suggestion: MultiAgentSuggestion) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions((prev) => new Set(prev).add(suggestion.id));
  };

  const handleDismiss = (suggestionId: string) => {
    onDismissSuggestion(suggestionId);
  };

  return (
    <div className="mt-3 rounded-xl border border-blue-700/50 bg-blue-900/20 p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
            Multi-Agent Suggestions
          </span>
        </div>
        {result && (
          <span className="text-[9px] text-blue-300/70">
            {result.executionPlan.agentsUsed.length} agents • {result.totalExecutionTime}ms
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          <span className="text-xs text-blue-300">Analyzing with multiple agents...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded bg-red-500/10 p-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggestions list */}
      {result && result.suggestions.length > 0 && (
        <div className="space-y-2">
          {/* Impact summary */}
          <div className="text-[10px] text-blue-300/80">
            Estimated Impact: <span className="font-semibold">{result.estimatedImpact}</span>
          </div>

          {/* Individual suggestions */}
          {result.suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-lg border border-blue-600/30 bg-blue-800/20 p-2"
            >
              {/* Suggestion header */}
              <div className="mb-1 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-blue-300">{suggestion.title}</span>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        suggestion.impact === 'high'
                          ? 'bg-red-500/30 text-red-300'
                          : suggestion.impact === 'medium'
                            ? 'bg-yellow-500/30 text-yellow-300'
                            : 'bg-gray-500/30 text-gray-300'
                      }`}
                    >
                      {suggestion.impact.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-blue-300/70">{suggestion.description}</p>
                </div>
              </div>

              {/* Agent info */}
              <div className="mb-1 text-[9px] text-blue-300/60">
                <span className="font-mono">{suggestion.agent}</span>
                {' • '}
                <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
              </div>

              {/* Reasoning */}
              {suggestion.reasoning && (
                <div className="mb-1 rounded bg-blue-900/30 p-1.5 text-[9px] text-blue-300/80">
                  <strong>Reasoning:</strong> {suggestion.reasoning}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApply(suggestion)}
                  disabled={appliedSuggestions.has(suggestion.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: appliedSuggestions.has(suggestion.id)
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)',
                    color: appliedSuggestions.has(suggestion.id) ? '#22c55e' : '#3b82f6',
                  }}
                >
                  {appliedSuggestions.has(suggestion.id) ? (
                    <>
                      <Check className="h-3 w-3" />
                      Applied
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Apply
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDismiss(suggestion.id)}
                  disabled={appliedSuggestions.has(suggestion.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgba(107, 114, 128, 0.2)',
                    color: '#9ca3af',
                  }}
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {result && result.suggestions.length === 0 && !isLoading && (
        <div className="py-2 text-center text-[10px] text-blue-300/60">
          No suggestions at this time. Your ad looks great!
        </div>
      )}
    </div>
  );
}

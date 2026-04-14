/**
 * STORY-183: Pick primary/fallback io.net models from the live API list; recommended labels from app defaults.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CHAT_MODEL_PAIR_BY_MODE } from '@/lib/agent-chat-engine';
import { formatLlmCallErrorReport } from '@/lib/llm-call-error';
import { listModels, type IonetModel } from '@/lib/ionet-client';
import { getAdCopyModels, getVisionModels } from '@/lib/ionet-models';
import {
  getResolvedLlmApiKey,
  LLM_API_KEY_CHANGED_EVENT,
} from '@/lib/llm-api-key-storage';
import {
  readIonetChatModelPrefs,
  writeIonetChatModelPrefs,
  resetIonetChatModelPrefsToDefaults,
  IONET_MODEL_PREFS_CHANGED_EVENT,
} from '@/lib/ionet-model-preferences-storage';

function tagForModelId(id: string): string | null {
  const lower = id.toLowerCase();
  const f = CHAT_MODEL_PAIR_BY_MODE.fast;
  const s = CHAT_MODEL_PAIR_BY_MODE.smart;
  const ad = getAdCopyModels();
  const vis = getVisionModels();
  if ([f.primary, f.fallback].some((x) => x.toLowerCase() === lower)) return 'Chat · Fast';
  if ([s.primary, s.fallback].some((x) => x.toLowerCase() === lower)) return 'Chat · Smart';
  if ([ad.primary, ad.fallback].some((x) => x.toLowerCase() === lower)) return 'Generate ad copy';
  if ([vis.primary, vis.fallback].some((x) => x.toLowerCase() === lower)) return 'Vision / images';
  return null;
}

export default function IonetModelsSettingsSection() {
  const [models, setModels] = useState<IonetModel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [primary, setPrimary] = useState(() => readIonetChatModelPrefs().customPrimary);
  const [fallback, setFallback] = useState(() => readIonetChatModelPrefs().customFallback);

  const syncFromStorage = useCallback(() => {
    const p = readIonetChatModelPrefs();
    setPrimary(p.customPrimary);
    setFallback(p.customFallback);
  }, []);

  useEffect(() => {
    syncFromStorage();
    window.addEventListener(IONET_MODEL_PREFS_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(IONET_MODEL_PREFS_CHANGED_EVENT, syncFromStorage);
  }, [syncFromStorage]);

  const loadList = useCallback(async () => {
    const key = getResolvedLlmApiKey();
    if (!key) {
      setLoadError(
        'Add your API key in Chat → Workspace tools, or under Connections here, then click Refresh model list.',
      );
      setModels([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listModels(key);
      const sorted = [...data].sort((a, b) => a.id.localeCompare(b.id));
      setModels(sorted);
    } catch (e) {
      setLoadError(formatLlmCallErrorReport(e));
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const onKey = () => void loadList();
    window.addEventListener(LLM_API_KEY_CHANGED_EVENT, onKey);
    return () => window.removeEventListener(LLM_API_KEY_CHANGED_EVENT, onKey);
  }, [loadList]);

  const ids = useMemo(() => models.map((m) => m.id), [models]);

  const optionRows = useMemo(() => {
    return ids.map((id) => ({ id, tag: tagForModelId(id) }));
  }, [ids]);

  const primaryRows = useMemo(() => {
    if (primary && !ids.includes(primary)) {
      return [{ id: primary, tag: 'Saved (not in API list)' as string | null }, ...optionRows];
    }
    return optionRows;
  }, [optionRows, primary, ids]);

  const fallbackRows = useMemo(() => {
    if (fallback && !ids.includes(fallback)) {
      return [{ id: fallback, tag: 'Saved (not in API list)' as string | null }, ...optionRows];
    }
    return optionRows;
  }, [optionRows, fallback, ids]);

  return (
    <div className="space-y-4 pt-2" data-testid="ionet-models-settings-section">
      <p className="text-[11px] leading-snug text-muted-foreground">
        <strong className="text-foreground">Defaults:</strong> Fast = smaller / quicker; Smart = best overall
        chat quality ({CHAT_MODEL_PAIR_BY_MODE.smart.primary}). Custom mode in the chat header uses the pair
        below. Tags show where we also use a model for generate or vision — you can align or diverge.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => void loadList()}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh model list'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => {
            resetIonetChatModelPrefsToDefaults();
            syncFromStorage();
          }}
        >
          Reset pair to Smart defaults
        </Button>
      </div>

      {loadError && <p className="text-[11px] text-amber-600 dark:text-amber-400">{loadError}</p>}

      {models.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-foreground">Custom primary (try first)</span>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
              value={primary}
              onChange={(e) => {
                const v = e.target.value;
                setPrimary(v);
                writeIonetChatModelPrefs({ customPrimary: v });
              }}
            >
              {primaryRows.map(({ id, tag }) => (
                <option key={id} value={id}>
                  {id}
                  {tag ? ` — ${tag}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-foreground">Custom fallback</span>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
              value={fallback}
              onChange={(e) => {
                const v = e.target.value;
                setFallback(v);
                writeIonetChatModelPrefs({ customFallback: v });
              }}
            >
              {fallbackRows.map(({ id, tag }) => (
                <option key={`f-${id}`} value={id}>
                  {id}
                  {tag ? ` — ${tag}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {models.length === 0 && !loading && !loadError && (
        <p className="text-[11px] text-muted-foreground">No models returned. Check your key or account, then try Refresh.</p>
      )}
    </div>
  );
}

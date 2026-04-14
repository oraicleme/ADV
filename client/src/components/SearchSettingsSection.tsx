/**
 * STORY-173: Workspace Settings → Search — manual min-score sliders.
 * STORY-196: Post-processing rules (exclude / downrank) for manual + agent search.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  readSearchSettings,
  resetSearchSettingsToDefaults,
  SEARCH_SETTINGS_CHANGED_EVENT,
  SEARCH_LONG_TENTHS_MAX,
  SEARCH_SHORT_TENTHS_MAX,
  writeSearchSettings,
} from '@/lib/search-settings-storage';
import {
  addSearchRule,
  readSearchRules,
  removeSearchRule,
  type SearchRule,
  type SearchRuleAction,
} from '@/lib/search-rules-storage';
import {
  readSearchRulesRagLiteEnabled,
  writeSearchRulesRagLiteEnabled,
  SEARCH_RULES_RAG_LITE_CHANGED_EVENT,
} from '@/lib/search-rules-rag-lite-settings';
import { trpc } from '@/lib/trpc';

function formatScore(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

/** Same shape as `catalog.getSearchProvider` — pass from tests without tRPC (STORY-199). */
export type SearchServerProviderSnapshot = {
  provider: 'meilisearch' | 'unconfigured';
  hybridEnabled: boolean;
  confidenceThreshold: number;
};

type SearchSettingsSectionProps = {
  searchServerSnapshot?: SearchServerProviderSnapshot;
};

/** tRPC hook must live in a child so parents can pass `searchServerSnapshot` and avoid Provider in tests. */
function SearchServerAgentHintsFromTrpc() {
  const { data } = trpc.catalog.getSearchProvider.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return <SearchServerAgentHintsBlock data={data} />;
}

function SearchServerAgentHintsBlock({
  data: searchProviderData,
}: {
  data: SearchServerProviderSnapshot | undefined;
}) {
  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5"
      data-testid="search-server-agent-hints"
    >
      <p className="text-[11px] font-medium text-foreground">Agent catalog search (server)</p>
      {!searchProviderData ? (
        <p className="text-[10px] text-muted-foreground">Loading server search status…</p>
      ) : searchProviderData.provider !== 'meilisearch' ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Meilisearch is not configured on the server (<span className="font-mono">MEILI_HOST</span> /{' '}
          <span className="font-mono">MEILI_API_KEY</span>). Agent Stage-1 search may be limited; see deploy
          docs.
        </p>
      ) : searchProviderData.hybridEnabled ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Hybrid search (BM25 + embeddings) is <span className="text-foreground">on</span> (
          <span className="font-mono">OPENAI_API_KEY</span>). When every Stage-1 hit scores above{' '}
          <span className="font-mono">{searchProviderData.confidenceThreshold.toFixed(2)}</span>, the app skips
          the LLM rerank for speed. That threshold is set with{' '}
          <span className="font-mono">MEILI_CONFIDENCE_THRESHOLD</span> on the server (default 0.85). Blend BM25
          vs vector with <span className="font-mono">MEILI_SEMANTIC_RATIO</span> (default 0.5).
        </p>
      ) : (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Meilisearch is <span className="text-foreground">active</span> (BM25). Hybrid embeddings are{' '}
          <span className="text-foreground">off</span> — set <span className="font-mono">OPENAI_API_KEY</span> on
          the server for BM25+vector and optional smart LLM skip. Stage-1 still uses a noise floor on the client
          (not configurable here).
        </p>
      )}
    </div>
  );
}

export default function SearchSettingsSection({ searchServerSnapshot }: SearchSettingsSectionProps = {}) {
  const [longTenths, setLongTenths] = useState(15);
  const [shortTenths, setShortTenths] = useState(0);
  const [rules, setRules] = useState<SearchRule[]>([]);
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleKey, setRuleKey] = useState('');
  const [ruleAction, setRuleAction] = useState<SearchRuleAction>('exclude');
  const [ragLiteEnabled, setRagLiteEnabled] = useState(false);

  const syncFromStorage = useCallback(() => {
    const s = readSearchSettings();
    setLongTenths(s.longTenths);
    setShortTenths(s.shortTenths);
    setRules(readSearchRules());
  }, []);

  useEffect(() => {
    syncFromStorage();
    window.addEventListener(SEARCH_SETTINGS_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(SEARCH_SETTINGS_CHANGED_EVENT, syncFromStorage);
  }, [syncFromStorage]);

  useEffect(() => {
    setRagLiteEnabled(readSearchRulesRagLiteEnabled());
    const sync = () => setRagLiteEnabled(readSearchRulesRagLiteEnabled());
    window.addEventListener(SEARCH_RULES_RAG_LITE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SEARCH_RULES_RAG_LITE_CHANGED_EVENT, sync);
  }, []);

  return (
    <div className="space-y-4 pt-2" data-testid="search-settings-section">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Manual product search uses MiniSearch scores. Lower values return more results (higher recall); higher
        values filter weaker matches (higher precision). AI-interpreted search always uses minimum threshold{' '}
        <span className="font-mono">0</span>.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-foreground">Long queries & empty search</span>
          <span className="font-mono text-[11px] text-muted-foreground">{formatScore(longTenths)}</span>
        </div>
        <Slider
          min={0}
          max={SEARCH_LONG_TENTHS_MAX}
          step={1}
          value={[longTenths]}
          onValueChange={(v) => {
            const n = v[0] ?? 0;
            setLongTenths(n);
            writeSearchSettings({ longTenths: n });
          }}
          aria-label="Minimum score for long manual search queries"
        />
        <p className="text-[10px] text-muted-foreground/90">Range 0.0–3.0 · default 1.5</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-foreground">Short tokens (≤6 letters/digits)</span>
          <span className="font-mono text-[11px] text-muted-foreground">{formatScore(shortTenths)}</span>
        </div>
        <Slider
          min={0}
          max={SEARCH_SHORT_TENTHS_MAX}
          step={1}
          value={[shortTenths]}
          onValueChange={(v) => {
            const n = v[0] ?? 0;
            setShortTenths(n);
            writeSearchSettings({ shortTenths: n });
          }}
          aria-label="Minimum score for short manual search tokens"
        />
        <p className="text-[10px] text-muted-foreground/90">Range 0.0–2.0 · default 0.0 (recall-first)</p>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={() => {
          resetSearchSettingsToDefaults();
          syncFromStorage();
        }}
        data-testid="search-settings-reset"
      >
        Reset to defaults
      </Button>

      {searchServerSnapshot !== undefined ? (
        <SearchServerAgentHintsBlock data={searchServerSnapshot} />
      ) : (
        <SearchServerAgentHintsFromTrpc />
      )}

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 p-3 space-y-1">
        <p className="text-[11px] font-medium text-foreground">Search feedback (STORY-200)</p>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Unchecking a product in Add Products after the agent selected it logs a privacy-safe implicit signal
          (hashed query + product key). When a last agent search query exists, selected rows show thumbs to log
          explicit relevant / not relevant — same hashing, no raw catalog text in session logs. Use “Copy session
          logs” in dev to inspect events.
        </p>
      </div>

      <div className="border-t border-border pt-4 space-y-3" data-testid="search-rules-section">
        <p className="text-[11px] font-medium text-foreground">Search rules (STORY-196)</p>
        <p className="text-[10px] leading-snug text-muted-foreground">
          After each search, hide or move to the bottom products that match a SKU or exact product name, for an
          exact search query (normalized: trim, lowercase, single spaces). Applies to Add Products / Products tab
          and to agent catalog search (Stage 1). Stored in this browser only.
        </p>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/15 p-2.5">
          <input
            type="checkbox"
            id="search-rules-rag-lite"
            checked={ragLiteEnabled}
            onChange={(e) => {
              writeSearchRulesRagLiteEnabled(e.target.checked);
              setRagLiteEnabled(e.target.checked);
            }}
            data-testid="search-rules-rag-lite"
            className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-orange-500"
          />
          <label
            htmlFor="search-rules-rag-lite"
            className="text-[10px] leading-snug text-muted-foreground cursor-pointer"
          >
            <span className="font-medium text-foreground">Similar query matching (STORY-201)</span> — also apply
            rules when the current search is lexically similar to a saved pattern (token overlap), not only an
            exact match. Client-side PoC; roadmap: <span className="font-mono text-[9px]">docs/search-rules-rag-roadmap.md</span>.
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Query (exact match)</Label>
            <Input
              value={ruleQuery}
              onChange={(e) => setRuleQuery(e.target.value)}
              placeholder="e.g. futrola samsung"
              className="h-8 text-xs"
              data-testid="search-rule-query-input"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">SKU or product name</Label>
            <Input
              value={ruleKey}
              onChange={(e) => setRuleKey(e.target.value)}
              placeholder="e.g. ML-12345"
              className="h-8 text-xs"
              data-testid="search-rule-key-input"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Action</Label>
            <select
              value={ruleAction}
              onChange={(e) => setRuleAction(e.target.value as SearchRuleAction)}
              className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
              data-testid="search-rule-action-select"
            >
              <option value="exclude">Exclude from results</option>
              <option value="downrank">Move to bottom</option>
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const r = addSearchRule({
                queryPattern: ruleQuery,
                productKey: ruleKey,
                action: ruleAction,
              });
              if (r) {
                setRuleQuery('');
                setRuleKey('');
                syncFromStorage();
              }
            }}
            data-testid="search-rule-add-btn"
          >
            Add rule
          </Button>
        </div>
        {rules.length > 0 ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-[10px]">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  <span className="font-mono text-foreground">{r.queryPattern}</span> →{' '}
                  <span className="font-mono">{r.productKey}</span> ({r.action})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-[10px]"
                  onClick={() => {
                    removeSearchRule(r.id);
                    syncFromStorage();
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-muted-foreground">No rules yet.</p>
        )}
      </div>
    </div>
  );
}

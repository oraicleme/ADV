/**
 * STORY-183: Collapsible workspace controls in the Chat tab (search, brief, API key)
 * so users do not need a separate “chat” for product search tuning.
 * STORY-186: At-a-glance read-only strip for catalog import + design defaults (progressive disclosure).
 * STORY-187: Collapsible trigger — aria-expanded (Radix), focus-visible ring, decorative chevron aria-hidden.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CATALOG_API_SETTINGS_CHANGED_EVENT,
  hasSavedCatalogApiConfig,
} from '@/lib/catalog-api-settings-storage';
import {
  DESIGN_DEFAULTS_CHANGED_EVENT,
  readDesignDefaultsSnapshot,
} from '@/lib/design-defaults-storage';
import { designDefaultsSummaryLine } from '@/lib/workspace-tools-at-glance';
import type { WorkspaceSettingsSectionId } from '@/lib/workspace-settings-sections';
import SearchSettingsSection, {
  type SearchServerProviderSnapshot,
} from './SearchSettingsSection';
import AgentBriefSection from './AgentBriefSection';
import ConnectionsByokSection from './ConnectionsByokSection';

export interface ChatWorkspaceToolsProps {
  onOpenSettingsSection: (id: WorkspaceSettingsSectionId) => void;
  /** STORY-199: optional `getSearchProvider` snapshot for tests without tRPC provider. */
  searchServerSnapshot?: SearchServerProviderSnapshot;
}

export default function ChatWorkspaceTools({
  onOpenSettingsSection,
  searchServerSnapshot,
}: ChatWorkspaceToolsProps) {
  const [catalogConfigured, setCatalogConfigured] = useState(() => hasSavedCatalogApiConfig());
  const [designSummary, setDesignSummary] = useState(() =>
    designDefaultsSummaryLine(readDesignDefaultsSnapshot()),
  );

  const bumpAtGlance = useCallback(() => {
    setCatalogConfigured(hasSavedCatalogApiConfig());
    setDesignSummary(designDefaultsSummaryLine(readDesignDefaultsSnapshot()));
  }, []);

  useEffect(() => {
    bumpAtGlance();
    window.addEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, bumpAtGlance);
    window.addEventListener(DESIGN_DEFAULTS_CHANGED_EVENT, bumpAtGlance);
    return () => {
      window.removeEventListener(CATALOG_API_SETTINGS_CHANGED_EVENT, bumpAtGlance);
      window.removeEventListener(DESIGN_DEFAULTS_CHANGED_EVENT, bumpAtGlance);
    };
  }, [bumpAtGlance]);

  return (
    <Collapsible className="border-b border-slate-700/50" data-testid="chat-workspace-tools">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 transition hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        <span className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-orange-400" aria-hidden />
          Workspace tools
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[min(50vh,420px)] overflow-y-auto border-t border-slate-700/40 bg-slate-950/40 px-4 py-3">
        <p className="mb-3 text-[10px] leading-snug text-slate-500">
          Tune catalog search, your creative brief, and the API key here. Full Settings has import, design
          defaults, every io.net model, and copyable system prompts.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-slate-600 bg-slate-900/50 text-[10px] text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenSettingsSection('import')}
          >
            Import
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-slate-600 bg-slate-900/50 text-[10px] text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenSettingsSection('design')}
          >
            Design defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-slate-600 bg-slate-900/50 text-[10px] text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenSettingsSection('models')}
          >
            Models
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-slate-600 bg-slate-900/50 text-[10px] text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenSettingsSection('prompts')}
          >
            Prompts
          </Button>
        </div>
        {/* STORY-186: read-only status; `.dark` matches shadcn tokens */}
        <div
          className="dark mb-3 rounded-md border border-border/60 bg-card/30 px-3 py-2.5 shadow-inner shadow-black/10"
          role="status"
          aria-label="Catalog import and design defaults summary"
          data-testid="chat-workspace-at-glance"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            At a glance
          </p>
          <ul className="space-y-1 text-[11px] leading-snug text-foreground/95">
            <li>
              <span className="text-muted-foreground">Catalog API:</span>{' '}
              {catalogConfigured ? 'Configured' : 'Not configured'}
            </li>
            <li>
              <span className="text-muted-foreground">Design defaults:</span> {designSummary}
            </li>
          </ul>
        </div>
        {/* STORY-185: `.dark` scopes shadcn tokens (foreground, muted, sliders, inputs) to match the chat strip; app :root stays light */}
        <div
          className="dark space-y-4 rounded-md border border-border/70 bg-card/35 p-3 shadow-inner shadow-black/15"
          data-testid="chat-workspace-embedded-dark"
        >
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Search</h3>
            <SearchSettingsSection searchServerSnapshot={searchServerSnapshot} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Agent brief</h3>
            <AgentBriefSection />
          </div>
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">API key</h3>
            <ConnectionsByokSection />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

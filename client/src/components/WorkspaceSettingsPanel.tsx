/**
 * STORY-171: Workspace settings — shell (P0).
 * Full roadmap: docs/left-panel-settings-roadmap.md
 */

import type { ReactNode } from 'react';
import type { ProductItem } from '@/lib/ad-constants';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { isWorkspaceSettingsSectionId, type WorkspaceSettingsSectionId } from '@/lib/workspace-settings-sections';
import AgentBriefSection from './AgentBriefSection';
import CatalogApiImportStubSection from './CatalogApiImportStubSection';
import ConnectionsByokSection from './ConnectionsByokSection';
import DesignDefaultsSection from './DesignDefaultsSection';
import SearchSettingsSection from './SearchSettingsSection';
import IonetModelsSettingsSection from './IonetModelsSettingsSection';
import PromptInspectorSection from './PromptInspectorSection';
import { Plug, FileUp, Search, Bot, Palette, Cpu, FileText } from 'lucide-react';

export type { WorkspaceSettingsSectionId };

export interface WorkspaceSettingsPanelProps {
  /** Which accordion section is expanded (single). `null` = all collapsed. */
  openSection: WorkspaceSettingsSectionId | null;
  onOpenSectionChange: (id: WorkspaceSettingsSectionId | null) => void;
  /** STORY-178: replace workspace catalog after API sync */
  onCatalogSync?: (products: ProductItem[]) => void;
}

const SECTIONS: Array<{
  id: WorkspaceSettingsSectionId;
  label: string;
  icon: ReactNode;
  body: string;
}> = [
  {
    id: 'connections',
    label: 'Connections',
    icon: <Plug className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body: '',
  },
  {
    id: 'models',
    label: 'Models',
    icon: <Cpu className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Choose io.net models for Custom chat mode. Fast/Smart presets stay available in the chat header. Tags show Oraicle defaults for chat, generate, and vision.',
  },
  {
    id: 'import',
    label: 'Import',
    icon: <FileUp className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Excel column mapping, paste presets, and manual import flows will be configured here. Import shortcuts stay in the Products tab.',
  },
  {
    id: 'search',
    label: 'Search',
    icon: <Search className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Tune catalog search (e.g. relevance thresholds) within safe bounds defined by the app. Product search UI stays on the Products tab.',
  },
  {
    id: 'agent',
    label: 'Agent',
    icon: <Bot className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Optional creative brief and language preferences will merge with Oraicle’s built-in agent instructions — they do not replace system safety rules.',
  },
  {
    id: 'design',
    label: 'Design defaults',
    icon: <Palette className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Defaults for new ads (format, layout, palette) and light brand kit options will appear here. The canvas remains the place to fine-tune this ad.',
  },
  {
    id: 'prompts',
    label: 'Prompts',
    icon: <FileText className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />,
    body:
      'Copy the exact system prompts sent to io.net (including your workspace brief). Use in external tools or documentation — they do not replace Oraicle safety rules.',
  },
];

export default function WorkspaceSettingsPanel({
  openSection,
  onOpenSectionChange,
  onCatalogSync,
}: WorkspaceSettingsPanelProps) {
  return (
    <div className="flex h-full flex-col" data-testid="workspace-settings-panel">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold tracking-tight text-foreground">WORKSPACE SETTINGS</h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Configure how data, search, and AI assist you. Canvas controls stay in the center panel.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-1">
        <Accordion
          type="single"
          collapsible
          value={openSection ?? ''}
          onValueChange={(v) => {
            if (!v) {
              onOpenSectionChange(null);
              return;
            }
            if (isWorkspaceSettingsSectionId(v)) {
              onOpenSectionChange(v);
            }
          }}
          className="w-full"
        >
          {SECTIONS.map((s) => (
            <AccordionItem key={s.id} value={s.id} data-testid={`workspace-settings-section-${s.id}`}>
              <AccordionTrigger className="px-2 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  {s.icon}
                  <span>{s.label}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 text-xs text-muted-foreground leading-relaxed">
                {s.id === 'connections' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">
                      LLM API key for chat, suggestions, and generate flows. Optional search backend settings will
                      follow here.
                    </p>
                    <ConnectionsByokSection />
                  </>
                ) : s.id === 'search' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <SearchSettingsSection />
                  </>
                ) : s.id === 'import' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <CatalogApiImportStubSection onCatalogSync={onCatalogSync} />
                  </>
                ) : s.id === 'agent' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <AgentBriefSection />
                  </>
                ) : s.id === 'design' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <DesignDefaultsSection />
                  </>
                ) : s.id === 'models' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <IonetModelsSettingsSection />
                  </>
                ) : s.id === 'prompts' ? (
                  <>
                    <p className="mb-1 text-xs leading-relaxed">{s.body}</p>
                    <PromptInspectorSection />
                  </>
                ) : (
                  s.body
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

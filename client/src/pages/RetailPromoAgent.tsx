import React from 'react';
import AgentChat from '@/components/AgentChat';
import { agents } from '@/data/agents';

/**
 * RetailPromoAgent — Main page for the Oraicle Retail Promo Designer agent.
 * Integrates the full ad editor with AI chat, product import, and asset management.
 */
export default function RetailPromoAgent() {
  const agent = agents.find(a => a.id === 'retail-promo');

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
          <p className="text-muted-foreground">The Retail Promo Designer agent could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AgentChat agent={agent} />
    </div>
  );
}

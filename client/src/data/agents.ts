export interface AgentStep {
  title: string;
  description: string;
}

export interface AgentConfig {
  id: string;
  slug: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  modelId: string;
  oracles: string[];
  placeholderText: string;
  steps: AgentStep[];
  color: 'orange' | 'blue' | 'green' | 'purple' | 'pink';
  features: string[];
}

export const agents: AgentConfig[] = [
  {
    id: 'retail-promo',
    slug: 'retail-promo',
    name: 'Retail Promo Designer',
    badge: 'First Ready Agent',
    tagline: 'From spreadsheet to ad — in one click',
    description:
      'Upload your Excel/CSV with product data and product images — get ready-to-post Viber/Instagram ads (1080×1920) with accurate prices, codes, and copy. No hallucinations, no manual work.',
    modelId: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    oracles: ['web_search', 'image_generation', 'data_analysis'],
    placeholderText:
      'Describe the ad (e.g., "Summer sale ad", "Ljetna akcija")',
    steps: [
      {
        title: 'Upload Logos',
        description: 'Add your company and brand logos',
      },
      {
        title: 'Add Products',
        description: 'Upload Excel, paste text, or add manually',
      },
      {
        title: 'Get Ad Creatives',
        description: 'Receive ready HTML ads to download',
      },
    ],
    color: 'orange',
    features: [
      'Company & brand logo upload — embedded in every ad',
      'Multiple layouts — hero, product grid, category groups, sale/discount',
      'Format presets + custom size (story, square, landscape)',
      'Excel/CSV upload — auto-detects columns, names, and prices',
      'Paste product list — tab, comma, or freeform text',
      'Manual entry — add products one by one with prices',
      'Product photos — upload and assign to products',
      'Auto-find product images from the web (for known brands)',
      'Retail + wholesale pricing (MP/VP) support',
      'Accurate pricing with VAT — zero hallucinations',
    ],
  },
];

export function getAgentBySlug(slug: string): AgentConfig | undefined {
  return agents.find((a) => a.slug === slug);
}

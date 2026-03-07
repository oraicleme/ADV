import type { AdTemplateData } from '../ad-constants';

export interface FormatPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  icon?: string;
}

export interface StyleOptions {
  backgroundColor: string;
  accentColor: string;
  fontFamily: string;
}

export type LayoutId =
  | 'single-hero'
  | 'multi-grid'
  | 'category-group'
  | 'sale-discount';

export interface LayoutRenderer {
  (data: AdTemplateData, format: FormatPreset, style: StyleOptions): string;
}

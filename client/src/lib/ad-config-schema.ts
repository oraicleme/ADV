/**
 * Comprehensive ad configuration schema
 * Supports ALL header/footer/layout/format options
 */

export type AdFormat = 
  | 'instagram-story' // 1080x1920
  | 'instagram-feed'  // 1080x1080
  | 'instagram-reel'  // 1080x1920
  | 'facebook-feed'   // 1200x628
  | 'facebook-story'  // 1080x1920
  | 'tiktok'          // 1080x1920
  | 'viber-banner'    // 800x600
  | 'viber-story'     // 1080x1920
  | 'whatsapp-banner' // 1080x1920
  | 'email-banner'    // 600x400
  | 'web-banner'      // 728x90 | 300x250 | 970x250
  | 'custom';

export type DesignStyle =
  | 'minimalist'    // Clean, simple, lots of whitespace
  | 'bold'          // Vibrant colors, high contrast
  | 'professional'  // Corporate, trustworthy
  | 'playful'       // Fun, friendly, colorful
  | 'luxury'        // Premium, elegant, sophisticated
  | 'tech'          // Modern, sleek, futuristic
  | 'retro'         // Vintage, nostalgic
  | 'custom';

export type HeaderOption =
  | 'logo'           // Company logo
  | 'badge'          // Promotional badge (LIMITED TIME, SALE, etc.)
  | 'discount'       // Discount percentage/amount
  | 'tagline'        // Brand tagline
  | 'headline'       // Main headline text
  | 'none';

export type FooterOption =
  | 'cta-button'     // Call-to-action button
  | 'contact'        // Contact info (phone, website, address)
  | 'social'         // Social media icons
  | 'qr-code'        // QR code
  | 'trust-badges'   // Security/certification badges
  | 'terms'          // Terms/disclaimer text
  | 'none';

export type ContentLayout =
  | 'single-product'      // One large product image
  | 'product-grid-2'      // 2 products in grid
  | 'product-grid-3'      // 3 products in grid
  | 'product-grid-4'      // 4 products in grid
  | 'product-carousel'    // Carousel/slider
  | 'product-with-specs'  // Product + features list
  | 'product-with-price'  // Product + price emphasis
  | 'hero-image'          // Full-width hero image
  | 'text-focused'        // Text-heavy layout
  | 'mixed';              // Mix of text and products

export interface HeaderConfig {
  enabled: boolean;
  options: HeaderOption[];
  backgroundColor?: string;
  textColor?: string;
  height?: number; // pixels
  padding?: number | string;
  alignment?: 'left' | 'center' | 'right';
  
  // Specific elements
  logo?: {
    url?: string;
    width?: number;
    height?: number;
  };
  badge?: {
    text?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  discount?: {
    amount?: number;
    unit?: '%' | '$' | 'fixed';
    backgroundColor?: string;
  };
  tagline?: string;
  headline?: string;
}

export interface FooterConfig {
  enabled: boolean;
  options: FooterOption[];
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  padding?: number | string;
  alignment?: 'left' | 'center' | 'right';
  
  // Specific elements
  cta?: {
    text?: string;
    url?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
  };
  contact?: {
    phone?: string;
    website?: string;
    address?: string;
    email?: string;
  };
  social?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
    telegram?: string;
  };
  qrCode?: {
    url: string;
    size?: number;
  };
  trustBadges?: {
    secure?: boolean;
    certified?: boolean;
    verified?: boolean;
    customBadges?: string[];
  };
  terms?: string;
}

export interface ContentConfig {
  layout: ContentLayout;
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  
  // Product display
  products: {
    ids: string[];
    showPrice?: boolean;
    showDiscount?: boolean;
    showImage?: boolean;
    imagePosition?: 'top' | 'left' | 'right';
  };
  
  // Text content
  title?: string;
  description?: string;
  features?: string[];
  
  // Styling
  borderRadius?: number;
  shadow?: boolean;
  imageHeight?: number;
}

export interface AdConfig {
  id: string;
  name: string;
  format: AdFormat;
  style: DesignStyle;
  
  // Dimensions
  width: number;
  height: number;
  
  // Sections
  header: HeaderConfig;
  content: ContentConfig;
  footer: FooterConfig;
  
  // Global styling
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Format presets with dimensions
export const FORMAT_PRESETS: Record<AdFormat, { width: number; height: number; name: string }> = {
  'instagram-story': { width: 1080, height: 1920, name: 'Instagram Story' },
  'instagram-feed': { width: 1080, height: 1080, name: 'Instagram Feed' },
  'instagram-reel': { width: 1080, height: 1920, name: 'Instagram Reel' },
  'facebook-feed': { width: 1200, height: 628, name: 'Facebook Feed' },
  'facebook-story': { width: 1080, height: 1920, name: 'Facebook Story' },
  'tiktok': { width: 1080, height: 1920, name: 'TikTok' },
  'viber-banner': { width: 800, height: 600, name: 'Viber Banner' },
  'viber-story': { width: 1080, height: 1920, name: 'Viber Story' },
  'whatsapp-banner': { width: 1080, height: 1920, name: 'WhatsApp Banner' },
  'email-banner': { width: 600, height: 400, name: 'Email Banner' },
  'web-banner': { width: 728, height: 90, name: 'Web Banner (728x90)' },
  'custom': { width: 1080, height: 1080, name: 'Custom' },
};

// Design style presets
export const STYLE_PRESETS: Record<DesignStyle, {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  description: string;
}> = {
  'minimalist': {
    primaryColor: '#FFFFFF',
    secondaryColor: '#F5F5F5',
    accentColor: '#000000',
    fontFamily: 'Inter, sans-serif',
    description: 'Clean, simple, lots of whitespace',
  },
  'bold': {
    primaryColor: '#FF6B35',
    secondaryColor: '#004E89',
    accentColor: '#F7B801',
    fontFamily: 'Poppins, sans-serif',
    description: 'Vibrant colors, high contrast',
  },
  'professional': {
    primaryColor: '#1E3A8A',
    secondaryColor: '#E5E7EB',
    accentColor: '#DC2626',
    fontFamily: 'Roboto, sans-serif',
    description: 'Corporate, trustworthy',
  },
  'playful': {
    primaryColor: '#EC4899',
    secondaryColor: '#FBBF24',
    accentColor: '#10B981',
    fontFamily: 'Fredoka, sans-serif',
    description: 'Fun, friendly, colorful',
  },
  'luxury': {
    primaryColor: '#1F2937',
    secondaryColor: '#F3F4F6',
    accentColor: '#D4AF37',
    fontFamily: 'Playfair Display, serif',
    description: 'Premium, elegant, sophisticated',
  },
  'tech': {
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    accentColor: '#06B6D4',
    fontFamily: 'JetBrains Mono, monospace',
    description: 'Modern, sleek, futuristic',
  },
  'retro': {
    primaryColor: '#D4A574',
    secondaryColor: '#9B6B4F',
    accentColor: '#E8B4A8',
    fontFamily: 'Courier New, monospace',
    description: 'Vintage, nostalgic',
  },
  'custom': {
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    accentColor: '#FF6B35',
    fontFamily: 'Arial, sans-serif',
    description: 'Custom colors',
  },
};

// Default ad configuration
export const DEFAULT_AD_CONFIG: Partial<AdConfig> = {
  format: 'instagram-story',
  style: 'bold',
  header: {
    enabled: true,
    options: ['badge', 'discount'],
    backgroundColor: '#FF6B35',
    textColor: '#FFFFFF',
    height: 120,
    padding: 16,
    alignment: 'center',
  },
  content: {
    layout: 'single-product',
    backgroundColor: '#FFFFFF',
    padding: 16,
    products: {
      ids: [],
      showPrice: true,
      showDiscount: true,
      showImage: true,
    },
  },
  footer: {
    enabled: true,
    options: ['cta-button'],
    backgroundColor: '#004E89',
    textColor: '#FFFFFF',
    height: 100,
    padding: 16,
    alignment: 'center',
    cta: {
      text: 'Shop Now',
      backgroundColor: '#F7B801',
      textColor: '#000000',
      borderRadius: 8,
    },
  },
};

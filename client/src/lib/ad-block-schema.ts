/**
 * STORY-57: Strict Ad Block Schema — AI-Safety Foundation
 *
 * Defines every settable property for every canvas block with types, ranges, and enums.
 * Any AI model proposing changes must emit BlockPatch[] validated through validateBlockChange()
 * before they are applied to state. Invalid patches are silently discarded.
 */

export type BlockType = 'headline' | 'products' | 'badge' | 'cta' | 'disclaimer' | 'logo';

export interface PropertySpec {
  type: 'string' | 'number' | 'boolean' | 'enum';
  description: string;
  /** Minimum value — for number type only. */
  min?: number;
  /** Maximum value — for number type only. */
  max?: number;
  /** Maximum string length — for string type only. */
  maxLength?: number;
  /** Allowed values — for enum type only. */
  values?: string[];
}

export interface BlockSpec {
  label: string;
  properties: Record<string, PropertySpec>;
}

export const AD_BLOCK_MANIFEST: Record<BlockType, BlockSpec> = {
  headline: {
    label: 'Headline',
    properties: {
      text: {
        type: 'string',
        maxLength: 200,
        description: 'Ad headline text',
      },
      fontSize: {
        type: 'number',
        min: 16,
        max: 72,
        description: 'Headline font size in px',
      },
      emojiOrIcon: {
        type: 'string',
        maxLength: 4,
        description: 'Emoji or symbol shown before the headline',
      },
    },
  },

  products: {
    label: 'Products',
    properties: {
      columns: {
        type: 'enum',
        values: ['0', '1', '2', '3', '4'],
        description: 'Products per row (0 = auto)',
      },
      maxProducts: {
        type: 'number',
        min: 0,
        max: 100,
        description: 'Maximum number of products shown (0 = no limit)',
      },
      imageHeight: {
        type: 'number',
        min: 40,
        max: 300,
        description: 'Product image height in px',
      },
      'showFields.image': {
        type: 'boolean',
        description: 'Show product image',
      },
      'showFields.code': {
        type: 'boolean',
        description: 'Show product code / SKU',
      },
      'showFields.name': {
        type: 'boolean',
        description: 'Show product name',
      },
      'showFields.description': {
        type: 'boolean',
        description: 'Show product description text',
      },
      'showFields.originalPrice': {
        type: 'boolean',
        description: 'Show original price with strikethrough',
      },
      'showFields.price': {
        type: 'boolean',
        description: 'Show current price',
      },
      'showFields.discountBadge': {
        type: 'boolean',
        description: 'Show discount percentage badge (e.g. -20%)',
      },
      'showFields.brandLogo': {
        type: 'boolean',
        description: 'Show brand logo per product card',
      },
    },
  },

  badge: {
    label: 'Badge',
    properties: {
      text: {
        type: 'string',
        maxLength: 60,
        description: 'Badge text (e.g. "20% OFF")',
      },
    },
  },

  cta: {
    label: 'Call to Action',
    properties: {
      buttons: {
        type: 'string',
        maxLength: 320,
        description: 'CTA button texts, pipe-separated (e.g. "Shop now|Learn more")',
      },
    },
  },

  disclaimer: {
    label: 'Disclaimer',
    properties: {
      text: {
        type: 'string',
        maxLength: 300,
        description: 'Disclaimer / footer text',
      },
    },
  },

  logo: {
    label: 'Company Logo',
    properties: {
      height: {
        type: 'number',
        min: 24,
        max: 160,
        description: 'Company logo height in px',
      },
      alignment: {
        type: 'enum',
        values: ['left', 'center', 'right'],
        description: 'Logo horizontal alignment',
      },
      companion: {
        type: 'enum',
        values: ['none', 'headline', 'badge', 'emoji'],
        description: 'Element shown beside the logo in the header row',
      },
    },
  },
};

/**
 * A single validated change proposed by the AI.
 * blockType + property uniquely identify the settable field.
 */
export interface BlockPatch {
  blockType: BlockType;
  property: string;
  value: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a single BlockPatch against the AD_BLOCK_MANIFEST.
 * Returns { valid: true } when the patch is safe to apply, or { valid: false, error } otherwise.
 */
export function validateBlockChange(
  blockType: BlockType,
  property: string,
  value: unknown,
): ValidationResult {
  const blockSpec = AD_BLOCK_MANIFEST[blockType];
  if (!blockSpec) {
    return { valid: false, error: `Unknown block type: "${blockType}"` };
  }

  const propSpec = blockSpec.properties[property];
  if (!propSpec) {
    return {
      valid: false,
      error: `Block "${blockType}" has no settable property "${property}". Valid: ${Object.keys(blockSpec.properties).join(', ')}`,
    };
  }

  switch (propSpec.type) {
    case 'string': {
      if (typeof value !== 'string') {
        return { valid: false, error: `"${property}" must be a string, got ${typeof value}` };
      }
      if (propSpec.maxLength != null && value.length > propSpec.maxLength) {
        return {
          valid: false,
          error: `"${property}" exceeds max length ${propSpec.maxLength} (got ${value.length})`,
        };
      }
      // Disallow anything that looks like a script injection
      if (/<script/i.test(value) || /javascript:/i.test(value)) {
        return { valid: false, error: `"${property}" contains disallowed content` };
      }
      return { valid: true };
    }

    case 'number': {
      const n = typeof value === 'string' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) {
        return { valid: false, error: `"${property}" must be a finite number, got ${JSON.stringify(value)}` };
      }
      if (propSpec.min != null && n < propSpec.min) {
        return { valid: false, error: `"${property}" must be >= ${propSpec.min}, got ${n}` };
      }
      if (propSpec.max != null && n > propSpec.max) {
        return { valid: false, error: `"${property}" must be <= ${propSpec.max}, got ${n}` };
      }
      return { valid: true };
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        // Also accept "true"/"false" strings from AI
        if (value === 'true' || value === 'false') return { valid: true };
        return { valid: false, error: `"${property}" must be a boolean, got ${typeof value}` };
      }
      return { valid: true };
    }

    case 'enum': {
      const strVal = String(value);
      if (!propSpec.values?.includes(strVal)) {
        return {
          valid: false,
          error: `"${property}" must be one of [${propSpec.values?.join(', ')}], got "${strVal}"`,
        };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: `Unknown property type for "${property}"` };
  }
}

/**
 * Coerces a validated value to the correct runtime type.
 * Call only after validateBlockChange() returns { valid: true }.
 */
export function coerceValue(blockType: BlockType, property: string, value: unknown): unknown {
  const propSpec = AD_BLOCK_MANIFEST[blockType]?.properties[property];
  if (!propSpec) return value;
  switch (propSpec.type) {
    case 'number':
      return typeof value === 'string' ? Number(value) : value;
    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    default:
      return value;
  }
}

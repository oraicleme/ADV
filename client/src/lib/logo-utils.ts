export const ACCEPTED_LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg', // some browsers report JPEG as image/jpg
  'image/svg+xml',
  'image/webp',
] as const;

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type LogoType = 'company' | 'brand';

export interface LogoEntry {
  id: string;
  file: File;
  type: LogoType;
  name: string;
  previewUrl?: string;
  dataUri?: string;
}

export function isValidLogoFile(file: File): boolean {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
    return false;
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return false;
  }
  return true;
}

let counter = 0;
export function createLogoEntry(file: File, type: LogoType): LogoEntry {
  return {
    id: `logo-${Date.now()}-${++counter}`,
    file,
    type,
    name: file.name,
  };
}

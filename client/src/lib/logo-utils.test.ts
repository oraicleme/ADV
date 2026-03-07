import { describe, it, expect } from 'vitest';
import {
  isValidLogoFile,
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_SIZE_BYTES,
  type LogoEntry,
  createLogoEntry,
} from './logo-utils';

function makeFile(name: string, type: string, sizeKB = 10): File {
  const bytes = new Uint8Array(sizeKB * 1024);
  return new File([bytes], name, { type });
}

describe('isValidLogoFile', () => {
  it('accepts PNG files', () => {
    expect(isValidLogoFile(makeFile('logo.png', 'image/png'))).toBe(true);
  });

  it('accepts JPEG files (image/jpeg)', () => {
    expect(isValidLogoFile(makeFile('logo.jpg', 'image/jpeg'))).toBe(true);
  });

  it('accepts JPEG files reported as image/jpg by some browsers', () => {
    expect(isValidLogoFile(makeFile('download.jpeg', 'image/jpg'))).toBe(true);
  });

  it('accepts SVG files', () => {
    expect(isValidLogoFile(makeFile('logo.svg', 'image/svg+xml'))).toBe(true);
  });

  it('accepts WebP files', () => {
    expect(isValidLogoFile(makeFile('logo.webp', 'image/webp'))).toBe(true);
  });

  it('rejects GIF files', () => {
    expect(isValidLogoFile(makeFile('logo.gif', 'image/gif'))).toBe(false);
  });

  it('rejects PDF files', () => {
    expect(isValidLogoFile(makeFile('logo.pdf', 'application/pdf'))).toBe(false);
  });

  it('rejects files over max size', () => {
    const bigFile = makeFile('logo.png', 'image/png', MAX_LOGO_SIZE_BYTES / 1024 + 1);
    expect(isValidLogoFile(bigFile)).toBe(false);
  });

  it('accepts files at exactly max size', () => {
    const exactFile = makeFile('logo.png', 'image/png', MAX_LOGO_SIZE_BYTES / 1024);
    expect(isValidLogoFile(exactFile)).toBe(true);
  });
});

describe('ACCEPTED_LOGO_TYPES', () => {
  it('includes required formats (PNG, JPEG, JPG, SVG, WebP)', () => {
    expect(ACCEPTED_LOGO_TYPES).toContain('image/png');
    expect(ACCEPTED_LOGO_TYPES).toContain('image/jpeg');
    expect(ACCEPTED_LOGO_TYPES).toContain('image/jpg');
    expect(ACCEPTED_LOGO_TYPES).toContain('image/svg+xml');
    expect(ACCEPTED_LOGO_TYPES).toContain('image/webp');
  });
});

describe('createLogoEntry', () => {
  it('creates a logo entry with correct fields', () => {
    const file = makeFile('mylogo.png', 'image/png');
    const entry = createLogoEntry(file, 'company');
    expect(entry.file).toBe(file);
    expect(entry.type).toBe('company');
    expect(entry.name).toBe('mylogo.png');
    expect(entry.id).toBeTruthy();
  });

  it('creates brand logo entries', () => {
    const file = makeFile('samsung.svg', 'image/svg+xml');
    const entry = createLogoEntry(file, 'brand');
    expect(entry.type).toBe('brand');
    expect(entry.name).toBe('samsung.svg');
  });

  it('generates unique IDs for each entry', () => {
    const file = makeFile('a.png', 'image/png');
    const e1 = createLogoEntry(file, 'company');
    const e2 = createLogoEntry(file, 'company');
    expect(e1.id).not.toBe(e2.id);
  });
});

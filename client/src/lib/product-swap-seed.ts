/**
 * STORY-210: Default search seed for “pick another product” so non-tech users see
 * relevant results without typing (MiniSearch on first open).
 */
export function buildSeedSearchQuery(name: string, code?: string): string {
  const n = name?.trim() ?? '';
  if (n.length > 0) {
    const words = n.split(/\s+/).filter(Boolean);
    const short = words.slice(0, 5).join(' ');
    return short.length > 72 ? `${short.slice(0, 72).trim()}…` : short;
  }
  return (code?.trim() ?? '').slice(0, 80);
}

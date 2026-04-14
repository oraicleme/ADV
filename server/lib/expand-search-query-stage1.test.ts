import { describe, expect, it } from 'vitest';
import { parseExpandSearchQueryJson } from './expand-search-query-stage1';

describe('parseExpandSearchQueryJson (STORY-198)', () => {
  it('parses valid JSON', () => {
    expect(
      parseExpandSearchQueryJson('{"queries":["usb auto punjač","type c kabel"]}'),
    ).toEqual(['usb auto punjač', 'type c kabel']);
  });

  it('returns [] on invalid JSON', () => {
    expect(parseExpandSearchQueryJson('not json')).toEqual([]);
  });

  it('filters non-strings and long entries', () => {
    const long = 'x'.repeat(150);
    expect(
      parseExpandSearchQueryJson(
        JSON.stringify({ queries: ['ok', 1, long, '  spaced  '] }),
      ),
    ).toEqual(['ok', 'spaced']);
  });
});

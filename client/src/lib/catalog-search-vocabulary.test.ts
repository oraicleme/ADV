/**
 * STORY-134: Catalog-driven search vocabulary — tests.
 */

import { describe, it, expect } from 'vitest';
import { buildSearchVocabulary, expandQueryWithSynonyms } from './catalog-search-vocabulary';
import type { ProductItem } from './ad-templates';

describe('catalog-search-vocabulary', () => {
  describe('buildSearchVocabulary', () => {
    it('T1: catalog with "PlayStation" includes (play, station, playstation) in spaceCompounds', () => {
      const catalog: ProductItem[] = [
        { name: 'Sony PlayStation 5', brand: 'Sony', category: 'Gaming' },
        { name: 'USB punjač', category: 'Punjači' },
      ];
      const v = buildSearchVocabulary(catalog);
      expect(v.spaceCompounds).toContainEqual(['play', 'station', 'playstation']);
    });

    it('T1: catalog without "playstation" token does not include that compound', () => {
      const catalog: ProductItem[] = [
        { name: 'USB punjač', category: 'Punjači' },
        { name: 'Hoco futrola', category: 'Futrole' },
      ];
      const v = buildSearchVocabulary(catalog);
      const playStation = v.spaceCompounds.find(([a, b]) => a === 'play' && b === 'station');
      expect(playStation).toBeUndefined();
    });

    it('T2: catalog with category containing gamepad and kontroler produces synonym group with both', () => {
      const catalog: ProductItem[] = [
        { name: 'PlayStation gamepad', brand: 'Sony', category: 'Gaming oprema' },
        { name: 'Xbox kontroler', brand: 'Microsoft', category: 'Gaming oprema' },
      ];
      const v = buildSearchVocabulary(catalog);
      expect(v.synonymGroups.length).toBeGreaterThan(0);
      const gamingGroup = v.synonymGroups.find(
        (g) => g.includes('gamepad') && g.includes('kontroler'),
      );
      expect(gamingGroup).toBeDefined();
    });
  });

  describe('expandQueryWithSynonyms', () => {
    it('T2: query "joystick" expands with terms from group containing gamepad/kontroler', () => {
      const groups = [['joystick', 'gamepad', 'kontroler']];
      const expanded = expandQueryWithSynonyms('joystick', groups);
      expect(expanded).toContain('gamepad');
      expect(expanded).toContain('kontroler');
    });
  });
});

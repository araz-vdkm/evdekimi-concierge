import { describe, it, expect } from 'vitest';
import { matchesProperty, KNOWN_PROPERTY_MAPPINGS, resolveReservationProperty } from './villaMatcher';

describe('Villa Matcher Utility', () => {
  
  describe('matchesProperty()', () => {
    it('should exactly match identical properties', () => {
      expect(matchesProperty('Dragon Stone Suites', 'Dragon Stone Suites')).toBe(true);
      expect(matchesProperty('DragonStone A1', 'dragonstone a1')).toBe(true);
    });

    it('should NOT match mutually exclusive property classes (Suites vs Villas)', () => {
      expect(matchesProperty('Dragon Stone Suites', 'Dragon Stone Villas')).toBe(false);
      expect(matchesProperty('Sacred Jungle Suites', 'Sacred Jungle Villas')).toBe(false);
    });

    it('should match known aliases missing spaces', () => {
      expect(matchesProperty('Dragon Stone A1', 'DragonStone A1')).toBe(true);
    });

    it('should NOT match different unit numbers', () => {
      expect(matchesProperty('DragonStone A1', 'DragonStone A10')).toBe(false);
      expect(matchesProperty('DragonStone A1', 'DragonStone A2')).toBe(false);
      expect(matchesProperty('SJ 1 Villa 1', 'SJ 1 Villa 2')).toBe(false);
    });

    it('should correctly match subsets if one contains all specific identifiers of the other', () => {
      // E.g., if a user is assigned "Nyaman 1", it should match the longer "Nyaman Villa 1" reservation
      expect(matchesProperty('Nyaman 1', 'Nyaman Villa 1')).toBe(true);
      // expect(matchesProperty('Nyaman Villa 1', 'Nyaman 1')).toBe(true);
    });
  });

  describe('resolveReservationProperty()', () => {
    it('should properly apply known regex fallbacks', () => {
      const res = resolveReservationProperty({ villa: 'DGS V01' });
      expect(res.complexName).toBe('Dragon Stone Villas');
      expect(res.unitName).toBe('DragonStone V1');
    });

    it('should handle unmapped reservations cleanly', () => {
      const res = resolveReservationProperty({ villa: 'Unknown Property 99' });
      expect(res.complexName).toBe('Unknown Property 99');
      expect(res.unitName).toBe('Unknown Property 99');
    });
  });
});

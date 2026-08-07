import { describe, expect, it } from 'vitest';
import { SEAFOOD_STORAGE_GUIDES } from './storageGuides';

describe('seafood storage guides', () => {
  it('provides a complete, sourced guide for every simulator seafood', () => {
    expect(Object.keys(SEAFOOD_STORAGE_GUIDES)).toEqual(['고등어', '새우', '굴']);
    Object.values(SEAFOOD_STORAGE_GUIDES).forEach((guide) => {
      expect(guide.refrigerator).toContain('4℃');
      expect(guide.sourceUrl).toMatch(/^https:\/\//);
    });
  });
});

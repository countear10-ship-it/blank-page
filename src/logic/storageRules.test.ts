import { describe, expect, it } from 'vitest';
import { calculateStorageRisk } from './storageRules';

describe('calculateStorageRisk', () => {
  it('실온 12시간은 냉장 3시간보다 위험도가 높다', () => {
    const room = calculateStorageRisk({ seafood: '고등어', mode: '실온', temperature: 24, hours: 12, raw: false });
    const cold = calculateStorageRisk({ seafood: '고등어', mode: '냉장', temperature: 4, hours: 3, raw: false });
    expect(room.score).toBeGreaterThan(cold.score);
    expect(room.level).toBe('danger');
  });
  it('생식 조건은 같은 보관 조건의 가열보다 보수적으로 계산한다', () => {
    const raw = calculateStorageRisk({ seafood: '굴', mode: '냉장', temperature: 4, hours: 12, raw: true });
    const cooked = calculateStorageRisk({ seafood: '굴', mode: '냉장', temperature: 4, hours: 12, raw: false });
    expect(raw.score).toBeGreaterThan(cooked.score);
  });
});

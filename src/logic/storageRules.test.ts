import { describe, expect, it } from 'vitest';
import { calculateStorageRisk, storageRiskSignals } from './storageRules';

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
  it('생식 수산물은 검사 대상 병원체를 참고 정보로 안내한다', () => {
    const signals = storageRiskSignals({ seafood: '굴', mode: '냉장', temperature: 4, hours: 3, raw: true });
    expect(signals.some((signal) => signal.title === '생식 수산물의 공식 검사 대상')).toBe(true);
    expect(signals.some((signal) => signal.description.includes('존재 여부는 판단할 수 없습니다'))).toBe(true);
  });
});

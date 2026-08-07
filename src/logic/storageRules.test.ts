import { describe, expect, it } from 'vitest';
import { calculateStorageRisk, STORAGE_RULES, storageRiskSignals } from './storageRules';

describe('calculateStorageRisk', () => {
  it('실온 2시간 이상은 점수와 무관하게 섭취 피하기 단계가 된다', () => {
    const room = calculateStorageRisk({ seafood: '고등어', mode: '실온', temperature: 24, hours: STORAGE_RULES.roomTemperatureMaxHours, raw: false });
    const cold = calculateStorageRisk({ seafood: '고등어', mode: '냉장', temperature: 4, hours: 3, raw: false });
    expect(room).toMatchObject({ level: 'danger', signalStep: 3 });
    expect(cold).toMatchObject({ level: 'safe', signalStep: 1 });
  });

  it('4℃를 넘는 냉장이 4시간 이상이면 섭취 피하기 단계가 된다', () => {
    const result = calculateStorageRisk({ seafood: '새우', mode: '냉장', temperature: 7, hours: STORAGE_RULES.elevatedRefrigeratorMaxHours, raw: false });
    expect(result).toMatchObject({ level: 'danger', signalStep: 3 });
  });

  it('생식 여부는 임의 점수를 더하지 않고 별도 공식 확인 신호로 안내한다', () => {
    const result = calculateStorageRisk({ seafood: '굴', mode: '냉장', temperature: 4, hours: 3, raw: true });
    const signals = storageRiskSignals({ seafood: '굴', mode: '냉장', temperature: 4, hours: 3, raw: true });
    expect(result).toMatchObject({ level: 'safe', signalStep: 1 });
    expect(signals.some((signal) => signal.title === '굴 생식은 패류독소 원문 확인')).toBe(true);
  });
});

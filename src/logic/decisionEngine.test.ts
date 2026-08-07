import { describe, expect, it } from 'vitest';
import regions from '../data/regions.json';
import { evaluateDecision } from './decisionEngine';
import type { DecisionInput, Region } from '../types';

const base: DecisionInput = { seafood: '굴', regionId: 'songjeong', raw: false, storageMode: '냉장', storageHours: 6, temperature: 4, conditions: [] };
const typedRegions = regions as Region[];

describe('evaluateDecision', () => {
  it('알레르기 일치 시 최우선으로 섭취 피하기를 반환하고 개인 위험을 최고로 표시한다', () => {
    const result = evaluateDecision({ ...base, conditions: ['알레르기'] }, typedRegions);
    expect(result.level).toBe('섭취 피하기');
    expect(result.personalRisk).toBe('danger');
    expect(result.regionRisk).not.toBe('danger');
  });
  it('공식 위험 지역 플래그가 있으면 섭취 피하기를 반환한다', () => {
    const result = evaluateDecision({ ...base, regionId: 'jagalchi' }, typedRegions);
    expect(result.level).toBe('섭취 피하기');
    expect(result.regionRisk).toBe('danger');
  });
  it('최신 데이터가 없는 지역은 정보 부족으로 반환한다', () => {
    expect(evaluateDecision({ ...base, regionId: 'dadaepo' }, typedRegions).level).toBe('정보 부족');
  });
  it('고위험군의 생식은 섭취 주의로 반환한다', () => {
    const result = evaluateDecision({ ...base, raw: true, conditions: ['임신'] }, typedRegions);
    expect(result.level).toBe('섭취 주의');
    expect(result.personalRisk).toBe('caution');
  });
});

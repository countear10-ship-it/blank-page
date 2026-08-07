import { describe, expect, it } from 'vitest';
import regions from '../data/regions.json';
import { calculatePersonalRiskScore, countPersonalRiskConditions, evaluateDecision } from './decisionEngine';
import type { DecisionInput, Region } from '../types';
import type { RealtimeSnapshot } from '../services/types';

const base: DecisionInput = { seafood: '굴', regionId: 'songjeong', raw: false, storageSituation: '차갑게 유지', packageCondition: '이상 없음', conditions: [] };
const typedRegions = regions as Region[];
const source = { name: '공식 기관', url: 'https://example.gov.kr' };
const officialFallbackSnapshot: RealtimeSnapshot = {
  marine: { status: 'error', data: null, source, fetchedAt: '2026-08-07T00:00:00Z', stale: false },
  recalls: { status: 'success', data: [], source, fetchedAt: '2026-08-07T00:00:00Z', stale: false },
  shellfish: { status: 'success', data: { title: '패류독소 속보', sourceUrl: source.url, summary: '원문 확인', confirmedRisk: false }, source, fetchedAt: '2026-08-07T00:00:00Z', stale: false },
};

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
  it('지역을 모를 때는 지역 위험을 추정하지 않고 정보 부족으로 안내한다', () => {
    const result = evaluateDecision({ ...base, regionId: 'unknown' }, typedRegions);
    expect(result).toMatchObject({ level: '정보 부족', regionRisk: 'unknown' });
    expect(result.headline).toContain('확인 필요');
  });
  it('수입산은 부산 연안 관측값 대신 원산지 확인 안내를 한다', () => {
    const result = evaluateDecision({ ...base, regionId: 'imported' }, typedRegions);
    expect(result).toMatchObject({ level: '정보 부족', regionRisk: 'unknown' });
    expect(result.reasons.join(' ')).toContain('수입산');
  });
  it('지역을 알지만 해양 API가 없으면 공식 속보와 회수 정보를 보조 근거로 안내한다', () => {
    const result = evaluateDecision(base, typedRegions, '2026-08-07', officialFallbackSnapshot);
    expect(result).toMatchObject({ level: '정보 부족', regionRisk: 'unknown' });
    expect(result.reasons.join(' ')).toContain('패류독소 속보');
  });
  it('고위험군의 생식은 섭취 주의로 반환한다', () => {
    const result = evaluateDecision({ ...base, raw: true, conditions: ['임신'] }, typedRegions);
    expect(result.level).toBe('섭취 주의');
    expect(result.personalRisk).toBe('caution');
  });
  it('복수 개인 주의조건은 화면용 지표에 합산하고 알레르기는 최우선으로 표시한다', () => {
    expect(countPersonalRiskConditions(['면역저하', '간질환'])).toBe(2);
    expect(calculatePersonalRiskScore(['면역저하', '간질환'])).toBe(70);
    expect(calculatePersonalRiskScore(['알레르기', '면역저하'])).toBe(100);
  });
  it('소비자가 확인한 포장 이상과 실온 방치를 최우선 보관 경고로 반영한다', () => {
    expect(evaluateDecision({ ...base, packageCondition: '이상 있음' }, typedRegions).level).toBe('섭취 피하기');
    expect(evaluateDecision({ ...base, storageSituation: '실온 방치' }, typedRegions).level).toBe('섭취 피하기');
  });
});

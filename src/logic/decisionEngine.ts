import type { DecisionInput, DecisionResult, PersonalCondition, Region, RiskLevel } from '../types';
import { calculateStorageRisk } from './storageRules';

const HIGH_RISK_CONDITIONS: PersonalCondition[] = ['임신', '고령자', '면역저하', '간질환'];

function personalRisk(conditions: PersonalCondition[]): RiskLevel {
  return conditions.some((condition) => HIGH_RISK_CONDITIONS.includes(condition)) ? 'caution' : 'safe';
}

export function evaluateDecision(input: DecisionInput, regions: Region[], referenceDate = '2026-08-06'): DecisionResult {
  const region = regions.find((item) => item.id === input.regionId);
  const storage = calculateStorageRisk({ seafood: input.seafood === '광어' || input.seafood === '오징어' ? '새우' : input.seafood as '고등어' | '새우' | '굴', mode: input.storageMode, temperature: input.temperature, hours: input.storageHours, raw: input.raw });
  const personal = personalRisk(input.conditions);
  const regionRisk = region?.riskLevel ?? 'unknown';
  const reasons: string[] = [];
  const actions: string[] = [];

  if (input.conditions.includes('알레르기')) {
    reasons.push('선택한 해산물 알레르기 조건이 있어 최우선 경고로 처리했습니다.');
    actions.push('해당 해산물은 섭취하지 말고, 증상이 있으면 의료기관 안내를 받으세요.');
    return result('섭취 피하기', '섭취 피하기', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (regionRisk === 'danger') {
    reasons.push('선택 지역에 시연용 고위험 플래그가 있습니다. 최신 공식 원문 확인이 필요합니다.');
    actions.push('공식 채취금지·회수 정보가 해소될 때까지 섭취를 미루세요.');
    return result('섭취 피하기', '섭취 피하기', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (regionRisk === 'unknown') {
    reasons.push('선택 지역의 최신 데이터가 없어 안전 여부를 판단할 정보가 부족합니다.');
    actions.push('공식 발표일과 원문을 확인하기 전에는 생식·임의 채취를 피하세요.');
    return result('정보 부족', '판단할 정보 부족', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (storage.level === 'danger') {
    reasons.push('입력한 시간·온도·보관 방식에서 보관 위험이 높습니다.');
    actions.push(storage.recommendation);
    return result('섭취 피하기', '섭취 피하기', reasons.concat(storage.factors), actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (input.raw && personal === 'caution') {
    reasons.push('개인 주의조건이 있고 생식으로 선택되어 보수적으로 안내합니다.');
    actions.push('생식 대신 충분히 가열한 조리법을 선택하세요.');
    return result('섭취 주의', '섭취 주의', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (regionRisk === 'caution' || storage.level === 'caution') {
    if (regionRisk === 'caution') reasons.push('선택 지역에 시연용 주의 플래그가 있습니다.');
    if (storage.level === 'caution') reasons.push('보관 조건에 주의 신호가 있습니다.');
    actions.push('생식보다 충분히 가열하고, 최신 공식 발표와 표시사항을 확인하세요.');
    return result('가열 권장', '가열 후 섭취 권장', reasons.concat(storage.factors), actions, regionRisk, personal, storage.level, region, referenceDate);
  }

  reasons.push('현재 입력 조건과 시연용 지역 데이터에서 특별한 주의 신호가 확인되지 않았습니다.');
  actions.push('판매처의 위생 상태, 포장, 냄새와 소비기한을 확인하세요.');
  return result('가능', '현재 정보상 특별한 주의사항 없음', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
}

function result(level: DecisionResult['level'], headline: string, reasons: string[], actions: string[], regionRisk: RiskLevel, personalRiskValue: RiskLevel, storageRisk: RiskLevel, region: Region | undefined, referenceDate: string): DecisionResult {
  return { level, headline, reasons, actions, regionRisk, personalRisk: personalRiskValue, storageRisk, sourceName: region?.sourceName ?? '국립수산과학원 패류독소 속보', sourceUrl: region?.sourceUrl ?? 'https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5', referenceDate };
}

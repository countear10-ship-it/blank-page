import type { ConsumerStorageSituation, DecisionInput, DecisionResult, PersonalCondition, Region, RiskLevel } from '../types';
import { calculateStorageRisk } from './storageRules';
import type { RealtimeSnapshot } from '../services/types';
import { assessRegion, snapshotHasOfficialDanger, snapshotIsSufficient } from '../services/riskEngine';

const HIGH_RISK_CONDITIONS: PersonalCondition[] = ['임신', '고령자', '면역저하', '간질환'];
const CONSUMER_STORAGE_PRESETS: Record<ConsumerStorageSituation, { mode: '실온' | '냉장'; temperature: number; hours: number }> = {
  '차갑게 유지': { mode: '냉장', temperature: 4, hours: 3 },
  '보냉 이동': { mode: '냉장', temperature: 7, hours: 3 },
  '실온 방치': { mode: '실온', temperature: 24, hours: 3 },
  '확인 어려움': { mode: '냉장', temperature: 8, hours: 12 },
};

function personalRisk(conditions: PersonalCondition[]): RiskLevel {
  if (conditions.includes('알레르기')) return 'danger';
  return conditions.some((condition) => HIGH_RISK_CONDITIONS.includes(condition)) ? 'caution' : 'safe';
}

export function countPersonalRiskConditions(conditions: PersonalCondition[]): number {
  return conditions.filter((condition) => HIGH_RISK_CONDITIONS.includes(condition)).length;
}

function storageInputFromConsumerChoice(input: DecisionInput) {
  const preset = CONSUMER_STORAGE_PRESETS[input.storageSituation];
  return {
    seafood: input.seafood === '홍합' || input.seafood === '광어' || input.seafood === '오징어' ? '새우' : input.seafood,
    mode: preset.mode,
    temperature: preset.temperature,
    hours: preset.hours,
    raw: input.raw,
  } as const;
}

export function evaluateDecision(input: DecisionInput, regions: Region[], referenceDate = '2026-08-06', realtime?: RealtimeSnapshot): DecisionResult {
  const region = regions.find((item) => item.id === input.regionId);
  const baseStorage = calculateStorageRisk(storageInputFromConsumerChoice(input));
  const storage = input.storageSituation === '확인 어려움' || input.packageCondition === '확인 어려움'
    ? { ...baseStorage, level: 'unknown' as RiskLevel, factors: baseStorage.factors.concat('보관 경로 또는 제품 상태를 확인하기 어려워 보수적으로 안내합니다.') }
    : baseStorage;
  const personal = personalRisk(input.conditions);
  const regionRisk = region?.riskLevel ?? 'unknown';
  const reasons: string[] = [];
  const actions: string[] = [];

  if (input.conditions.includes('알레르기')) {
    reasons.push('선택한 해산물 알레르기 조건이 있어 최우선 경고로 처리했습니다.');
    actions.push('해당 해산물은 섭취하지 말고, 증상이 있으면 의료기관 안내를 받으세요.');
    return result('섭취 피하기', '섭취 피하기', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (input.packageCondition === '이상 있음') {
    reasons.push('포장 팽창·누수 또는 이상 냄새가 있다고 선택해 최우선 보관 경고로 처리했습니다.');
    actions.push('섭취하지 말고 판매처 또는 제조사 안내를 확인하세요.');
    return result('섭취 피하기', '섭취 피하기', reasons, actions, regionRisk, personal, 'danger', region, referenceDate);
  }
  if (input.storageSituation === '실온 방치') {
    reasons.push('실온에 오래 있었다고 선택해 보관 위험을 높게 반영했습니다.');
    actions.push('섭취를 미루고 제품 표시사항과 상태를 확인하세요. 생식은 피하세요.');
    return result('섭취 피하기', '섭취 피하기', reasons.concat(storage.factors), actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (input.storageSituation === '확인 어려움' || input.packageCondition === '확인 어려움') {
    reasons.push('소비자가 확인할 수 있는 보관 경로 또는 제품 상태 정보가 부족합니다.');
    actions.push('생식은 피하고, 판매처·포장 표시·이상 냄새를 다시 확인하세요.');
    return result('섭취 주의', '보관 정보 추가 확인 필요', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }

  if (!region) {
    if (input.regionId === 'imported') {
      reasons.push('수입산은 부산 연안 지역 관측값과 직접 연결할 수 없어, 원산지와 수입·회수 정보를 별도로 확인해야 합니다.');
      actions.push('포장지의 원산지·수입업소·회수 안내를 확인하고, 알 수 없으면 생식은 피하세요.');
    } else {
      reasons.push('구입 또는 채취 지역을 알 수 없어 지역별 패류독소·해양환경 정보를 연결할 수 없습니다.');
      actions.push('구매처에 원산지 또는 채취 지역을 확인한 뒤 다시 판정하세요. 확인 전에는 생식을 피하세요.');
    }
    return result('정보 부족', '원산지 또는 채취 지역 확인 필요', reasons, actions, 'unknown', personal, storage.level, undefined, referenceDate);
  }

  if (realtime) {
    const regionalAssessment = assessRegion(region, realtime);
    if (region && snapshotHasOfficialDanger(realtime, region, input.seafood)) {
      reasons.push('공식 회수·판매중지 또는 선택 지역과 연결된 위험정보가 확인되었습니다.');
      actions.push('공식 원문과 판매처 안내를 확인할 때까지 섭취하지 마세요.');
      return result('섭취 피하기', '섭취 피하기', reasons, actions, 'danger', personal, storage.level, region, referenceDate);
    }
    if (!snapshotIsSufficient(realtime)) {
      reasons.push('필요한 공식 조회 중 일부가 완료되지 않아 최신 위험 여부를 확인할 수 없습니다.');
      actions.push('공식 원문을 직접 확인하고 판단을 보류하세요. 데이터가 확인되기 전 생식은 피하세요.');
      return result('정보 부족', '공식 원문 추가 확인 필요', reasons, actions, 'unknown', personal, storage.level, region, referenceDate);
    }
    if (regionalAssessment.level === 'unknown') {
      reasons.push('선택 지역과 연결된 최신 해양 관측값은 확인되지 않았습니다.');
      reasons.push('대신 국립수산과학원 패류독소 속보와 식품안전나라 회수·판매중지 응답을 함께 확인했지만, 이는 지역 해양환경 관측값을 대체하지 않습니다.');
      actions.push('아래 공식 원문에서 패류독소 속보와 회수·판매중지 정보를 확인하고, 지역 확인 전에는 생식을 피하세요.');
      return result('정보 부족', '지역 해양 관측값 추가 확인 필요', reasons, actions, 'unknown', personal, storage.level, region, referenceDate);
    }
    if (storage.level === 'danger') {
      reasons.push('입력한 시간·온도·보관 방식에서 보관 위험 신호가 높습니다.');
      actions.push(storage.recommendation);
      return result('섭취 피하기', '섭취 피하기', reasons.concat(storage.factors), actions, 'safe', personal, storage.level, region, referenceDate);
    }
    if (input.raw && personal === 'caution') {
      reasons.push('고위험 개인 조건에서 생식을 선택해 보수적으로 안내합니다.');
      actions.push('생식 대신 충분히 가열한 조리법을 선택하세요.');
      return result('섭취 주의', '가열 후 섭취 권장', reasons, actions, 'safe', personal, storage.level, region, referenceDate);
    }
    if (storage.level === 'caution') {
      reasons.push('보관 조건에 주의 신호가 있어 가열과 표시사항 확인이 필요합니다.');
      actions.push('가능하면 충분히 가열하고, 냉장·냉동 상태와 표시사항을 다시 확인하세요.');
      return result('가열 권장', '가열 후 섭취 권장', reasons.concat(storage.factors), actions, 'safe', personal, storage.level, region, referenceDate);
    }
    reasons.push('현재 확인된 공식 데이터에서 즉시 확인되는 위험정보는 없습니다. 제품 상태와 원문을 추가 확인하세요.');
    actions.push('판매처의 표시사항·회수 안내를 확인한 뒤 섭취 여부를 결정하세요.');
    return result('가능', '현재 확인된 공식 데이터에서 즉시 확인되는 위험정보 없음', reasons, actions, 'safe', personal, storage.level, region, referenceDate);
  }

  if (regionRisk === 'danger') {
    reasons.push('선택 지역의 고위험 정보가 확인되어 최신 공식 원문 확인이 필요합니다.');
    actions.push('공식 채취금지·회수 정보가 해소될 때까지 섭취를 미루세요.');
    return result('섭취 피하기', '섭취 피하기', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
  }
  if (regionRisk === 'unknown') {
    reasons.push('선택 지역의 최신 데이터가 없어 안전 여부를 판단할 정보가 부족합니다.');
    actions.push('공식 발표일과 원문을 확인하기 전에는 생식·임의 채취를 피하세요.');
    return result('정보 부족', '공식 원문 추가 확인 필요', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
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
    if (regionRisk === 'caution') reasons.push('선택 지역에 주의 정보가 있습니다.');
    if (storage.level === 'caution') reasons.push('보관 조건에 주의 신호가 있습니다.');
    actions.push('생식보다 충분히 가열하고, 최신 공식 발표와 표시사항을 확인하세요.');
    return result('가열 권장', '가열 후 섭취 권장', reasons.concat(storage.factors), actions, regionRisk, personal, storage.level, region, referenceDate);
  }

  reasons.push('현재 입력 조건과 확인된 지역 정보에서 특별한 주의 신호가 확인되지 않았습니다.');
  actions.push('판매처의 위생 상태, 포장, 냄새와 소비기한을 확인하세요.');
  return result('가능', '현재 정보상 특별한 주의사항 없음', reasons, actions, regionRisk, personal, storage.level, region, referenceDate);
}

function result(level: DecisionResult['level'], headline: string, reasons: string[], actions: string[], regionRisk: RiskLevel, personalRiskValue: RiskLevel, storageRisk: RiskLevel, region: Region | undefined, referenceDate: string): DecisionResult {
  return { level, headline, reasons, actions, regionRisk, personalRisk: personalRiskValue, storageRisk, sourceName: region?.sourceName ?? '국립수산과학원 패류독소 속보', sourceUrl: region?.sourceUrl ?? 'https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5', referenceDate };
}

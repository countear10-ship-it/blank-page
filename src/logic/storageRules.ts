import type { StorageInput, StorageResult } from '../types';

export const STORAGE_SOURCE = {
  sourceName: 'FDA 수산물 구매·보관 안전 지침',
  sourceUrl: 'https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely',
};

export const STORAGE_MICROBE_SOURCE = {
  sourceName: '식품의약품안전처 생식용 수산물 검사 안내',
  sourceUrl: 'https://mfds.go.kr/brd/m_1105/view.do?company_cd=&company_nm=&itm_seq_1=0&itm_seq_2=0&multi_itm_seq=0&page=165&seq=33769&srchFr=&srchTo=&srchTp=&srchWord=',
};

export const STORAGE_RULES = {
  refrigeratorMaxCelsius: 4,
  freezerMaxCelsius: -18,
  roomTemperatureMaxHours: 2,
  elevatedRefrigeratorMaxHours: 4,
} as const;

export interface StorageRiskSignal {
  title: string;
  description: string;
}

export function storageRiskSignals(input: StorageInput): StorageRiskSignal[] {
  const signals: StorageRiskSignal[] = [];

  if (input.mode === '실온' && input.hours >= STORAGE_RULES.roomTemperatureMaxHours) {
    signals.push({
      title: '실온 2시간 기준 초과',
      description: '수산물을 포함한 냉장 필요 식품은 실온에 2시간 이상 두지 않도록 안내됩니다. 섭취 대신 폐기 또는 판매처 확인이 필요합니다.',
    });
  } else if (input.mode === '실온') {
    signals.push({
      title: '실온 보관 중',
      description: '실온 보관은 2시간을 넘기기 전에 즉시 냉장·냉동해야 합니다.',
    });
  }

  if (input.mode === '냉장' && input.temperature > STORAGE_RULES.refrigeratorMaxCelsius) {
    signals.push({
      title: '냉장 온도 기준 미충족',
      description: '냉장고는 4℃ 이하가 권장됩니다. 4℃를 넘는 상태가 4시간 이상이면 폐기 기준으로 안내됩니다.',
    });
  }

  if (input.mode === '냉동' && input.temperature > STORAGE_RULES.freezerMaxCelsius) {
    signals.push({
      title: '냉동 온도 기준 미충족',
      description: '냉동고는 -18℃ 이하가 권장됩니다. 해동된 수산물은 다시 냉동하지 마세요.',
    });
  }

  if (input.raw) {
    signals.push({
      title: '생식은 별도 주의 필요',
      description: '생식 여부만으로 병원균 존재를 판정할 수는 없지만, 개인 고위험 조건과 공식 회수·패류독소 정보를 함께 확인해야 합니다.',
    });
  }

  if (input.seafood === '굴' && input.raw) {
    signals.push({
      title: '굴 생식은 패류독소 원문 확인',
      description: '패류독소 여부는 보관 온도만으로 판단할 수 없습니다. 지역 속보와 채취·유통 안내를 확인하세요.',
    });
  }

  if (!signals.length) {
    signals.push({
      title: '입력한 보관 기준 충족',
      description: '입력값 기준 냉장·냉동 조건은 충족합니다. 포장 이상, 소비기한, 냄새는 별도로 확인해야 합니다.',
    });
  }

  return signals;
}

export function calculateStorageRisk(input: StorageInput): StorageResult {
  const factors: string[] = [];
  let level: StorageResult['level'] = 'safe';

  if (input.mode === '실온' && input.hours >= STORAGE_RULES.roomTemperatureMaxHours) {
    level = 'danger';
    factors.push(`실온 ${STORAGE_RULES.roomTemperatureMaxHours}시간 이상은 공식 보관 지침의 최대 시간을 넘습니다.`);
  } else if (input.mode === '냉장' && input.temperature > STORAGE_RULES.refrigeratorMaxCelsius && input.hours >= STORAGE_RULES.elevatedRefrigeratorMaxHours) {
    level = 'danger';
    factors.push(`냉장 기준 ${STORAGE_RULES.refrigeratorMaxCelsius}℃를 넘는 상태가 ${STORAGE_RULES.elevatedRefrigeratorMaxHours}시간 이상 지속된 것으로 입력되었습니다.`);
  } else if (input.mode === '실온') {
    level = 'caution';
    factors.push(`실온 보관은 ${STORAGE_RULES.roomTemperatureMaxHours}시간을 넘기지 않도록 즉시 냉장·냉동해야 합니다.`);
  } else if (input.mode === '냉장' && input.temperature > STORAGE_RULES.refrigeratorMaxCelsius) {
    level = 'caution';
    factors.push(`냉장고 권장 기준인 ${STORAGE_RULES.refrigeratorMaxCelsius}℃ 이하를 넘었습니다.`);
  } else if (input.mode === '냉동' && input.temperature > STORAGE_RULES.freezerMaxCelsius) {
    level = 'caution';
    factors.push(`냉동 보관 기준인 ${STORAGE_RULES.freezerMaxCelsius}℃ 이하를 확인하기 어렵습니다.`);
  } else if (input.mode === '냉장') {
    factors.push(`냉장 ${STORAGE_RULES.refrigeratorMaxCelsius}℃ 이하로 입력되었습니다. 소비기한과 포장 상태를 함께 확인하세요.`);
  } else if (input.mode === '냉동') {
    factors.push(`냉동 ${STORAGE_RULES.freezerMaxCelsius}℃ 이하로 입력되었습니다. 해동 뒤에는 재냉동하지 마세요.`);
  }

  if (input.raw) factors.push('생식 여부는 보관 단계와 별도로, 개인 고위험 조건 및 공식 회수·패류독소 정보와 함께 판정합니다.');
  if (input.seafood === '굴' && input.raw) factors.push('굴 생식은 지역 발표와 개인 주의조건을 반드시 함께 확인하세요.');

  const signalStep: StorageResult['signalStep'] = level === 'danger' ? 3 : level === 'caution' ? 2 : 1;
  const label = level === 'danger' ? '섭취 피하기' : level === 'caution' ? '주의 필요' : '보관 기준 충족';
  const recommendation = level === 'danger'
    ? '섭취하지 말고 폐기하거나 판매처·공식 안내를 확인하세요.'
    : level === 'caution'
      ? '생식은 피하고, 즉시 냉장·냉동한 뒤 표시사항과 포장 상태를 다시 확인하세요.'
      : '입력한 보관 기준은 충족하지만, 안전을 보장하지는 않습니다. 냄새·포장·표시사항도 확인하세요.';

  return { level, signalStep, label, factors, recommendation, ...STORAGE_SOURCE };
}

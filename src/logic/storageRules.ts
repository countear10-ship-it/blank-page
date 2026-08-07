import type { StorageInput, StorageResult } from '../types';

export const STORAGE_SOURCE = {
  sourceName: '식품안전나라 수산물 구매·보관 요령',
  sourceUrl: 'https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs160617&menu_grp=MENU_NEW01&menu_no=4846&ntctxt_no=1096183',
};

export const STORAGE_MICROBE_SOURCE = {
  sourceName: '식품의약품안전처 생식용 수산물 검사 안내',
  sourceUrl: 'https://mfds.go.kr/brd/m_1105/view.do?company_cd=&company_nm=&itm_seq_1=0&itm_seq_2=0&multi_itm_seq=0&page=165&seq=33769&srchFr=&srchTo=&srchTp=&srchWord=',
};

export interface StorageRiskSignal {
  title: string;
  description: string;
}

export function storageRiskSignals(input: StorageInput): StorageRiskSignal[] {
  const signals: StorageRiskSignal[] = [];
  const temperatureOutOfRange = input.mode === '실온' || (input.mode === '냉장' && input.temperature > 5) || (input.mode === '냉동' && input.temperature > -15);

  if (temperatureOutOfRange || input.hours >= 6) {
    signals.push({
      title: '온도 관리 이탈 시 식중독균 증식 우려',
      description: '수산물은 상온에서 부패·변질되기 쉬워 차갑게 보관해야 합니다. 이 결과는 증식 가능성을 안내할 뿐, 실제 균 검출 여부를 확인하지는 않습니다.',
    });
  }
  if (input.raw) {
    signals.push({
      title: '생식 수산물의 공식 검사 대상',
      description: '생식용 수산물은 장염비브리오·비브리오패혈증균·비브리오콜레라균·살모넬라·리스테리아·황색포도상구균 등을 검사 대상에 포함합니다. 입력값만으로 존재 여부는 판단할 수 없습니다.',
    });
  }
  if (input.seafood === '굴' && input.raw) {
    signals.push({
      title: '굴 생식은 패류독소 원문도 별도 확인',
      description: '패류독소는 보관 온도 그래프로 판정할 수 없습니다. 부산 위험지도에서 최신 패류독소 속보와 채취·유통 안내를 함께 확인하세요.',
    });
  }
  if (!signals.length) {
    signals.push({
      title: '현재 입력에서 확인할 보관 항목',
      description: '냉장·냉동 상태를 유지하고, 포장 표시사항·소비기한·이상 냄새를 함께 확인하세요. 보관 조건이 적절해도 병원균이 없다고 단정할 수는 없습니다.',
    });
  }
  return signals;
}

export function calculateStorageRisk(input: StorageInput): StorageResult {
  const factors: string[] = [];
  let score = 12;

  if (input.mode === '실온') {
    score += 45;
    factors.push('실온 보관은 시간이 짧아도 냉장·냉동보다 위험이 빠르게 커질 수 있습니다.');
    if (input.hours >= 2) score += 25;
    if (input.hours >= 6) score += 15;
  } else if (input.mode === '냉장') {
    if (input.temperature > 5) {
      score += 32;
      factors.push('냉장 기준으로 보기 어려운 온도입니다.');
    } else {
      score += input.temperature > 3 ? 16 : 8;
    }
    if (input.hours > 24) {
      score += 20;
      factors.push('냉장 시간이 길어졌습니다. 표시된 보관 방법과 소비기한을 우선 확인하세요.');
    } else if (input.hours > 12) {
      score += 8;
    }
  } else {
    if (input.temperature > -15) {
      score += 22;
      factors.push('냉동 보관으로 보기 어려운 온도입니다.');
    } else {
      score += 4;
    }
    if (input.hours > 720) {
      score += 15;
      factors.push('장기 냉동은 포장 표시와 품질 변화를 확인해야 합니다.');
    }
  }

  if (input.raw) {
    score += 12;
    factors.push('생식은 가열보다 보관·위생 이력에 더 민감하므로 보수적으로 판단합니다.');
  }
  if (input.seafood === '고등어' && input.mode === '실온') score += 8;
  if (input.seafood === '굴' && input.raw) factors.push('굴 생식은 지역 발표와 개인 주의조건을 반드시 함께 확인하세요.');

  const normalized = Math.min(100, score);
  const level = normalized >= 75 ? 'danger' : normalized >= 45 ? 'caution' : 'safe';
  const label = level === 'danger' ? '높음' : level === 'caution' ? '주의' : '낮음';
  const recommendation = level === 'danger'
    ? '섭취를 미루고 폐기 또는 공식 안내를 확인하세요.'
    : level === 'caution'
      ? '가능하면 충분히 가열하고, 냉장·냉동 상태와 표시사항을 다시 확인하세요.'
      : '현재 입력 조건에서 큰 보관 위험 신호는 적지만, 냄새·포장·표시사항을 확인하세요.';

  return { level, score: normalized, label, factors, recommendation, ...STORAGE_SOURCE };
}

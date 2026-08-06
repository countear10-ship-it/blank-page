import type { StorageInput, StorageResult } from '../types';

export const STORAGE_SOURCE = {
  sourceName: '식품안전나라 보관·식중독 예방 안내',
  sourceUrl: 'https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs820&bbs_type_cd=03',
};

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

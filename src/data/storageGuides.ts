import type { StorageInput } from '../types';

type SupportedSeafood = StorageInput['seafood'];

export interface SeafoodStorageGuide {
  title: string;
  purchase: string;
  refrigerator: string;
  freezer: string;
  extra: string;
  sourceName: string;
  sourceUrl: string;
}

const FDA_SOURCE = {
  sourceName: 'FDA 해산물 구매·보관 안전 안내',
  sourceUrl: 'https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely',
} as const;

export const SEAFOOD_STORAGE_GUIDES: Record<SupportedSeafood, SeafoodStorageGuide> = {
  고등어: {
    title: '고등어 보관 추천',
    purchase: '구매 뒤 보냉 가방으로 옮기고, 집에 도착하면 바로 냉장 또는 냉동하세요.',
    refrigerator: '냉장고 4℃ 이하의 차가운 칸에 두고, 즙이 다른 식품에 닿지 않게 밀폐 용기를 사용하세요.',
    freezer: '바로 조리하지 않을 예정이면 가능한 빨리 냉동하고, 해동은 냉장고에서 하세요.',
    extra: '포장 손상·이상 냄새·색 변화가 있으면 섭취하지 말고 판매처에 문의하세요.',
    ...FDA_SOURCE,
  },
  새우: {
    title: '새우 보관 추천',
    purchase: '구매부터 귀가까지 차갑게 유지하고, 실온에 오래 두지 마세요.',
    refrigerator: '개봉했다면 깨끗한 밀폐 용기에 옮겨 냉장 4℃ 이하에서 보관하세요.',
    freezer: '장기간 보관이 필요하면 소분해 냉동하고, 한번 해동한 제품은 다시 냉동하지 마세요.',
    extra: '가열 전후에는 손·도구를 구분해 교차오염을 줄이세요.',
    ...FDA_SOURCE,
  },
  굴: {
    title: '굴 보관 추천',
    purchase: '생굴은 원산지·유통 표시와 포장 상태를 확인하고, 구매 후 바로 차갑게 보관하세요.',
    refrigerator: '냉장 4℃ 이하로 보관하고, 껍질 굴은 민물에 담가 두지 마세요.',
    freezer: '냉동 제품은 포장 표시의 보관 방법을 우선하고, 해동은 냉장고에서 하세요.',
    extra: '생식 전에는 패류독소 속보·회수 정보와 개인 고위험 조건을 함께 확인하세요.',
    ...FDA_SOURCE,
  },
};

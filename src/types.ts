export type RiskLevel = 'safe' | 'caution' | 'danger' | 'unknown';
export type DecisionLevel = '가능' | '가열 권장' | '섭취 주의' | '섭취 피하기' | '정보 부족';
export type Seafood = '굴' | '홍합' | '새우' | '고등어' | '광어' | '오징어';
export type StorageMode = '실온' | '냉장' | '냉동';
export type PersonalCondition = '알레르기' | '임신' | '고령자' | '면역저하' | '간질환' | '주의조건 없음';
export type ConsumerStorageSituation = '차갑게 유지' | '보냉 이동' | '실온 방치' | '확인 어려움';
export type PackageCondition = '이상 없음' | '이상 있음' | '확인 어려움';

export interface RiskHistoryPoint { date: string; level: RiskLevel; value: number; label: string; }

export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel;
  summary: string;
  affectedSeafood: Seafood[];
  toxinStatus: string;
  waterTemperature: string;
  radiationStatus: string;
  recommendation: string;
  observedAt: string;
  updatedAt: string;
  sourceName: string;
  sourceUrl: string;
  riskHistory: RiskHistoryPoint[];
}

export interface DecisionInput {
  seafood: Seafood;
  regionId: string;
  raw: boolean;
  storageSituation: ConsumerStorageSituation;
  packageCondition: PackageCondition;
  conditions: PersonalCondition[];
}

export interface DecisionResult {
  level: DecisionLevel;
  headline: string;
  reasons: string[];
  actions: string[];
  regionRisk: RiskLevel;
  personalRisk: RiskLevel;
  storageRisk: RiskLevel;
  sourceName: string;
  sourceUrl: string;
  referenceDate: string;
}

export interface StorageInput {
  seafood: '고등어' | '새우' | '굴';
  mode: StorageMode;
  temperature: number;
  hours: number;
  raw: boolean;
}

export interface StorageResult {
  level: RiskLevel;
  signalStep: 1 | 2 | 3;
  label: string;
  factors: string[];
  recommendation: string;
  sourceName: string;
  sourceUrl: string;
}

export interface QuizQuestion {
  id: number;
  statement: string;
  answer: 'O' | 'X';
  explanation: string;
  sourceName: string;
  sourceUrl: string;
  relatedFeature: 'map' | 'decision' | 'storage';
  verified: boolean;
}

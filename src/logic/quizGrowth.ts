export const QUIZ_GROWTH_STORAGE_KEY = 'seasafe-quiz-progress-v2';
export const LEGACY_QUIZ_GROWTH_STORAGE_KEY = 'seasafe-quiz-progress-v1';
export const MAX_GROWTH_POINTS = 500;
export const POINTS_PER_CORRECT_ANSWER = 20;

export interface QuizGrowthState {
  growthPoints: number;
  currentStage: number;
  lastQuizScore: number;
  totalCorrectAnswers: number;
  completedQuizCount: number;
}

export interface GrowthStage {
  stage: number;
  name: string;
  baseScale: number;
}

export const growthStages: GrowthStage[] = [
  { stage: 1, name: '작은 치어', baseScale: 0.78 },
  { stage: 2, name: '어린 바다친구', baseScale: 0.9 },
  { stage: 3, name: '건강한 물고기', baseScale: 1.02 },
  { stage: 4, name: '빛나는 물고기', baseScale: 1.14 },
  { stage: 5, name: '바다 수호자', baseScale: 1.26 },
  { stage: 6, name: '안심海 전설 수호어', baseScale: 1.38 },
];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type UnknownRecord = Record<string, unknown>;

export function clampGrowthPoints(value: unknown): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(MAX_GROWTH_POINTS, Math.max(0, Math.floor(numeric)));
}

export function getGrowthStage(points: number): number {
  const safePoints = clampGrowthPoints(points);
  return safePoints === MAX_GROWTH_POINTS ? 6 : Math.floor(safePoints / 100) + 1;
}

export function getGrowthStageInfo(points: number): GrowthStage {
  return growthStages[getGrowthStage(points) - 1];
}

export function progressWithinStage(points: number): number {
  const safePoints = clampGrowthPoints(points);
  return safePoints === MAX_GROWTH_POINTS ? 1 : (safePoints % 100) / 100;
}

export function fishScale(points: number): number {
  const stage = getGrowthStageInfo(points);
  return stage.baseScale + progressWithinStage(points) * 0.08;
}

export function nextGrowthPoints(currentPoints: number): number {
  return Math.min(MAX_GROWTH_POINTS, clampGrowthPoints(currentPoints) + POINTS_PER_CORRECT_ANSWER);
}

export function pointsUntilNextStage(points: number): number | null {
  const safePoints = clampGrowthPoints(points);
  return safePoints === MAX_GROWTH_POINTS ? null : 100 - (safePoints % 100);
}

export function createDefaultQuizGrowthState(): QuizGrowthState {
  return { growthPoints: 0, currentStage: 1, lastQuizScore: 0, totalCorrectAnswers: 0, completedQuizCount: 0 };
}

function nonNegativeInteger(value: unknown): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function normalizeQuizGrowthState(value: unknown): QuizGrowthState {
  if (!value || typeof value !== 'object') return createDefaultQuizGrowthState();
  const record = value as UnknownRecord;
  const growthPoints = clampGrowthPoints(record.growthPoints ?? record.points ?? record.totalPoints ?? record.score);
  return {
    growthPoints,
    currentStage: getGrowthStage(growthPoints),
    lastQuizScore: nonNegativeInteger(record.lastQuizScore ?? record.quizScore ?? record.score),
    totalCorrectAnswers: nonNegativeInteger(record.totalCorrectAnswers ?? record.correctAnswers),
    completedQuizCount: nonNegativeInteger(record.completedQuizCount ?? record.quizCount),
  };
}

function readJson(storage: StorageLike, key: string): unknown {
  const value = storage.getItem(key);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function loadQuizGrowthState(storage?: StorageLike): QuizGrowthState {
  if (!storage) return createDefaultQuizGrowthState();
  const v2 = readJson(storage, QUIZ_GROWTH_STORAGE_KEY);
  if (v2 !== undefined) return normalizeQuizGrowthState(v2);
  const migrated = normalizeQuizGrowthState(readJson(storage, LEGACY_QUIZ_GROWTH_STORAGE_KEY));
  storage.setItem(QUIZ_GROWTH_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function saveQuizGrowthState(storage: StorageLike | undefined, state: QuizGrowthState): QuizGrowthState {
  const normalized = normalizeQuizGrowthState(state);
  storage?.setItem(QUIZ_GROWTH_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetQuizGrowthState(storage?: StorageLike): QuizGrowthState {
  const initial = createDefaultQuizGrowthState();
  storage?.setItem(QUIZ_GROWTH_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export function awardGrowthPoints(state: QuizGrowthState): { state: QuizGrowthState; gained: number; stageReached?: number } {
  const current = normalizeQuizGrowthState(state);
  const growthPoints = nextGrowthPoints(current.growthPoints);
  const stage = getGrowthStage(growthPoints);
  return {
    state: {
      ...current,
      growthPoints,
      currentStage: stage,
      totalCorrectAnswers: current.totalCorrectAnswers + 1,
    },
    gained: growthPoints - current.growthPoints,
    stageReached: stage > current.currentStage ? stage : undefined,
  };
}

export function applyQuizAnswer(state: QuizGrowthState, isCorrect: boolean): { state: QuizGrowthState; gained: number; stageReached?: number } {
  if (!isCorrect) return { state: normalizeQuizGrowthState(state), gained: 0 };
  return awardGrowthPoints(state);
}

export function canAwardQuestionInRound(scoredQuestionIds: ReadonlySet<number>, questionId: number, isCorrect: boolean): boolean {
  return isCorrect && !scoredQuestionIds.has(questionId);
}

export function startNewQuizRound(state: QuizGrowthState): QuizGrowthState {
  return normalizeQuizGrowthState(state);
}

export function finishQuizRound(state: QuizGrowthState, score: number): QuizGrowthState {
  const current = normalizeQuizGrowthState(state);
  return {
    ...current,
    lastQuizScore: nonNegativeInteger(score),
    completedQuizCount: current.completedQuizCount + 1,
  };
}

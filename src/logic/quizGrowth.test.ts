import { describe, expect, it } from 'vitest';
import {
  LEGACY_QUIZ_GROWTH_STORAGE_KEY,
  QUIZ_GROWTH_STORAGE_KEY,
  applyQuizAnswer,
  canAwardQuestionInRound,
  awardGrowthPoints,
  createDefaultQuizGrowthState,
  fishScale,
  getGrowthStage,
  loadQuizGrowthState,
  nextGrowthPoints,
  resetQuizGrowthState,
  saveQuizGrowthState,
  startNewQuizRound,
} from './quizGrowth';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('quiz growth points', () => {
  it('adds exactly 20 points for a correct answer and never subtracts for a wrong answer', () => {
    const initial = createDefaultQuizGrowthState();
    const correct = awardGrowthPoints(initial);
    expect(correct.gained).toBe(20);
    expect(correct.state.growthPoints).toBe(20);
    const wrong = applyQuizAnswer(correct.state, false);
    expect(wrong.gained).toBe(0);
    expect(wrong.state.growthPoints).toBe(20);
  });

  it('prevents a duplicate reward for the same question within a round and allows it in a new round', () => {
    const firstRoundQuestionIds = new Set<number>();
    expect(canAwardQuestionInRound(firstRoundQuestionIds, 7, true)).toBe(true);
    firstRoundQuestionIds.add(7);
    expect(canAwardQuestionInRound(firstRoundQuestionIds, 7, true)).toBe(false);
    expect(canAwardQuestionInRound(firstRoundQuestionIds, 8, false)).toBe(false);
    expect(canAwardQuestionInRound(new Set<number>(), 7, true)).toBe(true);
    const firstRound = awardGrowthPoints(createDefaultQuizGrowthState());
    const secondRound = awardGrowthPoints(firstRound.state);
    expect(secondRound.state.growthPoints).toBe(40);
    expect(secondRound.state.totalCorrectAnswers).toBe(2);
  });

  it('caps growth points at 500, including 480 plus one correct answer', () => {
    expect(nextGrowthPoints(480)).toBe(500);
    expect(nextGrowthPoints(500)).toBe(500);
    const atMaximum = awardGrowthPoints({ ...createDefaultQuizGrowthState(), growthPoints: 500, currentStage: 6 });
    expect(atMaximum.gained).toBe(0);
    expect(atMaximum.state.growthPoints).toBe(500);
    expect(atMaximum.state.totalCorrectAnswers).toBe(1);
  });

  it('changes stages at every 100-point milestone', () => {
    expect(getGrowthStage(0)).toBe(1);
    expect(getGrowthStage(100)).toBe(2);
    expect(getGrowthStage(200)).toBe(3);
    expect(getGrowthStage(300)).toBe(4);
    expect(getGrowthStage(400)).toBe(5);
    expect(getGrowthStage(500)).toBe(6);
  });

  it('grows the fish a little on each 20-point gain within a stage', () => {
    expect(fishScale(20)).toBeGreaterThan(fishScale(0));
    expect(fishScale(40)).toBeGreaterThan(fishScale(20));
  });
});

describe('quiz growth persistence', () => {
  it('migrates v1 points to v2 without deleting the v1 record and clamps invalid ranges', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_QUIZ_GROWTH_STORAGE_KEY, JSON.stringify({ points: 620, score: 3, correctAnswers: 9, quizCount: 2 }));
    const state = loadQuizGrowthState(storage);
    expect(state.growthPoints).toBe(500);
    expect(state.currentStage).toBe(6);
    expect(state.lastQuizScore).toBe(3);
    expect(storage.getItem(LEGACY_QUIZ_GROWTH_STORAGE_KEY)).not.toBeNull();
    expect(JSON.parse(storage.getItem(QUIZ_GROWTH_STORAGE_KEY) ?? '{}').growthPoints).toBe(500);
  });

  it('keeps saved growth after a refresh and resets only when the reset action is used', () => {
    const storage = new MemoryStorage();
    const saved = saveQuizGrowthState(storage, { growthPoints: 280, currentStage: 3, lastQuizScore: 4, totalCorrectAnswers: 14, completedQuizCount: 3 });
    expect(loadQuizGrowthState(storage)).toEqual(saved);
    expect(startNewQuizRound(saved)).toEqual(saved);
    expect(resetQuizGrowthState(storage).growthPoints).toBe(0);
  });
});

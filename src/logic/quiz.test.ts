import { describe, expect, it } from 'vitest';
import quizData from '../data/quiz.json';
import { calculateQuizScore, pickQuestions } from './quiz';
import type { QuizQuestion } from '../types';

const questions = quizData as QuizQuestion[];

describe('quiz logic', () => {
  it('5문제를 무작위 출제하고 검증된 문제만 선택한다', () => {
    const picked = pickQuestions(questions, 5, () => .5);
    expect(picked).toHaveLength(5);
    expect(picked.every((question) => question.verified)).toBe(true);
  });
  it('정답 수를 계산한다', () => {
    const answers = Object.fromEntries(questions.slice(0, 3).map((question) => [question.id, question.answer]));
    expect(calculateQuizScore(answers, questions.slice(0, 3))).toBe(3);
  });
});

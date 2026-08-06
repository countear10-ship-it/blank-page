import type { QuizQuestion } from '../types';

export function pickQuestions(questions: QuizQuestion[], count = 5, random: () => number = Math.random): QuizQuestion[] {
  return questions.filter((question) => question.verified).sort(() => random() - 0.5).slice(0, Math.min(count, questions.length));
}

export function calculateQuizScore(answers: Record<number, 'O' | 'X'>, questions: QuizQuestion[]): number {
  return questions.reduce((score, question) => score + (answers[question.id] === question.answer ? 1 : 0), 0);
}

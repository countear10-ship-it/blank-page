import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, Home, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import quizData from '../data/quiz.json';
import QuizGrowthPanel from '../components/QuizGrowthPanel';
import { Card, SourceLine } from '../components/UI';
import { calculateQuizScore, pickQuestions } from '../logic/quiz';
import {
  applyQuizAnswer,
  canAwardQuestionInRound,
  finishQuizRound,
  getGrowthStageInfo,
  loadQuizGrowthState,
  pointsUntilNextStage,
  saveQuizGrowthState,
  startNewQuizRound,
  type QuizGrowthState,
} from '../logic/quizGrowth';
import type { QuizQuestion } from '../types';

const allQuestions = quizData as QuizQuestion[];
const featurePath = { map: '/map', decision: '/decision', storage: '/storage' } as const;
const featureLabel = { map: '위험지도로 이동', decision: '맞춤 판정으로 이동', storage: '보관 시뮬레이터로 이동' } as const;

function getBrowserStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export default function QuizPage() {
  const [questions, setQuestions] = useState(() => pickQuestions(allQuestions));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'O' | 'X'>>({});
  const [showReview, setShowReview] = useState(false);
  const [roundGrowthPoints, setRoundGrowthPoints] = useState(0);
  const [celebratingStage, setCelebratingStage] = useState<number>();
  const [growth, setGrowth] = useState<QuizGrowthState>(() => loadQuizGrowthState(getBrowserStorage()));
  const growthRef = useRef(growth);
  const scoredQuestionIds = useRef(new Set<number>());
  const finishedRound = useRef(false);

  useEffect(() => {
    growthRef.current = growth;
    saveQuizGrowthState(getBrowserStorage(), growth);
  }, [growth]);

  useEffect(() => {
    if (!celebratingStage) return undefined;
    const timer = window.setTimeout(() => setCelebratingStage(undefined), 1100);
    return () => window.clearTimeout(timer);
  }, [celebratingStage]);

  const question = questions[index];
  const score = useMemo(() => calculateQuizScore(answers, questions), [answers, questions]);
  const answered = question ? answers[question.id] : undefined;

  const choose = (answer: 'O' | 'X') => {
    if (!question || answered) return;

    setAnswers((previous) => ({ ...previous, [question.id]: answer }));
    if (!canAwardQuestionInRound(scoredQuestionIds.current, question.id, answer === question.answer)) return;

    scoredQuestionIds.current.add(question.id);
    const awarded = applyQuizAnswer(growthRef.current, true);
    growthRef.current = awarded.state;
    setGrowth(awarded.state);
    setRoundGrowthPoints((previous) => previous + awarded.gained);
    if (awarded.stageReached) setCelebratingStage(awarded.stageReached);
  };

  const showResult = () => {
    if (!finishedRound.current) {
      finishedRound.current = true;
      const completed = finishQuizRound(growthRef.current, score);
      growthRef.current = completed;
      setGrowth(completed);
    }
    setShowReview(true);
  };

  const restart = () => {
    setQuestions(pickQuestions(allQuestions));
    setIndex(0);
    setAnswers({});
    setRoundGrowthPoints(0);
    setCelebratingStage(undefined);
    setShowReview(false);
    const preservedGrowth = startNewQuizRound(growthRef.current);
    growthRef.current = preservedGrowth;
    setGrowth(preservedGrowth);
    scoredQuestionIds.current = new Set<number>();
    finishedRound.current = false;
  };

  if (!question || showReview) {
    return <QuizReview questions={questions} answers={answers} score={score} roundGrowthPoints={roundGrowthPoints} growth={growth} onRestart={restart} />;
  }

  return (
    <div className="container page-stack quiz-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">LEARN BY PLAYING</p>
          <h1>해산물 안전<br /><em>O / X 퀴즈</em></h1>
          <p>공식 자료를 바탕으로 한 12개 문제 중 5개가 무작위로 출제됩니다. 정답마다 물고기가 20점씩 성장해요.</p>
        </div>
        <div className="quiz-counter"><BookOpenCheck size={25} /><strong>{index + 1}<small> / {questions.length}</small></strong></div>
      </div>
      <QuizGrowthPanel growth={growth} celebratingStage={celebratingStage} />
      <div className="progress-track"><span style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div>
      <Card className="quiz-card">
        <span className="question-number">QUESTION {String(index + 1).padStart(2, '0')}</span>
        <h2>{question.statement}</h2>
        <div className="ox-buttons" aria-label="정답 선택">
          <button className={`ox-button o ${answered ? (question.answer === 'O' ? 'correct' : answers[question.id] === 'O' ? 'wrong' : '') : ''}`} onClick={() => choose('O')} disabled={Boolean(answered)}><span>O</span> 맞다</button>
          <button className={`ox-button x ${answered ? (question.answer === 'X' ? 'correct' : answers[question.id] === 'X' ? 'wrong' : '') : ''}`} onClick={() => choose('X')} disabled={Boolean(answered)}><span>X</span> 아니다</button>
        </div>
        {answered && (
          <div className={`quiz-feedback ${answered === question.answer ? 'correct' : 'wrong'}`} aria-live="polite">
            <div className="feedback-title">{answered === question.answer ? <><Check size={19} /> 정답이에요! 성장 포인트 +20</> : <><X size={19} /> 아쉬워요. 정답은 {question.answer}입니다.</>}</div>
            <p>{question.explanation}</p>
            <SourceLine name={question.sourceName} url={question.sourceUrl} />
            <Link className="related-link" to={featurePath[question.relatedFeature]}>{featureLabel[question.relatedFeature]} <ArrowRight size={14} /></Link>
          </div>
        )}
        <div className="quiz-next">
          {answered && <button className="primary-button" onClick={index === questions.length - 1 ? showResult : () => setIndex((previous) => previous + 1)}>{index === questions.length - 1 ? '결과 보기' : '다음 문제'} <ArrowRight size={16} /></button>}
        </div>
      </Card>
      <p className="quiz-note">현재 회차의 각 문제는 한 번만 채점됩니다. 다시 풀면 같은 문제도 새 회차의 정답 보상을 받을 수 있어요.</p>
    </div>
  );
}

interface QuizReviewProps {
  questions: QuizQuestion[];
  answers: Record<number, 'O' | 'X'>;
  score: number;
  roundGrowthPoints: number;
  growth: QuizGrowthState;
  onRestart: () => void;
}

function QuizReview({ questions, answers, score, roundGrowthPoints, growth, onRestart }: QuizReviewProps) {
  const stage = getGrowthStageInfo(growth.growthPoints);
  const pointsToNext = pointsUntilNextStage(growth.growthPoints);
  const restartLabel = growth.growthPoints === 500 ? '다시 풀며 해양 상식 복습하기' : '다시 풀고 물고기 키우기';
  const wrongCount = questions.length - score;

  const scrollToWrongAnswers = () => document.getElementById('wrong-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="container page-stack quiz-page">
      <Card className="quiz-result-card">
        <div className="quiz-trophy">🐟</div>
        <p className="eyebrow">QUIZ COMPLETE</p>
        <h1>이번 퀴즈 <em>{score} / {questions.length}</em> 정답</h1>
        <div className="quiz-growth-summary">
          <strong>성장 포인트 +{roundGrowthPoints}</strong>
          <span>누적 성장 포인트 {growth.growthPoints} / 500</span>
          <span>현재 단계: {stage.name}</span>
          <span>{pointsToNext === null ? '모든 성장을 완료했어요!' : `다음 성장까지 ${pointsToNext}점`}</span>
        </div>
        <div className="quiz-result-actions">
          <button className="primary-button" onClick={onRestart}><RotateCcw size={16} /> {restartLabel}</button>
          {wrongCount > 0 && <button className="secondary-button" onClick={scrollToWrongAnswers}>틀린 문제 확인하기</button>}
          <Link className="text-link" to="/"><Home size={15} /> 홈으로 돌아가기</Link>
        </div>
      </Card>
      <QuizGrowthPanel growth={growth} />
      <div id="wrong-review">
      <Card className="wrong-review">
        <div className="section-title"><div><p className="eyebrow">REVIEW</p><h2>{wrongCount > 0 ? '틀린 문제 다시 보기' : '문제별 결과'}</h2></div><span>{score}/{questions.length}</span></div>
        {questions.map((item, itemIndex) => {
          const correct = answers[item.id] === item.answer;
          return <div className={`review-row ${correct ? 'right' : 'wrong'}`} key={item.id}><span className="review-index">{itemIndex + 1}</span><div><strong>{item.statement}</strong><p>{correct ? '정답' : `내 답 ${answers[item.id] ?? '-'} · 정답 ${item.answer}`} · {item.explanation}</p><SourceLine name={item.sourceName} url={item.sourceUrl} /></div><Link to={featurePath[item.relatedFeature]} className="review-arrow" aria-label={featureLabel[item.relatedFeature]}><ArrowRight size={17} /></Link></div>;
        })}
      </Card>
      </div>
    </div>
  );
}

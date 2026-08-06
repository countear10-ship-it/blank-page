import { useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, RotateCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import quizData from '../data/quiz.json';
import { Card, SourceLine } from '../components/UI';
import { calculateQuizScore, pickQuestions } from '../logic/quiz';
import type { QuizQuestion } from '../types';

const allQuestions = quizData as QuizQuestion[];
const featurePath = { map: '/map', decision: '/decision', storage: '/storage' } as const;
const featureLabel = { map: '위험지도로 이동', decision: '맞춤 판정으로 이동', storage: '보관 시뮬레이터로 이동' } as const;

export default function QuizPage() {
  const [questions, setQuestions] = useState(() => pickQuestions(allQuestions));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'O' | 'X'>>({});
  const [showReview, setShowReview] = useState(false);
  const question = questions[index];
  const score = useMemo(() => calculateQuizScore(answers, questions), [answers, questions]);
  const answered = question ? answers[question.id] : undefined;
  const choose = (answer: 'O' | 'X') => { if (question && !answered) setAnswers((prev) => ({ ...prev, [question.id]: answer })); };
  const restart = () => { setQuestions(pickQuestions(allQuestions)); setIndex(0); setAnswers({}); setShowReview(false); };
  if (!question || showReview) return <QuizReview questions={questions} answers={answers} score={score} onRestart={restart} />;
  return <div className="container page-stack quiz-page"><div className="page-intro"><div><p className="eyebrow">LEARN BY PLAYING</p><h1>해산물 안전<br /><em>O / X 퀴즈</em></h1><p>공식 자료를 바탕으로 한 12개 문제 중 5개가 무작위로 출제됩니다.</p></div><div className="quiz-counter"><BookOpenCheck size={25} /><strong>{index + 1}<small> / {questions.length}</small></strong></div></div><div className="progress-track"><span style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div><Card className="quiz-card"><span className="question-number">QUESTION {String(index + 1).padStart(2, '0')}</span><h2>{question.statement}</h2><div className="ox-buttons"><button className={`ox-button o ${answered ? (question.answer === 'O' ? 'correct' : answers[question.id] === 'O' ? 'wrong' : '') : ''}`} onClick={() => choose('O')} disabled={!!answered}><span>O</span> 맞다</button><button className={`ox-button x ${answered ? (question.answer === 'X' ? 'correct' : answers[question.id] === 'X' ? 'wrong' : '') : ''}`} onClick={() => choose('X')} disabled={!!answered}><span>X</span> 아니다</button></div>{answered && <div className={`quiz-feedback ${answered === question.answer ? 'correct' : 'wrong'}`}><div className="feedback-title">{answered === question.answer ? <><Check size={19} /> 정답이에요!</> : <><X size={19} /> 아쉬워요. 정답은 {question.answer}입니다.</>}</div><p>{question.explanation}</p><SourceLine name={question.sourceName} url={question.sourceUrl} /><Link className="related-link" to={featurePath[question.relatedFeature]}>{featureLabel[question.relatedFeature]} <ArrowRight size={14} /></Link></div>}<div className="quiz-next">{answered && <button className="primary-button" onClick={() => setIndex((prev) => prev + 1)}>{index === questions.length - 1 ? '결과 보기' : '다음 문제'} <ArrowRight size={16} /></button>}</div></Card><p className="quiz-note">검증된 문제만 기본 출제되며, 실제 서비스에서는 공식 자료 갱신에 따라 검토합니다.</p></div>;
}

function QuizReview({ questions, answers, score, onRestart }: { questions: QuizQuestion[]; answers: Record<number, 'O' | 'X'>; score: number; onRestart: () => void }) {
  return <div className="container page-stack quiz-page"><Card className="quiz-result-card"><div className="quiz-trophy">🏁</div><p className="eyebrow">QUIZ COMPLETE</p><h1>{questions.length}문제 중 <em>{score}개</em> 정답</h1><p>틀린 문제의 해설과 연결 기능을 다시 확인해보세요.</p><button className="secondary-button" onClick={onRestart}><RotateCcw size={16} /> 다시 풀기</button></Card><Card className="wrong-review"><div className="section-title"><div><p className="eyebrow">REVIEW</p><h2>문제별 결과</h2></div><span>{score}/{questions.length}</span></div>{questions.map((question, index) => { const correct = answers[question.id] === question.answer; return <div className={`review-row ${correct ? 'right' : 'wrong'}`} key={question.id}><span className="review-index">{index + 1}</span><div><strong>{question.statement}</strong><p>{correct ? '정답' : `내 답 ${answers[question.id] ?? '-'} · 정답 ${question.answer}`} · {question.explanation}</p><SourceLine name={question.sourceName} url={question.sourceUrl} /></div><Link to={featurePath[question.relatedFeature]} className="review-arrow" aria-label={featureLabel[question.relatedFeature]}><ArrowRight size={17} /></Link></div>; })}</Card></div>;
}

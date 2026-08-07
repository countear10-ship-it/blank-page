import { CheckCircle2 } from 'lucide-react';
import type { QuizGrowthState } from '../logic/quizGrowth';
import { MAX_GROWTH_POINTS, getGrowthStageInfo, pointsUntilNextStage } from '../logic/quizGrowth';
import GrowthFish from './GrowthFish';

interface QuizGrowthPanelProps {
  growth: QuizGrowthState;
  celebratingStage?: number;
  compact?: boolean;
}

const milestones = [0, 100, 200, 300, 400, 500];

export default function QuizGrowthPanel({ growth, celebratingStage, compact = false }: QuizGrowthPanelProps) {
  const stage = getGrowthStageInfo(growth.growthPoints);
  const nextPoints = pointsUntilNextStage(growth.growthPoints);
  const totalProgress = (growth.growthPoints / MAX_GROWTH_POINTS) * 100;
  const isLegend = growth.growthPoints === MAX_GROWTH_POINTS;

  return (
    <section className={`quiz-growth-panel ${compact ? 'is-compact' : ''}`} aria-label="물고기 성장 현황">
      <div className="growth-fish-wrap">
        <GrowthFish points={growth.growthPoints} celebrating={Boolean(celebratingStage)} compact={compact} />
      </div>
      <div className="growth-copy">
        <p className="growth-stage-badge">{stage.stage}단계 · {stage.name}</p>
        <strong>성장 포인트 {growth.growthPoints} / {MAX_GROWTH_POINTS}</strong>
        <p>{isLegend ? '모든 성장을 완료했어요!' : `다음 성장까지 ${nextPoints}점`}</p>
        {!compact && (
          <div className="growth-track-wrap" aria-label={`성장 진행률 ${growth.growthPoints}점 / ${MAX_GROWTH_POINTS}점`}>
            <div className="growth-track"><span style={{ width: `${totalProgress}%` }} /></div>
            <div className="growth-markers" aria-hidden="true">
              {milestones.map((point) => <span className={point <= growth.growthPoints ? 'is-passed' : ''} key={point}><i />{point}</span>)}
            </div>
          </div>
        )}
      </div>
      {celebratingStage && (
        <div className="stage-celebration" role="status" aria-live="polite">
          <CheckCircle2 size={19} />
          <div>
            <strong>{celebratingStage === 6 ? '최고 단계 달성!' : '새로운 성장 단계 달성!'}</strong>
            <span>{celebratingStage === 6 ? '안심海 전설 수호어가 완성되었어요.' : `${celebratingStage}단계 · ${stage.name}(으)로 성장했어요.`}</span>
          </div>
        </div>
      )}
    </section>
  );
}

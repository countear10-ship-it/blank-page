import { fishScale, getGrowthStageInfo } from '../logic/quizGrowth';

interface GrowthFishProps {
  points: number;
  celebrating?: boolean;
  compact?: boolean;
}

export default function GrowthFish({ points, celebrating = false, compact = false }: GrowthFishProps) {
  const stage = getGrowthStageInfo(points);
  const scale = fishScale(points);
  const stageClass = `fish-stage-${stage.stage}`;

  return (
    <div
      className={`growth-fish ${stageClass} ${celebrating ? 'is-celebrating' : ''} ${compact ? 'is-compact' : ''}`}
      role="img"
      aria-label={`${stage.stage}단계 ${stage.name} 물고기`}
    >
      <svg viewBox="0 0 220 150" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <defs>
          <linearGradient id="fish-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#86ddf5" />
            <stop offset="1" stopColor="#138cb1" />
          </linearGradient>
          <filter id="fish-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {stage.stage >= 5 && <g className="fish-sparkles"><path d="M185 27l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /><path d="M47 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></g>}
        {stage.stage === 6 && <path className="fish-crown" d="M104 19l7 9 9-12 8 12 9-9 2 21h-36z" />}
        <path className="fish-tail" d={stage.stage >= 5 ? 'M41 77 10 45l5 32-18 25 38-5z' : 'M41 77 14 52l6 25-8 23 29-9z'} />
        {stage.stage >= 2 && <path className="fish-top-fin" d="M92 49c7-22 25-28 37-20-9 11-14 23-15 33z" />}
        <ellipse className="fish-body" cx="110" cy="79" rx="70" ry="42" />
        {stage.stage >= 2 && <path className="fish-bottom-fin" d="M113 116c11 7 27 9 38-2-15-6-25-13-34-23z" />}
        {stage.stage >= 3 && <g className="fish-waves"><path d="M72 68c11-8 21 8 32 0s21 8 32 0" /><path d="M69 84c11-8 21 8 32 0s21 8 32 0" /></g>}
        {stage.stage >= 4 && <g className="fish-spots"><circle cx="102" cy="59" r="3" /><circle cx="124" cy="98" r="3" /><circle cx="143" cy="65" r="2.5" /></g>}
        <circle className="fish-eye" cx="151" cy="68" r="7" />
        <circle className="fish-pupil" cx="153" cy="68" r="2.6" />
        <path className="fish-smile" d="M161 89c6 4 12 4 17 0" />
        {stage.stage >= 5 && <g className="fish-bubbles"><circle cx="191" cy="91" r="4" /><circle cx="203" cy="72" r="2.5" /><circle cx="185" cy="54" r="2" /></g>}
      </svg>
    </div>
  );
}

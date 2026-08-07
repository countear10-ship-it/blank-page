import { ExternalLink, Sparkles } from 'lucide-react';
import type { OfficialSourceAnalysis } from '../services/types';

export default function OfficialAnalysisNotice({ analysis }: { analysis?: OfficialSourceAnalysis }) {
  if (!analysis) return null;
  return (
    <aside className="official-analysis-notice" aria-label="공식 원문 보조 분석">
      <Sparkles size={18} aria-hidden="true" />
      <div>
        <strong>최신 공식 원문 참고 정보</strong>
        <p>{analysis.summary}</p>
        <small>식품안전나라 실시간 API 지연 시 식약처 등 공식 원문을 확인해 제공하는 참고 정보입니다. 안전 보장이나 의료 판단이 아닙니다.</small>
        <div className="official-analysis-links">
          {analysis.sourceUrls.slice(0, 2).map((url, index) => <a href={url} target="_blank" rel="noreferrer" key={url}>공식 원문 {index + 1} <ExternalLink size={13} /></a>)}
        </div>
      </div>
    </aside>
  );
}

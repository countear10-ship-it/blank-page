import { AlertTriangle, CheckCircle2, CircleHelp, LoaderCircle, Sparkles } from 'lucide-react';
import type { DataViewState } from '../services/types';

const labels: Record<DataViewState, string> = {
  loading: '공식 데이터 확인 중', latest: '최신 응답 확인됨', assisted: '공식 원문 보조 분석 완료', stale: '마지막 공식 응답 참고', 'no-data': '확인 가능한 데이터 없음', unavailable: '공식 응답 지연', error: '공식 연결 재시도 중', 'manual-confirm': '원문 함께 확인',
};

export default function DataStatusBanner({ state, message, compact = false }: { state: DataViewState; message?: string; compact?: boolean }) {
  const Icon = state === 'loading' ? LoaderCircle : state === 'latest' ? CheckCircle2 : state === 'assisted' ? Sparkles : state === 'manual-confirm' || state === 'stale' ? AlertTriangle : CircleHelp;
  return <div className={`data-status status-${state} ${compact ? 'compact' : ''}`} role="status"><Icon size={16} aria-hidden="true" /><span><strong>{labels[state]}</strong>{!compact && <small>{message ?? (state === 'latest' ? '관측 시각과 수집 시각을 함께 표시합니다.' : state === 'assisted' ? '실시간 API 지연 시 최신 공식 원문을 찾아 요약합니다.' : '확인되지 않은 정보는 안전으로 표시하지 않습니다.')}</small>}</span></div>;
}

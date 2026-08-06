import { AlertTriangle, CheckCircle2, CircleHelp, LoaderCircle } from 'lucide-react';
import type { DataViewState } from '../services/types';

const labels: Record<DataViewState, string> = {
  loading: '공식 데이터 확인 중', latest: '최신 응답 확인됨', stale: '오래된 응답', 'no-data': '데이터 없음', unavailable: '연결 설정 필요', error: '연결 오류', 'manual-confirm': '원문 확인 필요',
};

export default function DataStatusBanner({ state, message, compact = false }: { state: DataViewState; message?: string; compact?: boolean }) {
  const Icon = state === 'loading' ? LoaderCircle : state === 'latest' ? CheckCircle2 : state === 'manual-confirm' || state === 'stale' ? AlertTriangle : CircleHelp;
  return <div className={`data-status status-${state} ${compact ? 'compact' : ''}`} role="status"><Icon size={16} aria-hidden="true" /><span><strong>{labels[state]}</strong>{!compact && <small>{message ?? (state === 'latest' ? '관측 시각과 수집 시각을 함께 표시합니다.' : '확인되지 않은 정보는 안전으로 표시하지 않습니다.')}</small>}</span></div>;
}

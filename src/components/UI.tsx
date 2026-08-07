import { ArrowUpRight, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Region, RiskHistoryPoint, RiskLevel } from '../types';

const riskMeta: Record<RiskLevel, { label: string; color: string; soft: string; icon: string }> = {
  safe: { label: '현재 확인된 특별한 주의정보 없음', color: '#16845b', soft: '#e3f6ee', icon: '●' },
  caution: { label: '주의 필요', color: '#b97805', soft: '#fff4d6', icon: '▲' },
  danger: { label: '채취·섭취 주의', color: '#c84643', soft: '#ffebeb', icon: '!' },
  unknown: { label: '공식 확인 보류', color: '#67758b', soft: '#edf1f5', icon: '○' },
};

export function RiskBadge({ level, compact = false }: { level: RiskLevel; compact?: boolean }) {
  const meta = riskMeta[level];
  return <span className={`risk-badge risk-${level} ${compact ? 'compact' : ''}`}><span aria-hidden="true">{meta.icon}</span> {compact ? meta.label.split(' ')[0] : meta.label}</span>;
}

export function SourceLine({ name, url, date }: { name: string; url: string; date?: string }) {
  return <div className="source-line"><Info size={14} aria-hidden="true" /><span>{date ? `기준일 ${date} · ` : ''}{name}</span><a href={url} target="_blank" rel="noreferrer">원문 <ArrowUpRight size={13} /></a></div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="section-title"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{children}</div>;
}

export function RiskBars({ region, personal, storage, personalConditionCount = 0, regionApplicable = true }: { region: RiskLevel; personal: RiskLevel; storage: RiskLevel; personalConditionCount?: number; regionApplicable?: boolean }) {
  const items = [['지역 위험', region], ['개인 위험', personal], ['보관 위험', storage]] as const;
  const widthFor = (level: RiskLevel) => level === 'safe' ? 30 : level === 'caution' ? 65 : level === 'danger' ? 100 : 50;
  const personalNote = personal === 'danger' ? '알레르기 최우선' : personalConditionCount ? `고위험 조건 ${personalConditionCount}개` : undefined;
  return <div className="risk-bars">{items.map(([label, level]) => {
    const disabled = label === '지역 위험' && !regionApplicable;
    return <div className={`risk-bar-row ${disabled ? 'risk-bar-disabled' : ''}`} key={label}><div><span>{disabled ? '지역 위험 (미적용)' : label}</span><span className="risk-bar-meta">{disabled ? <small>지역 또는 원산지 미확인</small> : <><RiskBadge level={level} compact />{label === '개인 위험' && personalNote && <small>{personalNote}</small>}</>}</span></div><div className="bar-track">{disabled ? <span className="bar-fill fill-disabled" style={{ width: '0%' }} /> : <span className={`bar-fill fill-${level}`} style={{ width: `${widthFor(level)}%` }} />}</div></div>;
  })}</div>;
}

export function RiskHistoryChart({ points, title = '최근 위험 변화', ordinal = false }: { points: RiskHistoryPoint[]; title?: string; ordinal?: boolean }) {
  const max = ordinal ? 3 : Math.max(...points.map((point) => point.value), 100);
  const coords = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${100 - (point.value / max) * 84 - 8}`).join(' ');
  return <div className="chart-wrap"><div className="chart-heading"><strong>{title}</strong><span>{ordinal ? '낮음 · 주의 · 피하기' : '위험 신호 강도'}</span></div><svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}>{[20, 45, 70].map((line) => <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="currentColor" opacity=".12" strokeWidth=".6" />)}<polyline points={coords} fill="none" stroke="#0f8f8d" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => <circle key={point.date} cx={(index / Math.max(points.length - 1, 1)) * 100} cy={100 - (point.value / max) * 84 - 8} r="2.2" fill={riskMeta[point.level].color} vectorEffect="non-scaling-stroke"><title>{point.date} {point.label}{ordinal ? '' : ` ${point.value}`}</title></circle>)}</svg><div className="chart-labels">{points.map((point) => <span key={point.date}>{point.date}</span>)}</div></div>;
}

export function TrustNotice() { return <div className="trust-notice"><ShieldAlert size={18} aria-hidden="true" /><div><strong>안전 보장이 아닌 정보 지원</strong><p>안심海는 의료 진단이나 안전 보증 서비스가 아닙니다. 최신 공식 원문과 판매처 안내를 함께 확인하세요.</p></div></div>; }

export function RiskSummaryCard({ region }: { region: Region }) {
  return <Card className="region-summary-card"><div className="card-topline"><RiskBadge level={region.riskLevel} /></div><h3>{region.name}</h3><p>{region.summary}</p><div className="mini-facts"><span><b>관련 해산물</b>{region.affectedSeafood.join(' · ')}</span><span><b>수온·환경</b>{region.waterTemperature}</span><span><b>패류독소</b>{region.toxinStatus}</span><span><b>검사 정보</b>{region.radiationStatus}</span></div><p className="recommendation"><strong>필요한 행동</strong>{region.recommendation}</p><SourceLine name={region.sourceName} url={region.sourceUrl} date={region.updatedAt} /></Card>;
}

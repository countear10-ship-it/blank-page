import { Activity, ArrowRight, CheckCircle2, Clock3, Fish, MapPinned, Radio, ShieldCheck, Snowflake, Sparkles, Waves } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QuizGrowthPanel from '../components/QuizGrowthPanel';
import { Card, RiskBadge, SectionTitle, SourceLine, TrustNotice } from '../components/UI';
import DataStatusBanner from '../components/DataStatusBanner';
import regions from '../data/regions.json';
import { loadQuizGrowthState } from '../logic/quizGrowth';
import { fetchRealtimeSnapshot } from '../services/api';
import type { ApiResponse, RealtimeSnapshot } from '../services/types';
import type { Region } from '../types';

const typedRegions = regions as Region[];

export default function HomePage() {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizGrowth] = useState(() => loadQuizGrowthState(typeof window === 'undefined' ? undefined : window.localStorage));

  useEffect(() => {
    let active = true;
    fetchRealtimeSnapshot('해산물').then((data) => {
      if (active) setSnapshot(data);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const latestFetchedAt = snapshot ? [snapshot.marine.fetchedAt, snapshot.recalls.fetchedAt, snapshot.shellfish.fetchedAt].sort().at(-1) : undefined;

  return (
    <div className="container home-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="wave-dot" />부산 해산물 안전정보 한눈에</div>
          <h1>오늘 이 해산물,<br /><em>먹어도 될까?</em></h1>
          <p>지역 위험, 개인 주의조건, 보관 상태를 한 번에 살펴보고 현재 확인된 공식 정보 기준의 행동을 제안받으세요.</p>
          <div className="hero-actions">
            <Link to="/decision" className="primary-button large">먹어도 될까? 판정하기 <ArrowRight size={18} /></Link>
            <Link to="/map" className="secondary-button large">부산 위험지도 보기 <MapPinned size={17} /></Link>
          </div>
          <div className="hero-meta"><span><CheckCircle2 size={15} /> 브라우저에서만 처리</span><span><ShieldCheck size={15} /> 데이터 없으면 판단 보류</span></div>
        </div>
        <div className="hero-visual">
          <div className="ocean-graphic" aria-hidden="true"><div className="fish-scene"><Fish className="hero-fish hero-fish-main" size={104} strokeWidth={1.7} /><Fish className="hero-fish hero-fish-small" size={49} strokeWidth={1.9} /><span className="fish-bubble fb1" /><span className="fish-bubble fb2" /><span className="fish-bubble fb3" /></div></div>
          <div className="hero-note"><span>데이터 기준</span><strong>공식 원문</strong><small>관측·수집 시각 함께 표시</small></div>
          <div className="hero-signal"><Activity size={15} /><span>현재 연결 상태</span><b>{loading ? '확인 중' : snapshot ? '응답 확인' : '확인 불가'}</b></div>
        </div>
      </section>

      <section className="live-status-section" aria-labelledby="live-status-title">
        <div className="live-status-heading"><div><p className="eyebrow">LIVE DATA CHECK</p><h2 id="live-status-title">오늘의 해양 안전정보</h2></div><span className="last-updated"><Clock3 size={14} />{latestFetchedAt ? `마지막 갱신 ${formatDate(latestFetchedAt)}` : '갱신 시각 확인 전'}</span></div>
        <div className="live-status-grid"><LiveStatus icon={<Waves size={18} />} label="해양관측" response={snapshot?.marine} loading={loading} /><LiveStatus icon={<Radio size={18} />} label="수산물 회수정보" response={snapshot?.recalls} loading={loading} /><LiveStatus icon={<Activity size={18} />} label="패류독소 발표" response={snapshot?.shellfish} loading={loading} /></div>
      </section>

      <TrustNotice />
      <section className="home-section">
        <SectionTitle eyebrow="BUSAN COAST WATCH" title="부산 연안 주의정보"><Link className="text-link" to="/map">전체 지도 보기 <ArrowRight size={15} /></Link></SectionTitle>
        <div className="summary-grid"><Card className="summary-highlight"><div className="summary-icon"><MapPinned size={22} /></div><strong>{typedRegions.length}개 지역</strong><span>기장부터 다대포까지</span><b className="warning-text">실시간 응답 후 지역별 상태 갱신</b><Link to="/map" className="inline-link">공식 원문 확인 <ArrowRight size={14} /></Link></Card>{typedRegions.slice(0, 3).map((region) => <div className="region-row" key={region.id}><div className="region-pin pin-unknown" /><div><strong>{region.name}</strong><span>정적 지역 위치 정보 · 최신 응답 확인 필요</span></div><RiskBadge level="unknown" compact /></div>)}</div>
      </section>

      <section className="home-section">
        <SectionTitle eyebrow="MAKE A SAFER CHOICE" title="안심海가 도와드리는 것" />
        <div className="feature-grid"><FeatureCard icon={<MapPinned />} title="부산 위험지도" text="패류독소 속보·회수정보·해양환경 응답을 원문 링크와 함께 확인해요." to="/map" accent="teal" /><FeatureCard icon={<Fish />} title="먹어도 될까?" text="해산물·지역·생식 여부·개인 조건을 규칙 엔진으로 조합해 행동을 안내해요." to="/decision" accent="coral" featured /><FeatureCard icon={<Snowflake />} title="보관 시뮬레이터" text="사진은 내 기기에서만 처리하고, 시간·온도별 외관 변화를 교육용으로 보여줘요." to="/storage" accent="blue" /></div>
      </section>

      <section className="quiz-callout">
        <div><div className="eyebrow">5-MINUTE LEARNING</div><h2>해산물 안전, 퀴즈로<br />가볍게 확인해볼까요?</h2><p>공식 자료를 바탕으로 만든 O/X 5문제. 틀린 문제는 관련 기능으로 다시 연결됩니다.</p></div>
        <QuizGrowthPanel growth={quizGrowth} compact />
        <div className="quiz-art"><Sparkles size={30} /><span>O / X</span></div>
        <Link to="/quiz" className="secondary-button">퀴즈 풀기 <ArrowRight size={16} /></Link>
      </section>

      <section className="data-footnote"><DataStatusBanner state="unavailable" compact /><p>GitHub Pages에는 API 키를 넣지 않습니다. 실시간 데이터가 연결되기 전에는 수온·패류독소·회수 여부를 임의로 채우지 않으며, 지도와 판정 화면에서 판단을 보류합니다.</p><SourceLine name="국립수산과학원 패류독소 속보" url="https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5" /></section>
    </div>
  );
}

function LiveStatus({ icon, label, response, loading }: { icon: React.ReactNode; label: string; response?: ApiResponse<unknown>; loading: boolean }) {
  const state = loading ? 'loading' : response?.status === 'success' ? 'latest' : response?.status === 'error' ? 'error' : response?.status === 'unavailable' ? 'unavailable' : 'no-data';
  return <div className="live-status-card"><span className="live-status-icon">{icon}</span><div><strong>{label}</strong><DataStatusBanner state={state} compact /></div></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '시각 확인 불가' : date.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function FeatureCard({ icon, title, text, to, accent, featured = false }: { icon: React.ReactNode; title: string; text: string; to: string; accent: string; featured?: boolean }) {
  return <Link to={to} className={`feature-card accent-${accent} ${featured ? 'featured' : ''}`}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p><span className="feature-more">자세히 보기 <ArrowRight size={14} /></span></Link>;
}

import { BookOpenCheck, ClipboardCheck, Home, Info, Map, Menu, Snowflake, Waves, X } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
  { to: '/', label: '홈', icon: Home },
  { to: '/map', label: '위험지도', icon: Map },
  { to: '/decision', label: '먹어도 될까?', icon: ClipboardCheck },
  { to: '/storage', label: '보관 시뮬레이터', icon: Snowflake },
  { to: '/quiz', label: '안전 퀴즈', icon: BookOpenCheck },
  { to: '/about', label: '서비스 소개', icon: Info },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return <div className="app-shell"><header className="topbar"><Link to="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark" aria-hidden="true"><Waves size={22} /></span><span><strong>안심海</strong><small>SeaSafe Busan</small></span></Link><button className="menu-toggle" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav id="primary-navigation" className={`desktop-nav ${open ? 'mobile-open' : ''}`} aria-label="주 메뉴">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={17} />{label}</NavLink>)}</nav></header><main className="page-content"><Outlet /></main><nav className="bottom-nav" aria-label="모바일 주요 메뉴">{navItems.slice(0, 5).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={18} /><span>{label === '먹어도 될까?' ? '판정' : label.replace(' 시뮬레이터', '')}</span></NavLink>)}</nav><footer className="site-footer">안심海 · 부산 시민과 관광객을 위한 개인 맞춤형 해산물 섭취 의사결정 지원</footer></div>;
}

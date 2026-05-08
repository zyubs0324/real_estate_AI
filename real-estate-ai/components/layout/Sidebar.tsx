'use client'

// apple.md §12 — 사이드바 글래스모피즘
// 인라인 스타일 사용: Tailwind v4 globals.css 클래스 번들링 이슈 우회

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// apple.md §12 스타일 상수
const S = {
  sidebar: {
    width: 240,
    height: '100vh',
    position: 'fixed' as const,
    left: 0,
    top: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 100,
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
  },
  logoArea: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#0071e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    margin: 0,
  },
  nav: {
    flex: 1,
    overflowY: 'auto' as const,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: '12px 20px 4px',
    display: 'block',
  },
  linkBase: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    borderLeft: '3px solid transparent',
    textDecoration: 'none',
    transition: 'color 150ms ease, background 150ms ease',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  linkActive: {
    color: '#ffffff',
    background: 'rgba(255, 255, 255, 0.12)',
    borderLeft: '3px solid #ffffff',
  },
  footer: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
}

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      {
        label: '대시보드',
        href: '/dashboard',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
    ],
  },
  {
    label: 'CRM',
    items: [
      {
        label: '매물',
        href: '/properties',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
      },
      {
        label: '인물',
        href: '/people',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
      },
      {
        label: '거래',
        href: '/transactions',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
      },
      {
        label: '일정',
        href: '/schedules',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      },
      {
        label: '타부동산',
        href: '/agencies',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
      },
    ],
  },
  {
    label: 'AI 도구',
    items: [
      {
        label: '진단 리포트',
        href: '/report',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      },
      {
        label: 'AI 질의응답',
        href: '/ai-chat',
        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />,
      },
    ],
  },
]

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      style={{ flexShrink: 0, opacity: 'inherit' }}>
      {children}
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={S.sidebar}>
      {/* 로고 */}
      <div style={S.logoArea}>
        <div style={S.logoIcon}>
          <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <p style={S.logoTitle}>부동산 AI</p>
          <p style={S.logoSub}>어시스턴트</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav style={S.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label ?? 'main'}>
            {section.label && (
              <span style={S.sectionLabel}>{section.label}</span>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    ...S.linkBase,
                    ...(isActive ? S.linkActive : {}),
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = '#ffffff'
                      el.style.background = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = 'rgba(255,255,255,0.65)'
                      el.style.background = 'transparent'
                    }
                  }}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* 하단 — 관리자 설정 */}
      <div style={S.footer}>
        <Link
          href="/admin"
          style={{
            ...S.linkBase,
            ...(pathname.startsWith('/admin') ? S.linkActive : {}),
          }}
        >
          <NavIcon>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </NavIcon>
          관리자 설정
        </Link>
      </div>
    </aside>
  )
}

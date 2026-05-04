'use client'

// apple.md §12 — 페이지 헤더 글래스모피즘 (인라인 스타일)

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header
      role="banner"
      style={{
        background: 'rgba(245, 245, 247, 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
      }}
    >
      {/* 페이지 제목 — apple.md §3: 17px weight 600 near-black */}
      <h1 style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 알림 벨 — 미디어 컨트롤 스타일 (apple.md §4) */}
        <button
          aria-label="알림"
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            background: 'rgba(210, 210, 215, 0.64)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(0,0,0,0.48)',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* 사용자 아바타 */}
        <button
          aria-label="사용자 메뉴"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 20,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 28, height: 28,
            borderRadius: '50%',
            background: '#0071e3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}>관</span>
          </div>
          <svg width="12" height="12" fill="none" stroke="rgba(0,0,0,0.4)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </header>
  )
}

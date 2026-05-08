// apple.md §11 — 상태 색상 시스템
// U2-1: 위험 태그 배지 컴포넌트

export type RiskLevel = 'danger' | 'warning' | 'safe' | 'pending'

interface RiskBadgeProps {
  level: RiskLevel
  label: string
}

const COLORS: Record<RiskLevel, { background: string; color: string }> = {
  danger:  { background: '#ff3b30', color: '#ffffff' },
  warning: { background: '#ff9f0a', color: '#ffffff' },
  safe:    { background: '#34c759', color: '#ffffff' },
  pending: { background: '#636366', color: '#ffffff' },
}

export default function RiskBadge({ level, label }: RiskBadgeProps) {
  const { background, color } = COLORS[level]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background,
        color,
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 6,
        padding: '3px 9px',
        whiteSpace: 'nowrap' as const,
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
      }}
      aria-label={`${label} (${level})`}
    >
      {label}
    </span>
  )
}

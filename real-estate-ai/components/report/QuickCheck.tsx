// apple.md §11, §14 — Quick Check 결과 카드
// U2-1: 위험 태그 목록 + 확인일자 표시

import RiskBadge, { type RiskLevel } from './RiskBadge'

export interface QuickCheckItem {
  label: string
  level: RiskLevel
}

export interface QuickCheckResult {
  items: QuickCheckItem[]
  checkedAt: string
}

interface QuickCheckProps {
  result: QuickCheckResult | null
}

const S = {
  wrap: {
    marginTop: 12,
    padding: '16px 20px',
    background: '#f5f5f7',
    borderRadius: 10,
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(0, 0, 0, 0.48)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  date: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.35)',
  },
  badges: {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  allClear: {
    fontSize: 14,
    color: '#34c759',
    fontWeight: 600,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
}

export default function QuickCheck({ result }: QuickCheckProps) {
  if (!result) return null

  const hasRisk = result.items.length > 0

  return (
    <div style={S.wrap} role="region" aria-label="Quick Check 결과">
      <div style={S.header}>
        <span style={S.title}>Quick Check</span>
        <span style={S.date}>{result.checkedAt} 기준</span>
      </div>

      {hasRisk ? (
        <div style={S.badges}>
          {result.items.map((item, idx) => (
            <RiskBadge key={idx} level={item.level} label={item.label} />
          ))}
        </div>
      ) : (
        <div style={S.allClear}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M5 13l4 4L19 7" />
          </svg>
          이상없음
        </div>
      )}
    </div>
  )
}

/**
 * 디자인 토큰 — apple.md 공식 디자인 시스템
 *
 * UI 컴포넌트에서 색상·간격·그림자 값을 직접 하드코딩하지 말고
 * 이 파일에서 import해서 사용하라.
 *
 * 전체 명세: E:\real_estate_AI\docs\apple.md
 */

// ============================================================
// 색상 — apple.md §2
// ============================================================

/** 유일한 인터랙티브 액센트. 버튼·링크·포커스·선택 상태에만 사용. (apple.md §2) */
export const APPLE_BLUE = '#0071e3'

/** 밝은 배경 인라인 링크 (apple.md §2) */
export const LINK_BLUE = '#0066cc'

/** 어두운 배경 링크 (apple.md §2) */
export const LINK_BLUE_DARK = '#2997ff'

/** 페이지·섹션·카드 배경 — white가 아님 (apple.md §2) */
export const LIGHT_GRAY = '#f5f5f7'

/** 기본 텍스트. pure black(#000)보다 따뜻함 (apple.md §2) */
export const NEAR_BLACK = '#1d1d1f'

// ============================================================
// 시스템 상태 색상 — iOS HIG (apple.md §11)
// ============================================================

/** 완료·납부완료·안전·위험없음 */
export const SUCCESS = '#34c759'
export const SUCCESS_LIGHT = '#d1f5db'

/** 경고·만료임박·집중관리 */
export const WARNING = '#ff9f0a'
export const WARNING_LIGHT = '#fff3d1'

/** 위험·오류·압류·경매·위반건축물 */
export const DANGER = '#ff3b30'
export const DANGER_LIGHT = '#ffe5e3'

/** 미진단·비활성·선택해제 */
export const NEUTRAL = '#636366'
export const NEUTRAL_LIGHT = '#f2f2f7'

/** 정보·안내 */
export const INFO = '#5ac8fa'
export const INFO_LIGHT = '#e5f6fe'

// ============================================================
// 사이드바 (apple.md §12)
// ============================================================

export const SIDEBAR = {
  width: 240,
  background: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'saturate(180%) blur(20px)',
  borderRight: '1px solid rgba(255, 255, 255, 0.08)',

  link: {
    default: 'rgba(255, 255, 255, 0.65)',
    hover: {
      color: '#ffffff',
      background: 'rgba(255, 255, 255, 0.08)',
    },
    active: {
      color: '#ffffff',
      background: 'rgba(255, 255, 255, 0.12)',
      borderLeft: '3px solid #ffffff',
    },
  },

  sectionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: '0.08em',
  },
} as const

// ============================================================
// 헤더 (apple.md §12)
// ============================================================

export const HEADER = {
  background: 'rgba(245, 245, 247, 0.85)',
  backdropFilter: 'saturate(180%) blur(20px)',
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  height: 56,
} as const

// ============================================================
// 카드 (apple.md §14, §20)
// ============================================================

export const CARD = {
  background: '#ffffff',
  borderRadius: 12,
  /** border 사용 금지 — Apple은 border 대신 shadow로 구분 */
  shadow: 'rgba(0, 0, 0, 0.06) 0 1px 4px',
} as const

/** 제품 카드 강조 그림자 (apple.md §2) */
export const CARD_SHADOW_ELEVATED = 'rgba(0, 0, 0, 0.22) 3px 5px 30px 0px'

// ============================================================
// Border Radius (apple.md §5)
// ============================================================

export const RADIUS = {
  micro: 5,      // 소형 컨테이너, 태그
  standard: 8,   // 버튼, 카드, 이미지
  input: 11,     // 검색·필터 인풋
  large: 12,     // 패널, 라이프스타일 이미지
  pill: 980,     // "Learn more" / CTA 링크 — Apple 시그니처
  circle: '50%', // 미디어 컨트롤
} as const

// ============================================================
// 배지 & 태그 색상 (apple.md §15)
// ============================================================

/** 위험 태그 — 매물 리스트 즉시 식별용 */
export const RISK_TAGS = {
  위반:       { bg: '#ffe5e3', text: '#cc2c23' },
  경매:       { bg: '#ffe5e3', text: '#cc2c23' },
  압류:       { bg: '#ffe5e3', text: '#cc2c23' },
  근저당:     { bg: '#fff0d9', text: '#c67800' },
  가처분:     { bg: '#fff0d9', text: '#c67800' },
  임차권등기: { bg: '#fff0d9', text: '#c67800' },
  신탁:       { bg: '#f2f2f7', text: '#3a3a3c' },
  토지거래허가: { bg: '#e5f0ff', text: '#0051a8' },
  재개발재건축: { bg: '#f0e5ff', text: '#6200a8' },
  투기과열:   { bg: '#e5f0ff', text: '#0051a8' },
} as const

/** 매물 라벨 (pill shape) */
export const PROPERTY_LABELS = {
  우리매물: { bg: '#0071e3',             text: '#ffffff' },
  관심매물: { bg: 'rgba(0,113,227,0.1)', text: '#0051a8' },
  집중관리: { bg: '#ff9f0a',             text: '#ffffff' },
} as const

/** 거래 상태 칩 */
export const TX_STATUS = {
  완료:     { bg: '#d1f5db', text: '#1a7a34' },
  진행중:   { bg: '#e5f0ff', text: '#0051a8' },
  만료예정: { bg: '#fff3d1', text: '#a05c00' },
  공실:     { bg: '#f2f2f7', text: '#636366' },
  파기:     { bg: '#ffe5e3', text: '#cc2c23' },
} as const

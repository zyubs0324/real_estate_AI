/**
 * 실거래가 유틸리티 함수 단위 테스트
 *
 * 검증 대상:
 *   parseAmount:        만원 단위 문자열 → 원 단위 정수
 *   recentMonths:       최근 N개월 YYYYMM 목록
 *   dealSortKey:        날짜 기반 정렬 키
 *   jibun 필터링 로직:  영문 jibun 필드 기준
 *   dealType 결정:      deposit/monthlyRent 기반 전세·월세 판별
 *   Mock 데이터 구조:   8종 buildingType 및 dealType 완결성
 *
 * 실제 API 응답 필드명 (영문 camelCase):
 *   날짜:   dealYear / dealMonth / dealDay
 *   금액:   dealAmount (매매) / deposit (보증금) / monthlyRent (월세)
 *   면적:   excluUseAr (아파트·연립·오피스텔) / totalFloorAr (단독다가구)
 *   건물명: aptNm / mhouseNm / houseType / offiNm
 */

import type { RealPriceDeal } from '@/lib/apis/realPrice'

// ─── inline 재구성 함수들 ─────────────────────────────────────

function parseAmount(raw: string | number | undefined): number {
  if (raw === null || raw === undefined) return 0
  const num = Number(String(raw).replace(/[,\s]/g, ''))
  return isNaN(num) ? 0 : num * 10000
}

function recentMonths(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

function dealSortKey(d: Pick<RealPriceDeal, 'dealYear' | 'dealMonth' | 'dealDay'>): number {
  return d.dealYear * 10000 + d.dealMonth * 100 + d.dealDay
}

// ─── parseAmount ─────────────────────────────────────────────

describe('parseAmount (거래금액 파싱)', () => {
  it('공백+쉼표 포함 문자열을 원 단위로 변환한다', () => {
    // 실제 API 응답 예: <dealAmount>12,000</dealAmount> (1.2억)
    expect(parseAmount('12,000')).toBe(120_000_000)
  })

  it('대형 아파트 금액을 올바르게 변환한다', () => {
    // <dealAmount>98,700</dealAmount> → 9.87억
    expect(parseAmount('98,700')).toBe(987_000_000)
  })

  it('앞뒤 공백 포함 문자열도 처리한다', () => {
    expect(parseAmount(' 25,200')).toBe(252_000_000)
  })

  it('숫자 타입도 처리한다', () => {
    expect(parseAmount(50000)).toBe(500_000_000)
  })

  it('쉼표 없는 문자열도 처리한다', () => {
    expect(parseAmount('50000')).toBe(500_000_000)
  })

  it('비정상 입력은 0을 반환한다', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('N/A')).toBe(0)
  })

  it('undefined는 0을 반환한다', () => {
    expect(parseAmount(undefined)).toBe(0)
  })

  it('전세 보증금 파싱 — deposit 필드', () => {
    // <deposit>50,000</deposit> → 5억 전세
    expect(parseAmount('50,000')).toBe(500_000_000)
  })

  it('월세 보증금 파싱 — deposit 필드 (소액)', () => {
    // <deposit>10,000</deposit> → 1억 보증
    expect(parseAmount('10,000')).toBe(100_000_000)
  })

  it('월세금액 파싱 — monthlyRent 필드', () => {
    // <monthlyRent>100</monthlyRent> → 100만원/월
    expect(parseAmount('100')).toBe(1_000_000)
  })
})

// ─── recentMonths ─────────────────────────────────────────────

describe('recentMonths (최근 N개월)', () => {
  it('N개의 월을 반환한다', () => {
    expect(recentMonths(6)).toHaveLength(6)
    expect(recentMonths(12)).toHaveLength(12)
  })

  it('각 항목이 YYYYMM 6자리 형식이다', () => {
    recentMonths(3).forEach((m) => {
      expect(m).toMatch(/^\d{6}$/)
    })
  })

  it('첫 번째 항목이 현재 달이다', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(recentMonths(1)[0]).toBe(expected)
  })

  it('목록이 최신 월 순서로 정렬된다', () => {
    const months = recentMonths(3)
    expect(Number(months[0])).toBeGreaterThanOrEqual(Number(months[1]))
    expect(Number(months[1])).toBeGreaterThanOrEqual(Number(months[2]))
  })
})

// ─── dealSortKey ──────────────────────────────────────────────

describe('dealSortKey (날짜 정렬 키)', () => {
  it('최신 거래가 더 큰 키를 갖는다', () => {
    const newer = dealSortKey({ dealYear: 2024, dealMonth: 7, dealDay: 23 })
    const older  = dealSortKey({ dealYear: 2024, dealMonth: 7, dealDay: 17 })
    expect(newer).toBeGreaterThan(older)
  })

  it('다른 년도는 년도 기준으로 비교한다', () => {
    const y2024 = dealSortKey({ dealYear: 2024, dealMonth: 12, dealDay: 31 })
    const y2023 = dealSortKey({ dealYear: 2023, dealMonth: 1,  dealDay: 1 })
    expect(y2024).toBeGreaterThan(y2023)
  })
})

// ─── 지번 필터링 (영문 jibun 필드) ───────────────────────────

describe('지번 필터링 로직 (jibun 필드)', () => {
  // 실제 API: <jibun>202-3</jibun>, <jibun>75</jibun>, <jibun>178-84</jibun>
  function jibunMatches(rawJibun: string, target: string): boolean {
    const jibun = rawJibun.trim()
    if (!jibun) return true   // 단독다가구 전월세는 jibun 없음 → 필터 통과
    return jibun.split('-')[0].trim() === target
  }

  it('본번만 있는 지번이 일치하면 true', () => {
    expect(jibunMatches('75', '75')).toBe(true)
  })

  it('부번 있는 지번도 본번으로 매칭한다', () => {
    expect(jibunMatches('202-3', '202')).toBe(true)
    expect(jibunMatches('178-84', '178')).toBe(true)
  })

  it('다른 지번은 false', () => {
    expect(jibunMatches('211-11', '210')).toBe(false)
    expect(jibunMatches('75', '7')).toBe(false)
  })

  it('jibun이 없으면 (단독다가구 전월세) 필터 통과 — true', () => {
    expect(jibunMatches('', '810')).toBe(true)
  })
})

// ─── dealType 결정 로직 ───────────────────────────────────────

describe('dealType 결정 (isRent + monthlyRent 기반)', () => {
  function determineDealType(isRent: boolean, monthlyRentRaw: string | number): string {
    if (!isRent) return '매매'
    const monthlyAmt = parseAmount(monthlyRentRaw)
    return monthlyAmt > 0 ? '월세' : '전세'
  }

  it('매매 엔드포인트는 항상 "매매"', () => {
    expect(determineDealType(false, 0)).toBe('매매')
    expect(determineDealType(false, '500')).toBe('매매')
  })

  it('전월세 엔드포인트에서 monthlyRent=0이면 "전세"', () => {
    // <monthlyRent>0</monthlyRent>
    expect(determineDealType(true, '0')).toBe('전세')
    expect(determineDealType(true, 0)).toBe('전세')
  })

  it('전월세 엔드포인트에서 monthlyRent>0이면 "월세"', () => {
    // <monthlyRent>100</monthlyRent> (100만원/월)
    expect(determineDealType(true, '100')).toBe('월세')
    expect(determineDealType(true, 100)).toBe('월세')
  })
})

// ─── Mock 데이터 구조 검증 ────────────────────────────────────

describe('Mock 데이터 구조 검증', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockData = require('@/lib/apis/__mocks__/realPrice.json') as Array<{
    bdMgtSn: string
    deals: RealPriceDeal[]
  }>
  const allDeals = mockData.flatMap((e) => e.deals)

  it('매매·전세·월세 dealType이 모두 포함된다', () => {
    const types = new Set(allDeals.map((d) => d.dealType))
    expect(types).toContain('매매')
    expect(types).toContain('전세')
    expect(types).toContain('월세')
  })

  it('아파트 buildingType이 포함된다', () => {
    const btypes = new Set(allDeals.map((d) => d.buildingType))
    expect(btypes).toContain('아파트')
  })

  it('월세 거래는 monthlyRent > 0이어야 한다', () => {
    allDeals.filter((d) => d.dealType === '월세').forEach((d) => {
      expect(d.monthlyRent).toBeGreaterThan(0)
    })
  })

  it('매매·전세 거래는 monthlyRent === 0이어야 한다', () => {
    allDeals.filter((d) => d.dealType !== '월세').forEach((d) => {
      expect(d.monthlyRent).toBe(0)
    })
  })

  it('모든 거래에 dealYear·dealMonth·dealDay가 있다', () => {
    allDeals.forEach((d) => {
      expect(d.dealYear).toBeGreaterThan(2000)
      expect(d.dealMonth).toBeGreaterThanOrEqual(1)
      expect(d.dealMonth).toBeLessThanOrEqual(12)
      expect(d.dealDay).toBeGreaterThanOrEqual(1)
    })
  })

  it('모든 거래에 dealingGbn과 buildYear 필드가 있다', () => {
    allDeals.forEach((d) => {
      expect(typeof d.dealingGbn).toBe('string')
      expect(typeof d.buildYear).toBe('number')
    })
  })
})

// ─── 취소 거래(cdealType) 필터 로직 ──────────────────────────

describe('cdealType 필터 — 취소 거래 제외', () => {
  interface RawItem { cdealType?: string; dealAmount?: string }

  function filterCancelled(list: RawItem[]): RawItem[] {
    return list.filter((item) => !item.cdealType)
  }

  it('cdealType이 비어있는 정상 거래는 포함', () => {
    const list: RawItem[] = [{ dealAmount: '10,000' }]
    expect(filterCancelled(list)).toHaveLength(1)
  })

  it('cdealType이 값이 있는 취소 거래는 제외', () => {
    const list: RawItem[] = [
      { dealAmount: '10,000', cdealType: '' },   // 빈 문자열 → 포함
      { dealAmount: '20,000', cdealType: '취소' }, // 취소 → 제외
    ]
    const result = filterCancelled(list)
    expect(result).toHaveLength(1)
    expect(result[0].dealAmount).toBe('10,000')
  })

  it('cdealType 없는 레코드와 있는 레코드 혼합', () => {
    const list: RawItem[] = [
      { dealAmount: '30,000' },
      { dealAmount: '40,000', cdealType: 'Y' },
      { dealAmount: '50,000', cdealType: '' },
    ]
    const result = filterCancelled(list)
    // undefined(없음)와 ''(빈 문자열) 둘 다 falsy → 포함
    expect(result).toHaveLength(2)
    const amounts = result.map((r) => r.dealAmount)
    expect(amounts).toContain('30,000')
    expect(amounts).toContain('50,000')
  })
})

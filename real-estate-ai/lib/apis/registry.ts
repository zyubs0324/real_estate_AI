/**
 * 등기정보광장 API (data.iros.go.kr)
 * Mock 모드: NEXT_PUBLIC_USE_MOCK_API=true → __mocks__/registry.json 반환
 * 실제 모드: IROS_API_KEY 필요
 *
 * 추출 항목: 근저당·압류·경매·신탁·임차권등기
 */

import type { RiskLevel } from '@/components/report/RiskBadge'

export interface RegistryResult {
  bdMgtSn: string               // 건물관리번호
  hasMortgage: boolean          // 근저당
  hasSeizure: boolean           // 압류
  hasAuction: boolean           // 경매
  hasTrust: boolean             // 신탁
  hasLeaseRegistration: boolean // 임차권등기
  mortgageAmount: number        // 근저당 설정금액 합계 (원)
  checkedAt: string             // 조회일 (YYYY-MM-DD)
}

export interface RiskItem {
  label: string
  level: RiskLevel
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'

export async function fetchRegistry(bdMgtSn: string): Promise<RegistryResult | null> {
  if (!bdMgtSn) return null

  if (USE_MOCK) {
    const mockData = await import('./__mocks__/registry.json')
    const results = mockData.default as RegistryResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  // 실제 API 호출
  const apiKey = process.env.IROS_API_KEY
  if (!apiKey) {
    console.warn('[registry] IROS_API_KEY 미설정 — Mock 모드로 폴백')
    const mockData = await import('./__mocks__/registry.json')
    const results = mockData.default as RegistryResult[]
    return results.find((item) => item.bdMgtSn === bdMgtSn) ?? null
  }

  // ============================================================
  // [DEFERRED] 실제 등기정보광장 API 연동
  // Phase: 2 (U2-2 실제 API 키 발급 후 활성화)
  // API: https://data.iros.go.kr
  // 활성화 방법:
  //   1. IROS_API_KEY 환경변수 설정
  //   2. 아래 주석 해제
  // ============================================================
  // const res = await fetch(`https://data.iros.go.kr/...?key=${apiKey}&bdMgtSn=${bdMgtSn}`)
  // const json = await res.json()
  // return parseRegistryResponse(json, bdMgtSn)

  return null
}

/** RegistryResult → QuickCheck RiskItem 배열 변환 */
export function toRiskItems(result: RegistryResult): RiskItem[] {
  const items: RiskItem[] = []
  if (result.hasMortgage) items.push({ label: '근저당', level: 'warning' })
  if (result.hasSeizure)  items.push({ label: '압류',   level: 'danger' })
  if (result.hasAuction)  items.push({ label: '경매',   level: 'danger' })
  if (result.hasTrust)    items.push({ label: '신탁',   level: 'warning' })
  if (result.hasLeaseRegistration) items.push({ label: '임차권등기', level: 'warning' })
  return items
}

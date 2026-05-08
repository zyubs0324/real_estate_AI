/**
 * 규제지역 판별 — 행정구역명 기반
 * U2-3: 투기과열지구·조정대상지역·토지거래허가구역
 *
 * 데이터: data/*.json (국토교통부·서울시 고시 기준)
 * 갱신 주기: 고시 변경 시 data/*.json 업데이트
 *
 * 한계:
 *   - 읍면동 단위까지만 판별 가능 (필지·호수 단위 불가)
 *   - 고시 변경 후 수동 업데이트 필요
 *   - 정확한 경계는 공식 고시문 확인 필수
 */

import speculativeData from '@/data/speculative-zones.json'
import adjustmentData from '@/data/adjustment-zones.json'
import landTransactionData from '@/data/land-transaction-zones.json'

export interface RegulationResult {
  isSpeculativeZone: boolean      // 투기과열지구
  isAdjustmentZone: boolean       // 조정대상지역
  isLandTransactionZone: boolean  // 토지거래허가구역
}

type SggZone = { siNm: string; sggNm: string }
type EmdZone = { siNm: string; sggNm: string; emdNm: string }

const speculativeZones = speculativeData.zones as SggZone[]
const adjustmentZones  = adjustmentData.zones  as SggZone[]
const landTransactionZones = landTransactionData.zones as EmdZone[]

function matchSgg(zones: SggZone[], siNm: string, sggNm: string): boolean {
  return zones.some(
    (z) => z.siNm === siNm && sggNm.startsWith(z.sggNm),
  )
}

function matchEmd(zones: EmdZone[], siNm: string, sggNm: string, emdNm: string): boolean {
  return zones.some(
    // emdNm이 zone 데이터와 일치하거나, 실제 주소가 zone의 동명으로 시작하는 경우 포함
    // 예: zone='성수동', 주소='성수동1가' → 포함
    (z) => z.siNm === siNm && sggNm.startsWith(z.sggNm) && emdNm.startsWith(z.emdNm),
  )
}

export function checkRegulations(
  siNm: string,
  sggNm: string,
  emdNm: string,
): RegulationResult {
  if (!siNm && !sggNm && !emdNm) {
    return { isSpeculativeZone: false, isAdjustmentZone: false, isLandTransactionZone: false }
  }

  return {
    isSpeculativeZone:     matchSgg(speculativeZones,    siNm, sggNm),
    isAdjustmentZone:      matchSgg(adjustmentZones,     siNm, sggNm),
    isLandTransactionZone: matchEmd(landTransactionZones, siNm, sggNm, emdNm),
  }
}

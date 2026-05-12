/**
 * Quick Check 핵심 로직 — API Route와 분리하여 독립 테스트 가능
 * U3-3: 매물 등록 후 자동 실행
 */
import { fetchBuilding, buildingQueryFromJuso } from '@/lib/apis/building'
import { fetchRegistry, toRiskItems } from '@/lib/apis/registry'
import { checkRegulations } from '@/lib/regulations'
import { saveDiagnostics } from '@/lib/supabase/diagnostics'
import type { QuickCheckItem as RiskItem } from '@/components/report/QuickCheck'

export interface QuickCheckInput {
  bdMgtSn:   string
  admCd?:    string   // 건축물대장 조회용 (10자리 행정구역코드)
  lnbrMnnm?: number  // 지번 본번
  lnbrSlno?: number  // 지번 부번
  mtYn?:     string  // 산 여부 ('0'|'1')
  roadAddr:  string
  siNm:      string
  sggNm:     string
  emdNm:     string
}

export interface QuickCheckOutput {
  riskItems:  RiskItem[]
  checkedAt:  string
}

export async function runQuickCheck(input: QuickCheckInput): Promise<QuickCheckOutput> {
  const { bdMgtSn, admCd, lnbrMnnm = 0, lnbrSlno = 0, mtYn = '0', roadAddr, siNm, sggNm, emdNm } = input
  const riskItems: RiskItem[] = []

  try {
    // 건축물대장은 admCd 기반 쿼리 우선, 없으면 스킵
    const buildingQuery = admCd
      ? buildingQueryFromJuso({ admCd, lnbrMnnm, lnbrSlno, mtYn })
      : null

    const [building, registry] = await Promise.all([
      buildingQuery ? fetchBuilding(buildingQuery).catch(() => null) : Promise.resolve(null),
      fetchRegistry(bdMgtSn).catch(() => null),
    ])

    if (registry) riskItems.push(...toRiskItems(registry))
    if (building?.isViolation) riskItems.unshift({ label: '위반건축물', level: 'danger' })

    const regs = checkRegulations(siNm, sggNm, emdNm)
    if (regs.isLandTransactionZone) riskItems.push({ label: '토지거래허가구역', level: 'warning' })
    if (regs.isSpeculativeZone)     riskItems.push({ label: '투기과열지구',      level: 'warning' })
    if (regs.isAdjustmentZone)      riskItems.push({ label: '조정대상지역',       level: 'warning' })

    saveDiagnostics({
      bdMgtSn, roadAddr,
      hasViolation:         building?.isViolation         ?? false,
      hasMortgage:          registry?.hasMortgage          ?? false,
      hasSeizure:           registry?.hasSeizure           ?? false,
      hasAuction:           registry?.hasAuction           ?? false,
      hasTrust:             registry?.hasTrust             ?? false,
      hasLeaseRegistration: registry?.hasLeaseRegistration ?? false,
      isSpeculativeZone:    regs.isSpeculativeZone,
      isAdjustmentZone:     regs.isAdjustmentZone,
      isLandTransactionZone: regs.isLandTransactionZone,
      riskItems,
    }).catch(() => {})

  } catch {
    // Graceful Degradation — 실패 시 빈 목록 반환
  }

  return { riskItems, checkedAt: new Date().toISOString().slice(0, 10) }
}

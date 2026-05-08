/**
 * property_diagnostics 테이블 — 저장·조회
 * U2-4: Quick Check 결과 캐싱
 */

import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { RiskItem } from '@/lib/apis/registry'

export interface DiagnosticsPayload {
  bdMgtSn: string
  roadAddr: string
  hasViolation: boolean
  hasMortgage: boolean
  hasSeizure: boolean
  hasAuction: boolean
  hasTrust: boolean
  hasLeaseRegistration: boolean
  isSpeculativeZone: boolean
  isAdjustmentZone: boolean
  isLandTransactionZone: boolean
  riskItems: RiskItem[]
}

export interface DiagnosticsRow {
  id: string
  bd_mgt_sn: string
  road_addr: string
  has_violation: boolean
  has_mortgage: boolean
  has_seizure: boolean
  has_auction: boolean
  has_trust: boolean
  has_lease_registration: boolean
  is_speculative_zone: boolean
  is_adjustment_zone: boolean
  is_land_transaction_zone: boolean
  risk_items: RiskItem[]
  checked_at: string
}

/** Quick Check 결과를 DB에 upsert (bdMgtSn 기준) */
export async function saveDiagnostics(payload: DiagnosticsPayload): Promise<void> {
  const supabase = createBrowserSupabaseClient()

  const { error } = await supabase.from('property_diagnostics').upsert(
    {
      bd_mgt_sn: payload.bdMgtSn,
      road_addr: payload.roadAddr,
      has_violation: payload.hasViolation,
      has_mortgage: payload.hasMortgage,
      has_seizure: payload.hasSeizure,
      has_auction: payload.hasAuction,
      has_trust: payload.hasTrust,
      has_lease_registration: payload.hasLeaseRegistration,
      is_speculative_zone: payload.isSpeculativeZone,
      is_adjustment_zone: payload.isAdjustmentZone,
      is_land_transaction_zone: payload.isLandTransactionZone,
      risk_items: payload.riskItems,
      checked_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: 'bd_mgt_sn' },
  )

  if (error) {
    console.warn('[diagnostics] 저장 실패:', error.message)
  }
}

/** bdMgtSn 기준 최신 진단 결과 조회 */
export async function getLatestDiagnostics(bdMgtSn: string): Promise<DiagnosticsRow | null> {
  const supabase = createBrowserSupabaseClient()

  const { data, error } = await supabase
    .from('property_diagnostics')
    .select('*')
    .eq('bd_mgt_sn', bdMgtSn)
    .order('checked_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0] as DiagnosticsRow
}

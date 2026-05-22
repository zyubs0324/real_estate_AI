import { createBrowserSupabaseClient } from './client'

export interface ReportHistoryRow {
  id: string
  road_address: string
  building_dong: string | null
  unit_number: string | null
  floor_info: string | null
  bd_mgt_sn: string
  report_data: Record<string, unknown>
  quick_check_summary: string | null
  created_at: string
}

export interface SaveReportHistoryPayload {
  road_address: string
  building_dong?: string | null
  unit_number?: string | null
  floor_info?: string | null
  bd_mgt_sn: string
  report_data: Record<string, unknown>
  quick_check_summary?: string | null
}

export async function listReportHistory(limit = 20): Promise<ReportHistoryRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('report_history')
    .select('id, road_address, building_dong, unit_number, floor_info, bd_mgt_sn, report_data, quick_check_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as ReportHistoryRow[]
}

export async function saveReportHistory(payload: SaveReportHistoryPayload): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('report_history')
    .insert({
      road_address: payload.road_address,
      building_dong: payload.building_dong ?? null,
      unit_number: payload.unit_number ?? null,
      floor_info: payload.floor_info ?? null,
      bd_mgt_sn: payload.bd_mgt_sn,
      report_data: payload.report_data,
      quick_check_summary: payload.quick_check_summary ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

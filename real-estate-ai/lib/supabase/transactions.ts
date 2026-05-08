/**
 * Supabase transactions CRUD
 * U3-7 — 거래 등록 + 납부 단계 자동 생성
 */
import { createBrowserSupabaseClient } from './client'
import { ensureCurrentUser } from './ensureUser'

// ─── 타입 ────────────────────────────────────────────────
export interface TransactionRow {
  id: string
  property_road_address: string
  deal_type: string
  status: string
  price: number | null
  contract_date: string | null
  end_date: string | null
  warning: boolean
  created_at: string
}

export interface TransactionMemoRow {
  id:         string
  content:    string
  type:       'normal' | 'warning' | 'dispute'
  created_at: string
}

export interface SaveTransactionPayload {
  property_id: string
  deal_type: string
  price?: number
  deposit?: number
  monthly_rent?: number
  contract_date?: string
  start_date?: string
  end_date?: string
  status?: string
}

export interface PaymentDefaults {
  deal_type: string
  price?: number
  deposit?: number
  monthly_rent?: number
}

// ─── 납부 단계 자동 생성 로직 ─────────────────────────────
function buildDefaultPayments(
  txId: string,
  info: PaymentDefaults
): Array<{ transaction_id: string; label: string; amount: number; sort_order: number }> {
  const price    = info.price         ?? 0
  const deposit  = info.deposit       ?? 0
  const monthly  = info.monthly_rent  ?? 0
  const base     = price || deposit   // 매매가 or 보증금

  if (info.deal_type === '매매') {
    const down   = Math.round(base * 0.1)   // 계약금 10%
    const middle = Math.round(base * 0.2)   // 중도금 20%
    const balance = base - down - middle    // 잔금 70%
    return [
      { transaction_id: txId, label: '계약금', amount: down,    sort_order: 1 },
      { transaction_id: txId, label: '중도금', amount: middle,  sort_order: 2 },
      { transaction_id: txId, label: '잔금',   amount: balance, sort_order: 3 },
    ]
  }
  if (info.deal_type === '전세') {
    const down    = Math.round(base * 0.1)
    const balance = base - down
    return [
      { transaction_id: txId, label: '계약금', amount: down,    sort_order: 1 },
      { transaction_id: txId, label: '잔금',   amount: balance, sort_order: 2 },
    ]
  }
  // 월세·단기임대: 보증금 + 첫 달 월세
  return [
    { transaction_id: txId, label: '보증금', amount: deposit,  sort_order: 1 },
    { transaction_id: txId, label: '월세',   amount: monthly,  sort_order: 2 },
  ]
}

// ─── 납부 단계 생성 ───────────────────────────────────────
export async function createDefaultPayments(
  txId: string,
  info: PaymentDefaults
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const rows = buildDefaultPayments(txId, info)
  if (rows.length === 0) return
  const { error } = await supabase.from('transaction_payments').insert(rows)
  if (error) throw error
}

// ─── 거래 저장 ────────────────────────────────────────────
export async function saveTransaction(
  payload: SaveTransactionPayload
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      property_id:    payload.property_id,
      deal_type:      payload.deal_type,
      status:         payload.status        ?? '상담',
      price:          payload.price         ?? null,
      deposit:        payload.deposit       ?? null,
      monthly_rent:   payload.monthly_rent  ?? null,
      contract_date:  payload.contract_date ?? null,
      start_date:     payload.start_date    ?? null,
      end_date:       payload.end_date      ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

// ─── 거래 목록 조회 ───────────────────────────────────────
export async function listTransactions(): Promise<TransactionRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, deal_type, status, price, contract_date, end_date, warning, created_at,
      properties(road_address)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown[]).map((r: unknown) => {
    const row  = r as Record<string, unknown>
    const prop = row['properties'] as { road_address: string } | null
    return {
      id:                    row['id'] as string,
      property_road_address: prop?.road_address ?? '—',
      deal_type:             row['deal_type'] as string,
      status:                row['status'] as string,
      price:                 row['price'] as number | null,
      contract_date:         row['contract_date'] as string | null,
      end_date:              row['end_date'] as string | null,
      warning:               (row['warning'] as boolean) ?? false,
      created_at:            row['created_at'] as string,
    }
  })
}

// ─── 거래 메모 ────────────────────────────────────────────
export async function getTransactionMemos(txId: string): Promise<TransactionMemoRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('memos')
    .select('id, content, type, created_at')
    .eq('transaction_id', txId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TransactionMemoRow[]
}

export async function addTransactionMemo(
  txId: string,
  payload: { content: string; type?: 'normal' | 'warning' | 'dispute' }
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const userId   = await ensureCurrentUser(supabase)
  const memoType = payload.type ?? 'normal'

  const { data, error } = await supabase
    .from('memos')
    .insert({
      transaction_id: txId,
      content:        payload.content,
      type:           memoType,
      created_by:     userId,
    })
    .select('id')
    .single()

  if (error) throw error

  // warning/dispute 메모 저장 시 → 거래 경고 플래그 자동 활성화
  if (memoType === 'warning' || memoType === 'dispute') {
    await supabase.from('transactions').update({ warning: true }).eq('id', txId)
  }

  return data as { id: string }
}

export async function deleteTransactionMemo(memoId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase.from('memos').delete().eq('id', memoId)
  if (error) throw error
}

// ─── 납부 단계 로직 단위 테스트용 export ─────────────────
export { buildDefaultPayments }

/**
 * U3-7: 납부 단계 자동 생성 로직 단위 테스트
 */
import { buildDefaultPayments } from '@/lib/supabase/transactions'

describe('buildDefaultPayments', () => {
  const TX = 'tx-001'

  it('매매: 계약금10% + 중도금20% + 잔금70%', () => {
    const rows = buildDefaultPayments(TX, { deal_type: '매매', price: 500_000_000 })
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ label: '계약금', amount: 50_000_000,  sort_order: 1 })
    expect(rows[1]).toMatchObject({ label: '중도금', amount: 100_000_000, sort_order: 2 })
    expect(rows[2]).toMatchObject({ label: '잔금',   amount: 350_000_000, sort_order: 3 })
  })

  it('전세: 계약금10% + 잔금90%', () => {
    const rows = buildDefaultPayments(TX, { deal_type: '전세', deposit: 200_000_000 })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ label: '계약금', amount: 20_000_000,  sort_order: 1 })
    expect(rows[1]).toMatchObject({ label: '잔금',   amount: 180_000_000, sort_order: 2 })
  })

  it('월세: 보증금 + 월세', () => {
    const rows = buildDefaultPayments(TX, { deal_type: '월세', deposit: 10_000_000, monthly_rent: 800_000 })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ label: '보증금', amount: 10_000_000, sort_order: 1 })
    expect(rows[1]).toMatchObject({ label: '월세',   amount: 800_000,   sort_order: 2 })
  })

  it('매매: 모든 항목의 transaction_id가 올바르다', () => {
    const rows = buildDefaultPayments(TX, { deal_type: '매매', price: 100_000_000 })
    expect(rows.every((r) => r.transaction_id === TX)).toBe(true)
  })

  it('계약금 + 중도금 + 잔금 합계 = 매매가', () => {
    const price = 777_000_000
    const rows  = buildDefaultPayments(TX, { deal_type: '매매', price })
    const total = rows.reduce((s, r) => s + r.amount, 0)
    expect(total).toBe(price)
  })
})

import { parseAreaText } from '@/lib/property/areaParser'
import { suggestAlias, suggestCategory } from '@/lib/property/categoryMapper'
import { parseCarrierText } from '@/lib/property/carrierParser'
import { parsePriceText } from '@/lib/property/priceParser'

describe('property parser utilities', () => {
  it('parses Korean sale prices into won', () => {
    expect(parsePriceText('8억').price_sale).toBe(800_000_000)
    expect(parsePriceText('12억 5천').price_sale).toBe(1_250_000_000)
  })

  it('parses lease/monthly style prices', () => {
    expect(parsePriceText('7억/100')).toMatchObject({
      price_deposit: 700_000_000,
      price_monthly: 1_000_000,
    })
    expect(parsePriceText('5000/80')).toMatchObject({
      price_deposit: 50_000_000,
      price_monthly: 800_000,
    })
  })

  it('parses area text with square meters and pyeong suffixes', () => {
    expect(parseAreaText('79.44/39.89㎡')).toMatchObject({
      area_supply: 79.44,
      area_exclusive: 39.89,
    })
    expect(parseAreaText('33A')).toMatchObject({ area_text: '33A', area_pyeong: 33 })
  })

  it('normalizes carrier labels out of memo text', () => {
    expect(parseCarrierText('SK 010-1111-2222')).toMatchObject({
      carrier: 'SKT',
      phone: '010-1111-2222',
    })
    expect(parseCarrierText('알뜰폰 01012345678')).toMatchObject({
      carrier: null,
      carrier_note: '알뜰폰',
      phone: '010-1234-5678',
    })
  })

  it('suggests category and alias from building/address text', () => {
    expect(suggestCategory({ building_name: '옥수극동아파트' })).toBe('극동')
    expect(suggestAlias({ building_name: '한남하이츠빌라' })).toBe('하빌')
  })
})

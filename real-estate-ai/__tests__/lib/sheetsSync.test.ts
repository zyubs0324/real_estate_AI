import { googleSheetValuesToRows, makeSheetPropertyKey, normalizeSheetProperty } from '@/lib/sheets/sync'

describe('Google Sheets sync helpers', () => {
  it('maps spreadsheet values using the 매물정보 column order', () => {
    const rows = googleSheetValuesToRows([
      ['f', '핸들링', '대표주소', '카테고리', '별칭', '동', '호수', '랜덤광고', '종류', '가격', '면적', '소유자', '통신사 및 연락처', '한자리', '더힐', '입주시기', '방향', '관리비', '기타사항'],
      ['2026-05-01', '한자리', '옥수동', '극동', '극동', '101동', '1201호', '상', '매매', '12억', '33평', '김소유', '010-1111-2222', '', '', '협의', '남', '30만', '테스트'],
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      registered_date: '2026. 5. 1.',
      handling_name: '한자리',
      neighborhood: '옥수동',
      alias: '극동',
      building_dong: '101동',
      unit_number: '1201호',
      deal_type: '매매',
      price_text: '12억',
    })
  })

  it('normalizes price, area, source platform, and stable upsert key', () => {
    const normalized = normalizeSheetProperty({
      alias: '극동',
      building_dong: '101동',
      unit_number: '1201호',
      deal_type: '매매',
      price_text: '12억',
      area_text: '33평',
    })

    expect(normalized).toMatchObject({
      source_platform: 'sheet',
      price_sale: 1_200_000_000,
      area_pyeong: 33,
    })
    expect(makeSheetPropertyKey(normalized)).toBe('극동|101동|1201호')
  })
})

import {
  buildHandlingPeople,
  buildOwnerPeople,
  calculateShareRatios,
  detectCorporate,
  isCoBrokerHandling,
  isValidDirection,
  mergePersonRoles,
  normalizeRows,
  ownerRoleForDealType,
  parseOwnerContacts,
  parseCsv,
  splitOwners,
} from '@/lib/property/csvImportProfile'

const header = 'f,핸들링,대표주소,카테고리,별칭,동,호수,랜덤광고,종류,가격,면적,소유자,통신사 및 연락처,한자리,더힐,입주시기,방향,관리비,기타사항'

describe('CSV property import profile', () => {
  it('creates separate numbered people when the same owner has different phones', () => {
    const rows = normalizeRows(parseCsv([
      header,
      '1,한자리,옥수동,카테고리,옥파,101,1001,고,매매,8억,33A,김소유,010-1111-2222 SK,,,,,,',
      '2,한자리,옥수동,카테고리,옥파,101,1002,고,전세,8억,33A,김소유,010-3333-4444 엘지,,,,,,',
    ].join('\n')))

    const people = buildOwnerPeople(rows)

    expect(people).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '김소유1', phone: '010-1111-2222', carrier: 'SKT', role: '매도인' }),
      expect.objectContaining({ name: '김소유2', phone: '010-3333-4444', carrier: 'LGU', role: '임대인' }),
    ]))
  })

  it('numbers walk-in handling people per handled property', () => {
    const rows = normalizeRows(parseCsv([
      header,
      '1,워크인,옥수동,카테고리,옥파,101,1001,고,매매,8억,33A,김소유,010-1111-2222 SK,,,,,,',
      '2,워크인,옥수동,카테고리,옥파,101,1002,고,매매,8억,33A,박소유,010-3333-4444 KT,,,,,,',
    ].join('\n')))

    expect(rows.map((row) => row.handling_name)).toEqual(['워크인1', '워크인2'])
    expect(buildHandlingPeople(rows).map((person) => person.name)).toEqual(['워크인1', '워크인2'])
  })

  it('keeps exclusive and strategic as property flags handled by our office', () => {
    const rows = normalizeRows(parseCsv([
      header,
      '1,전속,옥수동,카테고리,옥파,101,1001,고,매매,8억,33A,김소유,010-1111-2222 SK,,,,,,',
      '2,전략매물,옥수동,카테고리,옥파,101,1002,고,매매,8억,33A,박소유,010-3333-4444 KT,,,,,,',
    ].join('\n')))

    expect(rows[0]).toMatchObject({ handling_name: '한자리', handling_kind: 'agency', is_exclusive: true })
    expect(rows[1]).toMatchObject({ handling_name: '한자리', handling_kind: 'agency', is_strategic: true })
  })

  it('derives owner roles from deal types and merges multiple roles as complex', () => {
    expect(ownerRoleForDealType('매매')).toBe('매도인')
    expect(ownerRoleForDealType('월세')).toBe('임대인')
    expect(mergePersonRoles(['매도인', '임대인'])).toBe('복합')
  })

  it('splits co-owners by practical Korean separators', () => {
    expect(splitOwners('김소유/박소유, 이소유\n최소유 · 정소유 및 한소유 외 1명')).toEqual([
      '김소유',
      '박소유',
      '이소유',
      '최소유',
      '정소유',
      '한소유',
    ])
  })

  it('matches owner names and phones one-to-one when counts match', () => {
    expect(parseOwnerContacts('김소유/박소유', '010-1111-2222 SK / 010-3333-4444 엘지')).toEqual([
      expect.objectContaining({ name: '김소유', phone: '010-1111-2222', carrier: 'SKT' }),
      expect.objectContaining({ name: '박소유', phone: '010-3333-4444', carrier: 'LGU' }),
    ])
  })

  it('uses the first phone as primary and preserves extra phones in notes for one owner', () => {
    expect(parseOwnerContacts('김소유', '010-1111-2222 KT / 010-3333-4444 SK 메모')).toEqual([
      expect.objectContaining({
        name: '김소유',
        phone: '010-1111-2222',
        carrier: 'KT',
        notes: expect.stringContaining('010-3333-4444'),
      }),
    ])
  })

  it('creates placeholder owners when only phones exist', () => {
    expect(parseOwnerContacts('', '010-1111-2222 SK / 010-3333-4444 KT')).toEqual([
      expect.objectContaining({ name: '소유자1', phone: '010-1111-2222', carrier: 'SKT' }),
      expect.objectContaining({ name: '소유자2', phone: '010-3333-4444', carrier: 'KT' }),
    ])
  })

  it('detects corporate owners while keeping numbered placeholders as people', () => {
    expect(detectCorporate('주식회사 한강')).toBe(true)
    expect(detectCorporate('옥수개발')).toBe(true)
    expect(detectCorporate('김철수2')).toBe(false)
    expect(detectCorporate('소유자1')).toBe(false)
    expect(detectCorporate('워크인1')).toBe(false)
  })

  it('calculates ownership share ratios as per-owner percentages', () => {
    expect(calculateShareRatios(1)).toEqual(['100%'])
    expect(calculateShareRatios(2)).toEqual(['50%', '50%'])
    expect(calculateShareRatios(3)).toEqual(['33.33%', '33.33%', '33.33%'])
  })

  it('identifies valid directions and co-broker handling values', () => {
    expect(isValidDirection('동')).toBe(true)
    expect(isValidDirection('협의')).toBe(false)
    expect(isCoBrokerHandling('경희')).toBe(true)
    expect(isCoBrokerHandling('한자리')).toBe(false)
    expect(isCoBrokerHandling('워크인')).toBe(false)
  })
})

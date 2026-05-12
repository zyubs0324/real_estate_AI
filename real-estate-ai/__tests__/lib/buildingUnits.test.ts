/**
 * fetchBuildingUnits — API 응답 파싱 단위 테스트
 *
 * 건축HUB API 실제 필드명:
 *   dongNm = "302"   (숫자만, "동" suffix 없음)
 *   hoNm   = "407호" ("ho" 필드 아님에 주의)
 */
describe('fetchBuildingUnits', () => {
  const originalEnv = process.env

  function makeResponse(items: string, totalCount = items.split('<item>').length - 1) {
    return {
      ok: true,
      text: async () => `
        <response>
          <body>
            <items>${items}</items>
            <numOfRows>1000</numOfRows>
            <pageNo>1</pageNo>
            <totalCount>${totalCount}</totalCount>
          </body>
        </response>
      `,
    } as Response
  }

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_USE_MOCK_API: 'false',
      DATA_GO_KR_API_KEY: 'test-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  // ── hoNm 필드 매핑 (핵심: API는 hoNm 반환, ho 아님) ─────────
  it('API 응답의 hoNm 필드를 ho로 매핑한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>102호</hoNm><flrNo>1</flrNo><area>59.8</area></item>',
        2,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700', bun: '0810', ji: '0000' })

    expect(units).toHaveLength(2)
    expect(units[0].ho).toBe('101호')
    expect(units[1].ho).toBe('102호')
  })

  // ── hoNm 없고 ho만 있는 경우 (Mock 데이터 / 일부 구형 API 응답 호환) ──
  it('hoNm 없으면 ho 폴백을 사용한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101동</dongNm><ho>101</ho><flrNo>1</flrNo><area>84.9</area></item>',
        1,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11200', bjdongCd: '10200' })

    expect(units[0].ho).toBe('101')
  })

  // ── dongNm 정규화: 숫자만이면 "동" suffix 추가 ──────────────
  it('dongNm이 숫자만이면 "동" suffix를 붙인다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>A동</dongNm><hoNm>201호</hoNm><flrNo>2</flrNo><area>70.0</area></item>' +
        '<item><dongNm></dongNm><hoNm>301호</hoNm><flrNo>3</flrNo><area>60.0</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    // 정렬 후 인덱스: '' < '101동' < 'A동' (빈 문자열이 맨 앞)
    const dongNames = units.map((u) => u.dongNm)
    expect(dongNames).toContain('101동')  // 숫자 → "동" suffix 추가
    expect(dongNames).toContain('A동')    // 이미 suffix 있음 → 그대로
    expect(dongNames).toContain('')       // 단동 건물 → 빈 문자열 유지
  })

  // ── ho 없는 항목 필터링 ───────────────────────────────────────
  it('ho(hoNm) 없는 항목은 제외한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><flrNo>1</flrNo><area>84.9</area></item>' +  // hoNm/ho 모두 없음
        '<item><dongNm>101</dongNm><hoNm>102호</hoNm><flrNo>1</flrNo><area>59.8</area></item>',
        2,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    expect(units).toHaveLength(1)
    expect(units[0].ho).toBe('102호')
  })

  // ── 동+호 조합 중복 제거 ─────────────────────────────────────
  it('동+호 조합 중복은 하나만 유지한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>102</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    // 101동+101호는 중복 제거, 102동+101호는 다른 동이므로 별개
    expect(units).toHaveLength(2)
    expect(units.map((u) => u.dongNm)).toEqual(['101동', '102동'])
  })

  // ── 페이지네이션: 여러 페이지를 모두 수집 ────────────────────
  it('건축물대장 전유부 목록을 모든 페이지에서 수집한다', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const pageNo = url.searchParams.get('pageNo')
      const item = pageNo === '2'
        ? '<item><dongNm>101동</dongNm><hoNm>202호</hoNm><flrNo>2</flrNo><area>84.9</area></item>'
        : '<item><dongNm>101동</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>'

      return {
        ok: true,
        text: async () => `
          <response>
            <body>
              <items>${item}</items>
              <numOfRows>1000</numOfRows>
              <pageNo>${pageNo}</pageNo>
              <totalCount>1001</totalCount>
            </body>
          </response>
        `,
      } as Response
    })

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({
      sigunguCd: '11170', bjdongCd: '13100', bun: '0810', ji: '0000', platGbCd: '0',
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(units.map((u) => u.ho)).toEqual(['101호', '202호'])
  })

  // ── 정렬: 동 → 층 → 호 ────────────────────────────────────────
  it('동 → 층 → 호 순으로 정렬된다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>102</dongNm><hoNm>201호</hoNm><flrNo>2</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>201호</hoNm><flrNo>2</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    expect(units[0]).toMatchObject({ dongNm: '101동', flrNo: '1', ho: '101호' })
    expect(units[1]).toMatchObject({ dongNm: '101동', flrNo: '2', ho: '201호' })
    expect(units[2]).toMatchObject({ dongNm: '102동', flrNo: '2', ho: '201호' })
  })
})

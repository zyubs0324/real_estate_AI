/**
 * fetchBuildingUnits — API 응답 파싱 단위 테스트
 *
 * 건축HUB API 실제 필드명:
 *   dongNm          = "302"   (숫자만, "동" suffix 없음)
 *   hoNm            = "407호" ("ho" 필드 아님에 주의)
 *   exposPubuseGbCd = "1"(전유부) / "2"(공용부)
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

  // ── 정렬: 동 → 층 → 호(숫자) 순 ────────────────────────────────
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

  // ── 호수 숫자 오름차순: 층 → 호(숫자) 순 ────────────────────────
  it('층 기준 정렬 후 호수를 숫자 기준으로 오름차순 정렬한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>1003호</hoNm><flrNo>10</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>201호</hoNm><flrNo>2</flrNo><area>84.9</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    // 층 기준 먼저: 1층(101호) → 2층(201호) → 10층(1003호)
    expect(units.map((u) => u.ho)).toEqual(['101호', '201호', '1003호'])
  })

  // ── 같은 층에서 호수 숫자 오름차순: 101 < 901 < 1001 ─────────────
  it('같은 층 안에서 101호 → 901호 → 1001호 순으로 정렬한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>1001호</hoNm><flrNo>10</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm>101</dongNm><hoNm>901호</hoNm><flrNo>9</flrNo><area>84.9</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    // 1층 101호 → 9층 901호 → 10층 1001호
    expect(units.map((u) => u.ho)).toEqual(['101호', '901호', '1001호'])
  })

  // ── suffix 없는 순수 숫자 호: 1 → 9 → 10 ────────────────────────
  it('호수에 "호" suffix가 없어도 1 → 9 → 10 순으로 정렬한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm></dongNm><hoNm>10</hoNm><flrNo>3</flrNo><area>84.9</area></item>' +
        '<item><dongNm></dongNm><hoNm>1</hoNm><flrNo>1</flrNo><area>84.9</area></item>' +
        '<item><dongNm></dongNm><hoNm>9</hoNm><flrNo>2</flrNo><area>84.9</area></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11200', bjdongCd: '10200' })

    // 층 기준: 1층(1호) → 2층(9호) → 3층(10호)
    expect(units.map((u) => u.ho)).toEqual(['1', '9', '10'])
  })

  // ── flrNo가 0이거나 없는 항목(공용부 혼입) 필터링 ─────────────
  it('flrNo가 0이거나 비어있는 항목(공용부)을 제외한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>1003호</hoNm><flrNo>0</flrNo><area>2.3</area></item>' +  // 0층 → 제거
        '<item><dongNm>101</dongNm><hoNm>105호</hoNm><flrNo></flrNo><area>32.5</area></item>' +    // 층 없음 → 제거
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area></item>',   // 정상
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    expect(units).toHaveLength(1)
    expect(units[0].ho).toBe('101호')
  })

  // ── exposPubuseGbCd='2'(공용부) 항목 필터링 ────────────────────
  it('exposPubuseGbCd가 2인 공용부 항목을 제외한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      makeResponse(
        '<item><dongNm>101</dongNm><hoNm>공용부</hoNm><flrNo>1</flrNo><area>12.5</area><exposPubuseGbCd>2</exposPubuseGbCd></item>' +
        '<item><dongNm>101</dongNm><hoNm>101호</hoNm><flrNo>1</flrNo><area>84.9</area><exposPubuseGbCd>1</exposPubuseGbCd></item>' +
        '<item><dongNm>101</dongNm><hoNm>102호</hoNm><flrNo>1</flrNo><area>59.8</area><exposPubuseGbCd>1</exposPubuseGbCd></item>',
        3,
      ),
    )

    const { fetchBuildingUnits } = await import('@/lib/apis/building')
    const units = await fetchBuildingUnits({ sigunguCd: '11170', bjdongCd: '10700' })

    expect(units).toHaveLength(2)
    expect(units.map((u) => u.ho)).toEqual(['101호', '102호'])
  })
})

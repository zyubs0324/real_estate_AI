describe('fetchBuildingUnits', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_USE_MOCK_API: 'false',
      DATA_GO_KR_API_KEY: 'test-key',
    }
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const pageNo = url.searchParams.get('pageNo')
      const item = pageNo === '2'
        ? '<item><dongNm>101동</dongNm><flrNo>2</flrNo><ho>202</ho><area>84.9</area></item>'
        : '<item><dongNm>101동</dongNm><flrNo>1</flrNo><ho>101</ho><area>84.9</area></item>'

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
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it('건축물대장 전유부 목록을 모든 페이지에서 수집한다', async () => {
    const { fetchBuildingUnits } = await import('@/lib/apis/building')

    const units = await fetchBuildingUnits({
      sigunguCd: '11170',
      bjdongCd: '13100',
      bun: '0810',
      ji: '0000',
      platGbCd: '0',
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(units.map((u) => u.ho)).toEqual(['101', '202'])
  })
})

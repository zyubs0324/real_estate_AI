/**
 * @jest-environment node
 */

describe('fetchJuso — server fallback', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_USE_MOCK_API = 'false'
    process.env.JUSO_API_KEY = 'expired-key'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('개발환경에서 Juso API 오류가 나면 Mock 검색 결과로 폴백한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          common: {
            errorCode: 'E0014',
            errorMessage: 'expired',
          },
          juso: [],
        },
      }),
    } as Response)

    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('옥수')

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].roadAddr).toContain('옥수')
  })
})

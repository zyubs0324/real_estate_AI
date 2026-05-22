/**
 * U1-6: lib/apis/juso.ts — 도로명주소 API 유닛 테스트
 * NEXT_PUBLIC_USE_MOCK_API=true 환경에서 Mock 데이터 반환 검증
 */

// Mock 환경 강제 설정
process.env.NEXT_PUBLIC_USE_MOCK_API = 'true'

describe('fetchJuso — 도로명주소 API (Mock 모드)', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_USE_MOCK_API = 'true'
  })

  it('Mock 모드에서 결과 배열을 반환한다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('옥수')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('각 결과 항목에 roadAddr 필드가 있다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('옥수')
    result.forEach((item) => {
      expect(item).toHaveProperty('roadAddr')
      expect(typeof item.roadAddr).toBe('string')
    })
  })

  it('각 결과 항목에 jibunAddr 필드가 있다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('옥수')
    result.forEach((item) => {
      expect(item).toHaveProperty('jibunAddr')
    })
  })

  it('각 결과 항목에 zipNo 필드가 있다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('옥수')
    result.forEach((item) => {
      expect(item).toHaveProperty('zipNo')
    })
  })

  it('빈 검색어로 호출하면 빈 배열을 반환한다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('')
    expect(result).toEqual([])
  })

  it('2자 미만 검색어로 호출하면 빈 배열을 반환한다', async () => {
    const { fetchJuso } = await import('@/lib/apis/juso')
    const result = await fetchJuso('서')
    expect(result).toEqual([])
  })

})

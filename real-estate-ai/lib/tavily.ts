/**
 * Tavily 웹 검색 — 실시간 부동산 정책·규제 정보 검색
 * 환경변수: TAVILY_API_KEY (app.tavily.com 무료 플랜 1,000건/월)
 *
 * TAVILY_API_KEY 미설정 시 빈 문자열 반환 (graceful degradation)
 */

interface TavilyResult {
  title:   string
  url:     string
  content: string
  score:   number
}

interface TavilyResponse {
  results: TavilyResult[]
}

/**
 * 부동산 관련 질문을 웹 검색하여 요약 컨텍스트 반환
 * @returns 검색 결과 요약 문자열 (없으면 '')
 */
export async function searchWeb(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return ''

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        api_key:              apiKey,
        query:                `${query} 대한민국 부동산`,
        search_depth:         'basic',
        max_results:          5,
        include_answer:       false,
        include_raw_content:  false,
        include_domains: [
          'molit.go.kr',      // 국토교통부
          'law.go.kr',        // 국가법령정보센터
          'reb.or.kr',        // 한국부동산원
          'khug.or.kr',       // 주택도시보증공사
          'hf.go.kr',         // 한국주택금융공사
        ],
      }),
    })

    if (!res.ok) return ''

    const data = await res.json() as TavilyResponse
    if (!data.results?.length) return ''

    return data.results
      .slice(0, 3)
      .map((r, i) =>
        `[출처 ${i + 1}] ${r.title}\n${r.url}\n${r.content.slice(0, 400)}`
      )
      .join('\n\n')
  } catch {
    return ''
  }
}

import type { ParseResult } from './types'
import { baseParsedProperty, firstSearchParam, lastNumericPathSegment } from './urlUtils'

export async function parseNaverPropertyUrl(url: string): Promise<ParseResult> {
  const parsedUrl = new URL(url)
  const articleNo = firstSearchParam(parsedUrl, ['articleNo', 'articleId', 'atclNo'])
  const complexNo = firstSearchParam(parsedUrl, ['complexNo', 'complexId', 'cortarNo'])
  const pathId = lastNumericPathSegment(parsedUrl)
  const isComplexPath = parsedUrl.pathname.includes('/complexes/')

  return {
    ok: true,
    property: {
      ...baseParsedProperty(url, 'naver'),
      source_external_id: articleNo ?? pathId,
      source_complex_id: complexNo ?? (isComplexPath ? pathId : undefined),
    },
  }
}

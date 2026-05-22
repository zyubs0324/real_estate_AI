import type { ParseResult } from './types'
import { baseParsedProperty, firstSearchParam, lastNumericPathSegment } from './urlUtils'

export async function parsePeterpanPropertyUrl(url: string): Promise<ParseResult> {
  const parsedUrl = new URL(url)
  return {
    ok: true,
    property: {
      ...baseParsedProperty(url, 'peterpan'),
      source_external_id: firstSearchParam(parsedUrl, ['houseNo', 'house_no', 'itemId', 'id']) ?? lastNumericPathSegment(parsedUrl),
    },
  }
}

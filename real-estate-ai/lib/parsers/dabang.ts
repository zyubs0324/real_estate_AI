import type { ParseResult } from './types'
import { baseParsedProperty, firstSearchParam, lastNumericPathSegment } from './urlUtils'

export async function parseDabangPropertyUrl(url: string): Promise<ParseResult> {
  const parsedUrl = new URL(url)
  return {
    ok: true,
    property: {
      ...baseParsedProperty(url, 'dabang'),
      source_external_id: firstSearchParam(parsedUrl, ['roomId', 'room_id', 'itemId', 'id']) ?? lastNumericPathSegment(parsedUrl),
    },
  }
}

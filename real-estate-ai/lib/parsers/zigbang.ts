import type { ParseResult } from './types'
import { baseParsedProperty, firstSearchParam, lastNumericPathSegment } from './urlUtils'

export async function parseZigbangPropertyUrl(url: string): Promise<ParseResult> {
  const parsedUrl = new URL(url)
  return {
    ok: true,
    property: {
      ...baseParsedProperty(url, 'zigbang'),
      source_external_id: firstSearchParam(parsedUrl, ['itemId', 'item_id', 'roomId', 'room_id']) ?? lastNumericPathSegment(parsedUrl),
      source_complex_id: firstSearchParam(parsedUrl, ['danjiId', 'danji_id', 'complexId', 'complex_id']),
    },
  }
}

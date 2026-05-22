import { parseDabangPropertyUrl } from './dabang'
import { parseNaverPropertyUrl } from './naver'
import { parsePeterpanPropertyUrl } from './peterpan'
import { parseZigbangPropertyUrl } from './zigbang'
import type { ParseResult, SourcePlatform } from './types'

export function detectPlatform(rawUrl: string): Exclude<SourcePlatform, 'direct' | 'sheet'> | null {
  let host = ''
  try {
    host = new URL(rawUrl).hostname
  } catch {
    return null
  }

  if (host.includes('new.land.naver.com')) return 'naver'
  if (host.includes('zigbang.com')) return 'zigbang'
  if (host.includes('peterpanz.com')) return 'peterpan'
  if (host.includes('dabangapp.com')) return 'dabang'
  return null
}

export async function parsePropertyUrl(rawUrl: string): Promise<ParseResult> {
  const platform = detectPlatform(rawUrl)
  if (!platform) return { ok: false, error: `Unsupported property URL: ${rawUrl}` }

  if (platform === 'naver') return parseNaverPropertyUrl(rawUrl)
  if (platform === 'zigbang') return parseZigbangPropertyUrl(rawUrl)
  if (platform === 'peterpan') return parsePeterpanPropertyUrl(rawUrl)
  return parseDabangPropertyUrl(rawUrl)
}

export type { ParseResult, ParsedAgency, ParsedProperty, SourcePlatform } from './types'

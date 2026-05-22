import type { ParsedProperty, SourcePlatform } from './types'

export function normalizeSourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  url.hash = ''
  url.hostname = url.hostname.toLowerCase()
  return url.toString()
}

export function lastNumericPathSegment(url: URL): string | undefined {
  return url.pathname
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .reverse()
    .find((part) => /^\d+$/.test(part))
}

export function firstSearchParam(url: URL, names: string[]): string | undefined {
  for (const name of names) {
    const value = url.searchParams.get(name)
    if (value?.trim()) return value.trim()
  }
  return undefined
}

export function baseParsedProperty(rawUrl: string, platform: SourcePlatform): ParsedProperty {
  return {
    source_platform: platform,
    source_url: normalizeSourceUrl(rawUrl),
  }
}

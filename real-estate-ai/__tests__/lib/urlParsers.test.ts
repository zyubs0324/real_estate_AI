import { detectPlatform, parsePropertyUrl } from '@/lib/parsers'

describe('external property URL parsers', () => {
  it.each([
    ['https://new.land.naver.com/complexes/123', 'naver'],
    ['https://new.land.naver.com/houses?articleNo=987654321', 'naver'],
    ['https://www.zigbang.com/home/apt/danjis/123', 'zigbang'],
    ['https://www.peterpanz.com/house/123', 'peterpan'],
    ['https://www.dabangapp.com/room/123', 'dabang'],
  ])('detects %s as %s', (url, platform) => {
    expect(detectPlatform(url)).toBe(platform)
  })

  it('returns a normalized parse result for supported URLs', async () => {
    await expect(parsePropertyUrl('https://new.land.naver.com/complexes/123#map')).resolves.toMatchObject({
      ok: true,
      property: {
        source_platform: 'naver',
        source_url: 'https://new.land.naver.com/complexes/123',
        source_external_id: '123',
        source_complex_id: '123',
      },
    })
  })

  it('extracts platform-specific property identifiers from query strings and paths', async () => {
    await expect(parsePropertyUrl('https://new.land.naver.com/houses?articleNo=987654321&complexNo=123')).resolves.toMatchObject({
      property: {
        source_platform: 'naver',
        source_external_id: '987654321',
        source_complex_id: '123',
      },
    })
    await expect(parsePropertyUrl('https://www.dabangapp.com/room/654321')).resolves.toMatchObject({
      property: { source_platform: 'dabang', source_external_id: '654321' },
    })
  })

  it('rejects unsupported URLs without throwing', async () => {
    await expect(parsePropertyUrl('https://example.com/room/123')).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Unsupported'),
    })
  })
})

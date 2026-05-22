export interface ParsedArea {
  area_text: string
  area_exclusive: number | null
  area_supply: number | null
  area_pyeong: number | null
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function parseAreaText(input: string | null | undefined): ParsedArea {
  const area_text = (input ?? '').trim()
  const parsed: ParsedArea = {
    area_text,
    area_exclusive: null,
    area_supply: null,
    area_pyeong: null,
  }
  if (!area_text) return parsed

  const squareMeters = area_text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*㎡?/)
  if (squareMeters) {
    parsed.area_supply = toNumber(squareMeters[1])
    parsed.area_exclusive = toNumber(squareMeters[2])
    return parsed
  }

  const pyeong = area_text.match(/^(\d+(?:\.\d+)?)/)
  parsed.area_pyeong = toNumber(pyeong?.[1])
  return parsed
}

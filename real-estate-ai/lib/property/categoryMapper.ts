interface PropertyNameInput {
  road_address?: string | null
  building_name?: string | null
}

const RULES: Array<{ match: RegExp; category: string; alias: string }> = [
  { match: /극동/, category: '극동', alias: '극동' },
  { match: /그린/, category: '그린', alias: '그린' },
  { match: /한남하이츠빌라|하이츠빌라/, category: '한남하이츠빌라', alias: '하빌' },
  { match: /삼성/, category: '삼성', alias: '삼성' },
  { match: /현대/, category: '현대', alias: '현대' },
  { match: /옥수하이츠|옥하/, category: '옥수하이츠', alias: '옥하' },
  { match: /대우/, category: '대우', alias: '대우' },
]

function haystack(input: PropertyNameInput): string {
  return `${input.building_name ?? ''} ${input.road_address ?? ''}`
}

export function suggestCategory(input: PropertyNameInput): string {
  const text = haystack(input)
  return RULES.find((rule) => rule.match.test(text))?.category ?? ''
}

export function suggestAlias(input: PropertyNameInput): string {
  const text = haystack(input)
  return RULES.find((rule) => rule.match.test(text))?.alias ?? ''
}

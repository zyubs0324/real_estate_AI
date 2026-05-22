export type SourcePlatform = 'direct' | 'naver' | 'zigbang' | 'peterpan' | 'dabang' | 'sheet'

export interface ParsedAgency {
  name?: string
  phone?: string
  representative?: string
}

export interface ParsedProperty {
  source_platform: SourcePlatform
  source_url: string
  source_external_id?: string
  source_complex_id?: string
  source_agent_name?: string
  source_agent_phone?: string
  source_agent_agency?: string
  road_address?: string
  building_name?: string
  deal_type?: string
  price_text?: string
  area_text?: string
  description?: string
  photo_urls?: string[]
}

export interface ParseResult {
  ok: boolean
  property?: ParsedProperty
  agency?: ParsedAgency
  error?: string
}

import { createClient } from '@supabase/supabase-js'
import { parseAreaText } from '@/lib/property/areaParser'
import { suggestAlias, suggestCategory } from '@/lib/property/categoryMapper'
import { normalizeRegisteredDate } from '@/lib/property/dateNormalizer'
import { parsePriceText } from '@/lib/property/priceParser'

export interface SheetPropertyRow {
  registered_date?: string
  handling_name?: string
  road_address?: string
  neighborhood?: string
  category?: string
  alias?: string
  ad_level?: string
  building_name?: string
  building_dong?: string
  unit_number?: string
  deal_type?: string
  price_text?: string
  area_text?: string
  hanjari_date?: string
  deohill_date?: string
  move_in_date?: string
  direction?: string
  maintenance_fee?: string
  notes?: string
}

export interface NormalizedSheetProperty extends SheetPropertyRow {
  alias: string
  category: string
  price_sale: number | null
  price_deposit: number | null
  price_monthly: number | null
  area_exclusive: number | null
  area_supply: number | null
  area_pyeong: number | null
  source_platform: 'sheet'
}

export interface SheetSyncResult {
  ok: boolean
  synced: number
  inserted: number
  updated: number
  skipped: number
  error?: string
}

const SHEET_COLUMN_ALIASES: Record<string, keyof SheetPropertyRow | null> = {
  f: 'registered_date',
  등록일: 'registered_date',
  핸들링: 'handling_name',
  대표주소: 'neighborhood',
  카테고리: 'category',
  별칭: 'alias',
  동: 'building_dong',
  호수: 'unit_number',
  랜덤광고: 'ad_level',
  종류: 'deal_type',
  가격: 'price_text',
  면적: 'area_text',
  소유자: null,
  '통신사 및 연락처': null,
  한자리: 'hanjari_date',
  더힐: 'deohill_date',
  입주시기: 'move_in_date',
  방향: 'direction',
  관리비: 'maintenance_fee',
  기타사항: 'notes',
}

function cleanCell(value: unknown): string {
  return String(value ?? '').trim()
}

export function googleSheetValuesToRows(values: unknown[][]): SheetPropertyRow[] {
  if (values.length === 0) return []
  const headers = values[0].map(cleanCell)

  return values.slice(1).map((row) => {
    const mapped: SheetPropertyRow = {}
    headers.forEach((header, index) => {
      const key = SHEET_COLUMN_ALIASES[header]
      if (!key) return
      const value = cleanCell(row[index])
      if (value) mapped[key] = key === 'registered_date' ? normalizeRegisteredDate(value) ?? value : value
    })

    const addressParts = [
      mapped.neighborhood,
      mapped.alias,
      mapped.building_dong,
      mapped.unit_number,
    ].filter(Boolean)
    mapped.road_address = addressParts.join(' ')
    mapped.building_name = mapped.alias
    return mapped
  }).filter((row) => Object.values(row).some(Boolean))
}

export function normalizeSheetProperty(row: SheetPropertyRow): NormalizedSheetProperty {
  const price = parsePriceText(row.price_text)
  const area = parseAreaText(row.area_text)
  const base = { road_address: row.road_address, building_name: row.building_name ?? row.alias }

  return {
    ...row,
    alias: row.alias?.trim() || suggestAlias(base),
    category: row.category?.trim() || suggestCategory(base),
    price_sale: price.price_sale,
    price_deposit: price.price_deposit,
    price_monthly: price.price_monthly,
    area_exclusive: area.area_exclusive,
    area_supply: area.area_supply,
    area_pyeong: area.area_pyeong,
    source_platform: 'sheet',
  }
}

export function makeSheetPropertyKey(row: Pick<SheetPropertyRow, 'alias' | 'building_dong' | 'unit_number'>): string {
  return [row.alias, row.building_dong, row.unit_number]
    .map((value) => cleanCell(value))
    .filter(Boolean)
    .join('|')
}

function parseGoogleCredentials() {
  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS
  if (!raw) throw new Error('Missing env: GOOGLE_SHEETS_CREDENTIALS')
  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  const credentials = JSON.parse(json) as { client_email?: string; private_key?: string }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS must include client_email and private_key')
  }
  return credentials
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function signJwt(payload: Record<string, unknown>, privateKey: string): Promise<string> {
  const { createSign } = await import('crypto')
  const header = { alg: 'RS256', typ: 'JWT' }
  const body = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`
  const signer = createSign('RSA-SHA256')
  signer.update(body)
  signer.end()
  return `${body}.${base64Url(signer.sign(privateKey))}`
}

async function getGoogleAccessToken(): Promise<string> {
  const credentials = parseGoogleCredentials()
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJwt({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, credentials.private_key!)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status}`)
  const data = await response.json() as { access_token?: string }
  if (!data.access_token) throw new Error('Google OAuth response did not include access_token')
  return data.access_token
}

async function fetchSheetValues(): Promise<unknown[][]> {
  const sheetId = process.env.GOOGLE_SHEET_ID
  const range = process.env.GOOGLE_SHEET_RANGE
  if (!sheetId || !range) throw new Error('Missing env: GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE')

  const token = await getGoogleAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`Google Sheets API failed: ${response.status}`)
  const data = await response.json() as { values?: unknown[][] }
  return data.values ?? []
}

function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function upsertSheetProperty(supabase: ReturnType<typeof createServiceSupabaseClient>, property: NormalizedSheetProperty): Promise<'inserted' | 'updated' | 'skipped'> {
  const key = makeSheetPropertyKey(property)
  if (!key) return 'skipped'

  const payload = {
    road_address: property.road_address || key,
    building_name: property.building_name || property.alias || null,
    building_dong: property.building_dong || null,
    unit_number: property.unit_number || null,
    deal_type: property.deal_type || null,
    status: '공실',
    is_our_property: true,
    registered_date: property.registered_date || null,
    handling_name: property.handling_name || null,
    neighborhood: property.neighborhood || null,
    category: property.category || null,
    alias: property.alias || null,
    ad_level: property.ad_level || null,
    price_text: property.price_text || null,
    price_sale: property.price_sale,
    price_deposit: property.price_deposit,
    price_monthly: property.price_monthly,
    area_text: property.area_text || null,
    area_exclusive: property.area_exclusive,
    area_supply: property.area_supply,
    area_pyeong: property.area_pyeong,
    move_in_date: property.move_in_date || null,
    direction: property.direction || null,
    maintenance_fee: property.maintenance_fee || null,
    notes: property.notes || null,
    hanjari_date: property.hanjari_date || null,
    deohill_date: property.deohill_date || null,
    source_platform: 'sheet' as const,
  }

  const { data: existing, error: selectError } = await supabase
    .from('properties')
    .select('id')
    .eq('source_platform', 'sheet')
    .eq('alias', property.alias)
    .eq('building_dong', property.building_dong ?? '')
    .eq('unit_number', property.unit_number ?? '')
    .maybeSingle()
  if (selectError) throw selectError

  if (existing?.id) {
    const { error } = await supabase.from('properties').update(payload).eq('id', existing.id)
    if (error) throw error
    return 'updated'
  }

  const { error } = await supabase.from('properties').insert(payload)
  if (error) throw error
  return 'inserted'
}

export async function syncGoogleSheet(): Promise<SheetSyncResult> {
  const required = ['GOOGLE_SHEETS_CREDENTIALS', 'GOOGLE_SHEET_ID', 'GOOGLE_SHEET_RANGE', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    return { ok: false, synced: 0, inserted: 0, updated: 0, skipped: 0, error: `Missing env: ${missing.join(', ')}` }
  }

  try {
    const values = await fetchSheetValues()
    const rows = googleSheetValuesToRows(values).map(normalizeSheetProperty)
    const supabase = createServiceSupabaseClient()
    const summary: SheetSyncResult = { ok: true, synced: 0, inserted: 0, updated: 0, skipped: 0 }

    for (const row of rows) {
      const result = await upsertSheetProperty(supabase, row)
      summary.synced += result === 'skipped' ? 0 : 1
      summary.inserted += result === 'inserted' ? 1 : 0
      summary.updated += result === 'updated' ? 1 : 0
      summary.skipped += result === 'skipped' ? 1 : 0
    }

    return summary
  } catch (error) {
    return {
      ok: false,
      synced: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Unknown Google Sheets sync error',
    }
  }
}

import { parseAreaText } from './areaParser'
import { parseCarrierText } from './carrierParser'
import { normalizeRegisteredDate } from './dateNormalizer'
import { parsePriceText } from './priceParser'

export type CsvRow = string[]
export type HandlingKind = 'agency' | 'person' | null
export type PersonRole = '없음' | '매도인' | '매수인' | '임차인' | '임대인' | '복합'

export interface RawPropertyRow {
  registered_date: string
  handling_raw: string
  neighborhood: string
  category: string
  alias: string
  building_dong: string
  unit_number: string
  ad_or_approval: string
  deal_type_raw: string
  price_text: string
  area_text: string
  owner_text: string
  carrier_text: string
  hanjari_date: string
  deohill_date: string
  move_in_date: string
  direction_raw: string
  maintenance_fee: string
  notes: string
}

export interface NormalizedPropertyRow extends RawPropertyRow {
  csv_row_number: number
  road_address: string
  handling_name: string | null
  handling_kind: HandlingKind
  deal_type: string | null
  status: string
  owner_role: PersonRole
  is_exclusive: boolean
  is_strategic: boolean
  ad_level: string | null
  approval_date: string | null
  direction: string | null
  owner_names: string[]
  owner_contacts: ParsedOwner[]
  share_ratios: string[]
  owner_phone: string | null
  owner_carrier: string | null
  owner_carrier_note: string | null
  price_sale: number | null
  price_deposit: number | null
  price_monthly: number | null
  area_exclusive: number | null
  area_supply: number | null
  area_pyeong: number | null
}

export interface PersonSeed {
  name: string
  source_name: string
  phone: string | null
  carrier: string | null
  carrier_note: string | null
  role: PersonRole
  address: string | null
  notes: string | null
  is_corporate?: boolean
}

export interface ParsedOwner {
  name: string
  phone: string | null
  carrier: 'SKT' | 'KT' | 'LGU' | null
  carrier_note: string | null
  is_corporate: boolean
  notes: string | null
}

export const PRIMARY_COLUMN_COUNT = 19

export const OUR_OFFICES = new Set(['한자리', '더힐'])

export const KNOWN_AGENCIES = new Set([
  '한자리', '더힐', '경희', '이야기', '세일', '한양', '대교', '미래파크힐스',
  '삼성', '현대박', '이레', '서울', '옥수힐', '금호탑', '한남동부동', '한강',
  '삼성양', '하나', '더힐폰', '반도114', '골드',
])

export const HANDLING_PEOPLE = new Set([
  '곽소장', '부녀회장', '워크인', '이선유', '허원장',
  '허지연', '장은하', '김민주', '내어회장',
])

export const DB_DEAL_TYPES = new Set(['매매', '전세', '월세', '단기임대', '반전세', '반월세', '렌트', '임대'])

const DIRECTIONS = new Set([
  '동', '서', '남', '북', '남동', '남서', '북동', '북서',
  '동북', '동남', '서북', '서남', '남향', '북향', '동향', '서향',
])

const PHONE_PATTERN = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g

export function clean(value: string | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n').trim()
}

export function isPrimaryDataRow(row: CsvRow): boolean {
  return row.slice(0, PRIMARY_COLUMN_COUNT).some((value) => clean(value) !== '')
}

export function toRawProperty(row: CsvRow): RawPropertyRow {
  return {
    registered_date: normalizeRegisteredDate(clean(row[0])) ?? '',
    handling_raw: clean(row[1]),
    neighborhood: clean(row[2]),
    category: clean(row[3]),
    alias: clean(row[4]),
    building_dong: clean(row[5]),
    unit_number: clean(row[6]),
    ad_or_approval: clean(row[7]),
    deal_type_raw: clean(row[8]),
    price_text: clean(row[9]),
    area_text: clean(row[10]),
    owner_text: clean(row[11]),
    carrier_text: clean(row[12]),
    hanjari_date: clean(row[13]),
    deohill_date: clean(row[14]),
    move_in_date: clean(row[15]),
    direction_raw: clean(row[16]),
    maintenance_fee: clean(row[17]),
    notes: clean(row[18]),
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return raw
}

function extractPhones(text: string): string[] {
  return Array.from(text.matchAll(PHONE_PATTERN)).map((match) => formatPhone(match[0]))
}

function parseCarrierFromText(text: string): Pick<ParsedOwner, 'carrier' | 'carrier_note'> {
  const upper = text.toUpperCase()
  if (upper.includes('SK')) return { carrier: 'SKT', carrier_note: null }
  if (upper.includes('LG') || upper.includes('LGU') || text.includes('엘지')) return { carrier: 'LGU', carrier_note: null }
  if (upper.includes('KT')) return { carrier: 'KT', carrier_note: null }
  const note = text
    .replace(PHONE_PATTERN, '')
    .replace(/[()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { carrier: null, carrier_note: note || null }
}

function contactSegments(raw: string): string[] {
  return raw
    .split(/[,\n/·]+|및/g)
    .map((value) => value.trim())
    .filter(Boolean)
}

function stripOutsideOwnerMarker(raw: string): string {
  return raw.replace(/\s*외\s*\d*\s*명?.*$/u, '').trim()
}

export function splitOwners(raw: string): string[] {
  return Array.from(new Set(stripOutsideOwnerMarker(raw)
    .replace(/^v/i, '')
    .split(/[,\n/·]+|및/g)
    .map((value) => value.trim())
    .filter((value) => value && value !== '???')))
}

export function detectCorporate(name: string): boolean {
  const compact = name.replace(/\s+/g, '')
  if (!compact) return false
  if (/^(?:소유자|워크인)\d+$/u.test(compact)) return false
  if (/^[가-힣]{2,4}\d+$/u.test(compact)) return false
  if (/(주식회사|\(주\)|㈜|법인|회사|유한회사|재단|조합|개발|건설|산업|홀딩스|투자)/u.test(compact)) return true
  return !/^[가-힣]{2,4}$/u.test(compact)
}

export function calculateShareRatios(count: number): string[] {
  if (count <= 0) return []
  const share = 100 / count
  const formatted = Number.isInteger(share) ? `${share}%` : `${share.toFixed(2)}%`
  return Array.from({ length: count }, () => formatted)
}

export function isValidDirection(direction: string): boolean {
  return DIRECTIONS.has(direction.trim())
}

export function isCoBrokerHandling(handling: string | null | undefined): boolean {
  const value = (handling ?? '').trim()
  return Boolean(value && KNOWN_AGENCIES.has(value) && !OUR_OFFICES.has(value))
}

export function parseOwnerContacts(ownerRaw: string, contactRaw: string): ParsedOwner[] {
  const owners = splitOwners(ownerRaw)
  const segments = contactSegments(contactRaw)
  const phoneSegments = segments.filter((segment) => extractPhones(segment).length > 0)
  const allPhones = extractPhones(contactRaw)

  const makeOwner = (name: string, segment: string, extraNotes: string[] = []): ParsedOwner => {
    const phones = extractPhones(segment)
    const phone = phones[0] ?? null
    const carrier = parseCarrierFromText(segment)
    const cleanedNotes = [
      ...extraNotes,
      segment
        .replace(PHONE_PATTERN, '')
        .replace(/\b(?:SKT?|KT|LGU?|LG)\b/gi, '')
        .replace(/엘지/g, '')
        .replace(/[()/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    ].filter(Boolean)
    return {
      name,
      phone,
      carrier: carrier.carrier,
      carrier_note: carrier.carrier_note,
      is_corporate: detectCorporate(name),
      notes: cleanedNotes.join('\n') || null,
    }
  }

  if (owners.length === 0 && allPhones.length > 0) {
    return phoneSegments.map((segment, index) => makeOwner(`소유자${index + 1}`, segment))
  }

  if (owners.length === 0) return []

  if (owners.length === phoneSegments.length) {
    return owners.map((owner, index) => makeOwner(owner, phoneSegments[index] ?? contactRaw))
  }

  if (owners.length === 1 && phoneSegments.length > 1) {
    const [, ...rest] = phoneSegments
    return [makeOwner(owners[0], phoneSegments[0], rest)]
  }

  return owners.map((owner, index) => makeOwner(owner, phoneSegments[index] ?? contactRaw))
}

export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (ch === '"') {
      if (quoted && next === '"') {
        field += '"'
        i += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (ch === ',' && !quoted) {
      row.push(field)
      field = ''
      continue
    }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export function normalizeDealType(raw: string): { deal_type: string | null; status: string } {
  const text = raw.replace(/\s+/g, '').trim()
  if (!text) return { deal_type: null, status: '공실' }
  if (text === '급매') return { deal_type: '매매', status: '급매' }
  if (text === '보류') return { deal_type: '매매', status: '보류' }
  if (text === '완료' || text === 'X') return { deal_type: null, status: '완료' }
  if (text === '반전') return { deal_type: '반전세', status: '공실' }
  if (text === '반월') return { deal_type: '반월세', status: '공실' }
  if (text === '임대') return { deal_type: '월세', status: '공실' }
  if (text === '단기') return { deal_type: '단기임대', status: '공실' }
  if (text === '매도' || text === '매매?') return { deal_type: '매매', status: '공실' }
  if (text === '월세?' || text === '급월세') return { deal_type: '월세', status: text === '급월세' ? '급매' : '공실' }
  if (text === '전월세') return { deal_type: '반전세', status: '공실' }
  if (text.includes('전세') && text.includes('반전세')) return { deal_type: '반전세', status: '공실' }
  if (DB_DEAL_TYPES.has(text)) return { deal_type: text, status: '공실' }
  return { deal_type: text, status: '확인필요' }
}

export function ownerRoleForDealType(dealType: string | null): PersonRole {
  if (dealType === '매매') return '매도인'
  if (dealType && ['전세', '월세', '단기임대', '반전세', '반월세', '렌트', '임대'].includes(dealType)) return '임대인'
  return '없음'
}

export function mergePersonRoles(roles: Iterable<PersonRole>): PersonRole {
  const roleSet = new Set(Array.from(roles).filter((role) => role !== '없음'))
  if (roleSet.size === 0) return '없음'
  if (roleSet.size === 1) return Array.from(roleSet)[0] as PersonRole
  return '복합'
}

function normalizeHandling(raw: string, workInIndex: number): Pick<NormalizedPropertyRow, 'handling_name' | 'handling_kind' | 'is_exclusive' | 'is_strategic'> {
  const value = raw.trim()
  if (value === '전속') return { handling_name: '한자리', handling_kind: 'agency', is_exclusive: true, is_strategic: false }
  if (value === '전략매물') return { handling_name: '한자리', handling_kind: 'agency', is_exclusive: false, is_strategic: true }
  if (!value) return { handling_name: null, handling_kind: null, is_exclusive: false, is_strategic: false }
  if (KNOWN_AGENCIES.has(value)) return { handling_name: value, handling_kind: 'agency', is_exclusive: false, is_strategic: false }
  if (value === '워크인') return { handling_name: `워크인${workInIndex}`, handling_kind: 'person', is_exclusive: false, is_strategic: false }
  if (HANDLING_PEOPLE.has(value)) return { handling_name: value, handling_kind: 'person', is_exclusive: false, is_strategic: false }
  return { handling_name: value, handling_kind: null, is_exclusive: false, is_strategic: false }
}

function normalizeAdApproval(value: string): { ad_level: string | null; approval_date: string | null } {
  if (!value) return { ad_level: null, approval_date: null }
  if (/[고중저]/.test(value) && !/\d{4}[./-]\d{1,2}/.test(value)) return { ad_level: value, approval_date: null }
  return { ad_level: null, approval_date: value }
}

function normalizeDirection(raw: string, currentMoveIn: string): { direction: string | null; move_in_date: string } {
  const value = raw.trim()
  if (!value) return { direction: null, move_in_date: currentMoveIn }
  if (isValidDirection(value)) return { direction: value, move_in_date: currentMoveIn }
  return { direction: null, move_in_date: currentMoveIn || value }
}

function ownerNames(ownerText: string): string[] {
  return splitOwners(ownerText)
}

function roadAddress(raw: RawPropertyRow): string {
  return [raw.neighborhood, raw.alias, raw.building_dong, raw.unit_number].filter(Boolean).join(' ')
}

function normalizeMoneyForContext(row: RawPropertyRow, dealType: string | null) {
  const parsed = parsePriceText(row.price_text)
  if (/^\d+(?:\.\d+)?$/.test(row.price_text) && dealType === '매매') {
    parsed.price_sale = Math.round(Number(row.price_text) * 100_000_000)
  }
  return parsed
}

export function normalizeRows(csvRows: CsvRow[]): NormalizedPropertyRow[] {
  let workInIndex = 0
  return csvRows
    .slice(1)
    .map((row, index) => ({ row, csvRowNumber: index + 2 }))
    .filter(({ row }) => isPrimaryDataRow(row))
    .map(({ row, csvRowNumber }) => {
      const raw = toRawProperty(row)
      if (raw.handling_raw.trim() === '워크인') workInIndex += 1
      const deal = normalizeDealType(raw.deal_type_raw)
      const handling = normalizeHandling(raw.handling_raw, workInIndex)
      const ad = normalizeAdApproval(raw.ad_or_approval)
      const direction = normalizeDirection(raw.direction_raw, raw.move_in_date)
      const price = normalizeMoneyForContext(raw, deal.deal_type)
      const area = parseAreaText(raw.area_text)
      const carrier = parseCarrierText(raw.carrier_text)
      const ownerContacts = parseOwnerContacts(raw.owner_text, raw.carrier_text)
      const fallbackOwnerName = [raw.alias, raw.building_dong && raw.unit_number ? `${raw.building_dong}-${raw.unit_number}` : raw.building_dong || raw.unit_number]
        .filter(Boolean)
        .join(' ')
      const normalizedOwners = ownerContacts.length > 0
        ? ownerContacts
        : [{
          name: fallbackOwnerName || `소유자${csvRowNumber}`,
          phone: carrier.phone,
          carrier: carrier.carrier,
          carrier_note: carrier.carrier_note,
          is_corporate: detectCorporate(fallbackOwnerName || `소유자${csvRowNumber}`),
          notes: null,
        }]

      return {
        ...raw,
        csv_row_number: csvRowNumber,
        road_address: roadAddress(raw) || raw.neighborhood || raw.alias || `CSV row ${csvRowNumber}`,
        handling_name: handling.handling_name,
        handling_kind: handling.handling_kind,
        deal_type: deal.deal_type,
        status: deal.status,
        owner_role: ownerRoleForDealType(deal.deal_type),
        is_exclusive: handling.is_exclusive,
        is_strategic: handling.is_strategic,
        ad_level: ad.ad_level,
        approval_date: ad.approval_date,
        direction: direction.direction,
        move_in_date: direction.move_in_date,
        owner_names: normalizedOwners.map((owner) => owner.name),
        owner_contacts: normalizedOwners,
        share_ratios: calculateShareRatios(normalizedOwners.length),
        owner_phone: normalizedOwners[0]?.phone ?? carrier.phone,
        owner_carrier: normalizedOwners[0]?.carrier ?? carrier.carrier,
        owner_carrier_note: normalizedOwners[0]?.carrier_note ?? carrier.carrier_note,
        price_sale: price.price_sale,
        price_deposit: price.price_deposit,
        price_monthly: price.price_monthly,
        area_exclusive: area.area_exclusive,
        area_supply: area.area_supply,
        area_pyeong: area.area_pyeong,
      }
    })
}

export function buildOwnerPeople(rows: NormalizedPropertyRow[]): PersonSeed[] {
  const base = new Map<string, PersonSeed>()
  const phonesByName = new Map<string, Set<string>>()

  for (const row of rows) {
    for (const owner of row.owner_contacts) {
      const phoneKey = owner.phone ?? ''
      const key = `${owner.name}|${phoneKey}`
      phonesByName.set(owner.name, (phonesByName.get(owner.name) ?? new Set()).add(phoneKey))
      const current = base.get(key)
      const roles = [current?.role as PersonRole | undefined, row.owner_role].filter(Boolean) as PersonRole[]
      base.set(key, {
        name: owner.name,
        source_name: owner.name,
        phone: owner.phone,
        carrier: owner.carrier,
        carrier_note: owner.carrier_note,
        role: mergePersonRoles(roles) as PersonRole,
        address: current?.address ?? row.road_address,
        notes: [current?.notes, owner.notes].filter(Boolean).join('\n') || null,
        is_corporate: owner.is_corporate,
      })
    }
  }

  const orderByName = new Map<string, number>()
  return Array.from(base.values()).map((person) => {
    const variants = phonesByName.get(person.source_name)
    if (!variants || variants.size <= 1) return person
    const next = (orderByName.get(person.source_name) ?? 0) + 1
    orderByName.set(person.source_name, next)
    return { ...person, name: `${person.source_name}${next}` }
  })
}

export function buildHandlingPeople(rows: NormalizedPropertyRow[]): PersonSeed[] {
  const names = new Set(rows
    .filter((row) => row.handling_kind === 'person' && row.handling_name)
    .map((row) => row.handling_name as string))

  return Array.from(names).map((name) => ({
    name,
    source_name: name.replace(/\d+$/, '') || name,
    phone: null,
    carrier: null,
    carrier_note: null,
    role: '없음',
    address: null,
    notes: name.startsWith('워크인') ? '워크인 핸들링 인물. 매물별 구분을 위해 자동 넘버링됨.' : null,
  }))
}

export function uniqueBy<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of rows) {
    const k = key(row)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(row)
  }
  return out
}

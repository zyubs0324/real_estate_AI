export type Carrier = 'SKT' | 'KT' | 'LGU'

export interface ParsedCarrier {
  carrier: Carrier | null
  carrier_note: string | null
  phone: string | null
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return raw
}

export function parseCarrierText(input: string | null | undefined): ParsedCarrier {
  const text = (input ?? '').trim()
  const phoneMatch = text.match(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/)
  const phone = phoneMatch ? formatPhone(phoneMatch[0]) : null

  const upper = text.toUpperCase()
  if (upper.includes('SK')) return { carrier: 'SKT', carrier_note: null, phone }
  if (upper.includes('LG') || text.includes('엘지')) return { carrier: 'LGU', carrier_note: null, phone }
  if (upper.includes('KT')) return { carrier: 'KT', carrier_note: null, phone }

  const note = text
    .replace(phoneMatch?.[0] ?? '', '')
    .replace(/[()]/g, '')
    .trim()
  if (note) return { carrier: null, carrier_note: note, phone }

  return { carrier: null, carrier_note: null, phone }
}

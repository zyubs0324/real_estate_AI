import { createBrowserSupabaseClient } from './client'

export interface PropertyAgencyRow {
  id: string
  property_id: string
  agency_id: string
  relation_type: string
  memo: string | null
  created_at: string
}

export async function listPropertyCoBrokers(propertyId: string): Promise<PropertyAgencyRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('property_agencies')
    .select('id, property_id, agency_id, relation_type, memo, created_at, agencies(id, name, alias)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PropertyAgencyRow[]
}

export async function addPropertyCoBroker(
  propertyId: string,
  agencyId: string,
  memo?: string,
): Promise<{ id: string }> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('property_agencies')
    .insert({
      property_id: propertyId,
      agency_id: agencyId,
      relation_type: 'co_broker',
      memo: memo ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data as { id: string }
}

export async function removePropertyCoBroker(
  propertyId: string,
  agencyId: string,
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('property_agencies')
    .delete()
    .eq('property_id', propertyId)
    .eq('agency_id', agencyId)

  if (error) throw error
}

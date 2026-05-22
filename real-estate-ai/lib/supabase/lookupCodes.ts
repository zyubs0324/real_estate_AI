import { createBrowserSupabaseClient } from './client'

export interface LookupCodeRow {
  id: string
  category: string
  value: string
  label: string
  sort_order: number
  is_active?: boolean
}

export async function listLookupCodes(category: string): Promise<LookupCodeRow[]> {
  const supabase = createBrowserSupabaseClient()
  const { data, error } = await supabase
    .from('lookup_codes')
    .select('id, category, value, label, sort_order, is_active')
    .eq('category', category)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as LookupCodeRow[]
}

export async function upsertLookupCode(
  category: string,
  value: string,
  label = value,
): Promise<void> {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase
    .from('lookup_codes')
    .upsert({
      category,
      value,
      label,
    }, { onConflict: 'category,value' })

  if (error) throw error
}

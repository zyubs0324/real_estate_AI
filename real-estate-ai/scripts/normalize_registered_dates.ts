import { createClient } from '@supabase/supabase-js'
import { normalizeRegisteredDate } from '../lib/property/dateNormalizer'

type PropertyDateRow = {
  id: string
  registered_date: string | null
}

function loadEnvLocal() {
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const execute = process.argv.includes('--execute')
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data, error } = await supabase
    .from('properties')
    .select('id, registered_date')
    .not('registered_date', 'is', null)

  if (error) throw error

  const updates = ((data ?? []) as PropertyDateRow[])
    .map((row) => ({
      id: row.id,
      before: row.registered_date,
      after: normalizeRegisteredDate(row.registered_date),
    }))
    .filter((row) => row.after && row.before !== row.after)

  console.log(`registered_date rows to normalize: ${updates.length}`)
  console.log(updates.slice(0, 20))

  if (!execute) {
    console.log('dry-run only. Run with --execute to update Supabase.')
    return
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('properties')
      .update({ registered_date: update.after })
      .eq('id', update.id)
    if (updateError) throw updateError
  }
  console.log(`updated ${updates.length} properties`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

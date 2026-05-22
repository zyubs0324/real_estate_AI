import * as fs from 'fs'
import * as path from 'path'

const migrationPath = (fileName: string) => path.resolve(
  __dirname,
  '../../supabase/migrations',
  fileName,
)

describe('CRM enhancement migrations', () => {
  describe('010_property_agencies.sql', () => {
    const filePath = migrationPath('010_property_agencies.sql')
    let sql: string

    beforeAll(() => {
      sql = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').toLowerCase() : ''
    })

    it('exists and is not empty', () => {
      expect(fs.existsSync(filePath)).toBe(true)
      expect(sql.trim().length).toBeGreaterThan(300)
    })

    it('creates property_agencies for co-broker relationships', () => {
      expect(sql).toContain('create table if not exists property_agencies')
      expect(sql).toContain('property_id uuid not null references properties(id) on delete cascade')
      expect(sql).toContain('agency_id uuid not null references agencies(id) on delete cascade')
      expect(sql).toContain("relation_type text not null default 'co_broker'")
      expect(sql).toContain('unique (property_id, agency_id, relation_type)')
    })

    it('enables authenticated RLS and indexes lookup columns', () => {
      expect(sql).toContain('alter table property_agencies enable row level security')
      expect(sql).toContain('auth.uid() is not null')
      expect(sql).toContain('idx_property_agencies_property')
      expect(sql).toContain('idx_property_agencies_agency')
    })

    it('extends agencies and people with CRM fields idempotently', () => {
      expect(sql).toContain('add column if not exists trust_level')
      expect(sql).toContain("add column if not exists tags")
      expect(sql).toContain('add column if not exists is_corporate')
      expect(sql).toContain('add column if not exists display_name')
    })
  })

  describe('011_lookup_and_storage.sql', () => {
    const filePath = migrationPath('011_lookup_and_storage.sql')
    let sql: string

    beforeAll(() => {
      sql = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').toLowerCase() : ''
    })

    it('exists and is not empty', () => {
      expect(fs.existsSync(filePath)).toBe(true)
      expect(sql.trim().length).toBeGreaterThan(300)
    })

    it('seeds lookup code categories used by editable CRM fields', () => {
      expect(sql).toContain('person_role')
      expect(sql).toContain('agency_trust_level')
      expect(sql).toContain('agency_tag')
      expect(sql).toContain('on conflict (category, value) do nothing')
    })

    it('creates a private property-photos storage bucket', () => {
      expect(sql).toContain('storage.buckets')
      expect(sql).toContain("'property-photos'")
      expect(sql).toContain('public = false')
    })

    it('adds authenticated storage policies for all object operations', () => {
      expect(sql).toContain('for select')
      expect(sql).toContain('for insert')
      expect(sql).toContain('for update')
      expect(sql).toContain('for delete')
      expect(sql).toContain("bucket_id = 'property-photos'")
      expect(sql).toContain('auth.uid() is not null')
    })
  })
})

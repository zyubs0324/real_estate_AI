-- ============================================================
-- CRM enhancement: property co-broker relationships and entity metadata
-- Run manually in Supabase SQL Editor after earlier CRM migrations.
-- ============================================================

CREATE TABLE IF NOT EXISTS property_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'co_broker',
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, agency_id, relation_type)
);

ALTER TABLE property_agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON property_agencies;
CREATE POLICY "authenticated_only" ON property_agencies
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_property_agencies_property
  ON property_agencies(property_id);

CREATE INDEX IF NOT EXISTS idx_property_agencies_agency
  ON property_agencies(agency_id);

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS is_our_office BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT '일반',
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT CHECK (carrier IN ('SKT', 'KT', 'LGU')),
  ADD COLUMN IF NOT EXISTS carrier_note TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_address TEXT NOT NULL,
  building_dong TEXT,
  unit_number TEXT,
  floor_info TEXT,
  bd_mgt_sn TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  quick_check_summary TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON report_history;
CREATE POLICY "authenticated_only" ON report_history
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_report_history_created_at
  ON report_history(created_at DESC);

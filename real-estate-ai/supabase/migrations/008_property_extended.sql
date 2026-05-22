ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS is_our_office BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alias TEXT;

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT CHECK (carrier IN ('SKT', 'KT', 'LGU')),
  ADD COLUMN IF NOT EXISTS carrier_note TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS registered_date TEXT,
  ADD COLUMN IF NOT EXISTS handling_agency_id UUID REFERENCES agencies(id),
  ADD COLUMN IF NOT EXISTS handling_person_id UUID REFERENCES people(id),
  ADD COLUMN IF NOT EXISTS handling_name TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS ad_level TEXT,
  ADD COLUMN IF NOT EXISTS approval_date TEXT,
  ADD COLUMN IF NOT EXISTS price_text TEXT,
  ADD COLUMN IF NOT EXISTS price_sale BIGINT,
  ADD COLUMN IF NOT EXISTS price_deposit BIGINT,
  ADD COLUMN IF NOT EXISTS price_monthly BIGINT,
  ADD COLUMN IF NOT EXISTS area_text TEXT,
  ADD COLUMN IF NOT EXISTS area_exclusive NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS area_supply NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS move_in_date TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS maintenance_fee TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS floor_info TEXT,
  ADD COLUMN IF NOT EXISTS total_floors INTEGER,
  ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS source_platform TEXT CHECK (source_platform IN ('direct','naver','zigbang','peterpan','dabang','sheet')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_agent_name TEXT,
  ADD COLUMN IF NOT EXISTS source_agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS source_agent_agency TEXT,
  ADD COLUMN IF NOT EXISTS hanjari_date TEXT,
  ADD COLUMN IF NOT EXISTS deohill_date TEXT,
  ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_strategic BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_deal_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_deal_type_check
  CHECK (deal_type IN ('매매', '전세', '월세', '단기임대', '반전세', '반월세', '렌트', '임대'));

CREATE TABLE IF NOT EXISTS co_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  share_ratio TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, person_id)
);

ALTER TABLE co_ownership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON co_ownership;
CREATE POLICY "authenticated_only" ON co_ownership
  USING (auth.uid() IS NOT NULL);

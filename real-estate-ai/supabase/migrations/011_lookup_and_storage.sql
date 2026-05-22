-- ============================================================
-- CRM enhancement: editable lookup seeds and private property photo storage
-- Run manually in Supabase SQL Editor after 010_property_agencies.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS lookup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, value)
);

ALTER TABLE lookup_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON lookup_codes;
CREATE POLICY "authenticated_only" ON lookup_codes
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO lookup_codes (category, value, label, sort_order) VALUES
  ('person_role', '없음', '없음', 1),
  ('person_role', '매도인', '매도인', 2),
  ('person_role', '매수인', '매수인', 3),
  ('person_role', '임차인', '임차인', 4),
  ('person_role', '임대인', '임대인', 5),
  ('person_role', '복합', '복합', 6),
  ('agency_trust_level', '신뢰', '신뢰', 1),
  ('agency_trust_level', '일반', '일반', 2),
  ('agency_trust_level', '주의', '주의', 3),
  ('agency_tag', '협조적', '협조적', 1),
  ('agency_tag', '응답느림', '응답느림', 2),
  ('agency_tag', '광고강함', '광고강함', 3),
  ('agency_tag', '가격협상주의', '가격협상주의', 4),
  ('agency_tag', '분쟁주의', '분쟁주의', 5),
  ('agency_tag', '자료정확', '자료정확', 6),
  ('agency_tag', '연락주의', '연락주의', 7)
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "property_photos_select" ON storage.objects;
CREATE POLICY "property_photos_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "property_photos_insert" ON storage.objects;
CREATE POLICY "property_photos_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "property_photos_update" ON storage.objects;
CREATE POLICY "property_photos_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "property_photos_delete" ON storage.objects;
CREATE POLICY "property_photos_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'property-photos'
    AND auth.uid() IS NOT NULL
  );

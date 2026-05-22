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

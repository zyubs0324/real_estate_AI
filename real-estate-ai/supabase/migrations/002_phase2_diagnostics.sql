-- Phase 2: 주소 진단 결과 캐싱 테이블
-- U2-4: Quick Check 결과를 저장 (재조회 시 캐시 활용)

CREATE TABLE IF NOT EXISTS property_diagnostics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_mgt_sn        text NOT NULL,          -- 건물관리번호 (upsert 기준)
  road_addr        text NOT NULL,          -- 도로명주소

  -- 건축물대장
  has_violation    boolean NOT NULL DEFAULT false,  -- 위반건축물

  -- 등기부
  has_mortgage          boolean NOT NULL DEFAULT false,  -- 근저당
  has_seizure           boolean NOT NULL DEFAULT false,  -- 압류
  has_auction           boolean NOT NULL DEFAULT false,  -- 경매
  has_trust             boolean NOT NULL DEFAULT false,  -- 신탁
  has_lease_registration boolean NOT NULL DEFAULT false, -- 임차권등기

  -- 규제지역
  is_speculative_zone      boolean NOT NULL DEFAULT false,  -- 투기과열지구
  is_adjustment_zone       boolean NOT NULL DEFAULT false,  -- 조정대상지역
  is_land_transaction_zone boolean NOT NULL DEFAULT false,  -- 토지거래허가구역

  -- Quick Check 요약
  risk_items jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{label, level}]

  checked_at  date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- bdMgtSn 기준 upsert를 위한 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS property_diagnostics_bd_mgt_sn_idx
  ON property_diagnostics (bd_mgt_sn);

-- updated_at 자동 갱신
CREATE TRIGGER update_property_diagnostics_updated_at
  BEFORE UPDATE ON property_diagnostics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE property_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON property_diagnostics
  USING (auth.uid() IS NOT NULL);

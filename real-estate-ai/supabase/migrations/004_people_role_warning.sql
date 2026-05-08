-- ============================================================
-- 004_people_role_warning.sql
-- U3-5: people 테이블에 role, warning 컬럼 추가
-- ============================================================

-- 거래 역할 (매도인/매수인/임대인/임차인 등)
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS role TEXT;

-- 경고 플래그 (분쟁 이력, 사기 이력 등)
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS warning BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  RAISE NOTICE '✅ 004 마이그레이션 완료: people.role, people.warning 추가';
END $$;

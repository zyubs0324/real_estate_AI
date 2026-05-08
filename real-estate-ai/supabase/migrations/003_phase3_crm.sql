-- ============================================================
-- Phase 3 CRM 마이그레이션
-- U3-2: deal_type 추가 + 핵심 CRM 테이블
-- ============================================================

-- 1. properties 테이블에 deal_type 컬럼 추가
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS deal_type TEXT CHECK (deal_type IN ('매매', '전세', '월세', '단기임대'));

-- 2. transactions — 거래 정보
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  deal_type         TEXT NOT NULL CHECK (deal_type IN ('매매', '전세', '월세', '단기임대')),
  status            TEXT NOT NULL DEFAULT '상담'
                      CHECK (status IN ('상담', '계약진행', '계약완료', '잔금완료', '취소')),
  price             BIGINT,                    -- 매매가 / 전세금 (원)
  monthly_rent      BIGINT,                    -- 월세 (원)
  deposit           BIGINT,                    -- 보증금 (원)
  contract_date     DATE,
  start_date        DATE,
  end_date          DATE,
  commission_rate   NUMERIC(5,4),              -- 수수료율
  commission_amount BIGINT,                    -- 수수료 (원)
  commission_is_paid BOOLEAN NOT NULL DEFAULT false,
  memo              TEXT,
  assigned_user_id  UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON transactions USING (auth.uid() IS NOT NULL);

-- 3. transaction_participants — 거래 참여자 (매도인/매수인/임대인/임차인)
CREATE TABLE IF NOT EXISTS transaction_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES people(id),
  role           TEXT NOT NULL CHECK (role IN ('매도인', '매수인', '임대인', '임차인', '공동명의')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON transaction_participants USING (auth.uid() IS NOT NULL);

-- 4. schedules — 일정 (계약일, 잔금일, 현장 미팅 등)
CREATE TABLE IF NOT EXISTS schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  schedule_type  TEXT NOT NULL CHECK (schedule_type IN ('계약', '잔금', '현장미팅', '서류', '기타')),
  due_date       TIMESTAMPTZ NOT NULL,
  is_done        BOOLEAN NOT NULL DEFAULT false,
  memo           TEXT,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON schedules USING (auth.uid() IS NOT NULL);

-- 5. schedule_participants — 일정 참여자
CREATE TABLE IF NOT EXISTS schedule_participants (
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (schedule_id, user_id)
);

ALTER TABLE schedule_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON schedule_participants USING (auth.uid() IS NOT NULL);

-- 6. schedule_properties — 일정 연관 매물
CREATE TABLE IF NOT EXISTS schedule_properties (
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, property_id)
);

ALTER TABLE schedule_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON schedule_properties USING (auth.uid() IS NOT NULL);

-- 7. property_interests — 매물 관심 등록
CREATE TABLE IF NOT EXISTS property_interests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES people(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, person_id)
);

ALTER TABLE property_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON property_interests USING (auth.uid() IS NOT NULL);

-- 8. transaction_payments — 납부 단계 (계약금/중도금/잔금)
CREATE TABLE IF NOT EXISTS transaction_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,        -- 계약금, 중도금, 잔금
  amount         BIGINT NOT NULL,
  due_date       DATE,
  paid_date      DATE,
  is_paid        BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON transaction_payments USING (auth.uid() IS NOT NULL);

-- 9. transaction_checklists — 서류·체크리스트
CREATE TABLE IF NOT EXISTS transaction_checklists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  is_done        BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_only" ON transaction_checklists USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 마이그레이션 완료: deal_type, transactions, participants, schedules, interests, payments, checklists';
END
$$;

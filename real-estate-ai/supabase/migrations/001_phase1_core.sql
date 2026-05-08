-- ============================================================
-- Phase 1 Core Schema — 부동산 AI 어시스턴트
-- 파일: supabase/migrations/001_phase1_core.sql
-- 실행: Supabase 대시보드 > SQL Editor > 전체 복사 후 Run
-- ============================================================

-- pgvector 익스텐션 (Phase 4 RAG 임베딩용, 미리 활성화)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. users — 사무소 구성원 (Supabase Auth 연동)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member', 'assistant')),
  office_name   TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT false,
  settings      JSONB NOT NULL DEFAULT '{
    "lease_countdown_days": 100,
    "auto_priority_enabled": true,
    "auto_priority_days": 30,
    "external_notify_default": false,
    "external_notify_channels": ["email"],
    "notify_deadline_enabled": true,
    "notify_schedule_enabled": true,
    "notify_regulation_change_enabled": true,
    "notify_diagnosis_change_enabled": true,
    "notify_maintenance_recovery_enabled": true,
    "notify_maintenance_recovery_days": 7,
    "notify_commission_unpaid_enabled": true,
    "notify_commission_unpaid_days": 30
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON users
  USING (auth.uid() IS NOT NULL);

-- 신규 Auth 회원가입 시 users 레코드 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. agencies — 타부동산 사무소
-- ============================================================
CREATE TABLE IF NOT EXISTS agencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  representative  TEXT,
  phone           TEXT,
  address         TEXT,
  license_no      TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON agencies
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. people — 인물
-- ============================================================
CREATE TABLE IF NOT EXISTS people (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  birth_year   INTEGER,
  alias        TEXT,
  user_id      UUID REFERENCES users(id),
  agency_id    UUID REFERENCES agencies(id),
  agency_role  TEXT CHECK (agency_role IN ('대표중개사', '소속중개사', '중개보조원')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON people
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. lookup_codes — 드롭다운 선택값 통합 관리
-- ============================================================
CREATE TABLE IF NOT EXISTS lookup_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id),
  UNIQUE (category, value)
);

ALTER TABLE lookup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON lookup_codes
  USING (auth.uid() IS NOT NULL);

-- 기본 building_type 값 삽입
INSERT INTO lookup_codes (category, value, label, sort_order) VALUES
  ('building_type', '아파트',     '아파트',     1),
  ('building_type', '오피스텔',   '오피스텔',   2),
  ('building_type', '다세대주택', '다세대주택', 3),
  ('building_type', '연립주택',   '연립주택',   4),
  ('building_type', '단독주택',   '단독주택',   5),
  ('building_type', '상가',       '상가',       6),
  ('building_type', '사무실',     '사무실',     7),
  ('building_type', '기타',       '기타',       8)
ON CONFLICT (category, value) DO NOTHING;

-- ============================================================
-- 5. properties — 주소지(매물)
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_address         TEXT NOT NULL,          -- 도로명주소
  jibun_address        TEXT,                   -- 지번주소
  building_name        TEXT,                   -- 건물명
  building_dong        TEXT,                   -- 동
  unit_number          TEXT,                   -- 호수
  building_type        TEXT,                   -- lookup_codes(category='building_type') 참조
  source_url           TEXT,                   -- 외부 플랫폼 원본 링크
  external_ids         JSONB NOT NULL DEFAULT '{}',  -- 플랫폼별 고유 ID 맵
  listing_agency_id    UUID REFERENCES agencies(id),
  listing_agent_id     UUID REFERENCES people(id),
  status               TEXT NOT NULL DEFAULT '공실'
                         CHECK (status IN ('공실', '임대중', '매매완료', '중개진행중')),
  assigned_user_id     UUID REFERENCES users(id),
  is_our_property      BOOLEAN NOT NULL DEFAULT false,
  is_watchlist         BOOLEAN NOT NULL DEFAULT false,
  is_priority          BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON properties
  USING (auth.uid() IS NOT NULL);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. relations — 인물-주소지 역할 이력
-- ============================================================
CREATE TABLE IF NOT EXISTS relations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,   -- 소유자 / 임대인 / 임차인 / 매도인 / 매수인 등
  started_at   DATE,
  ended_at     DATE,            -- null = 현재 진행 중
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON relations
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 7. memos — 메모 (매물·인물·거래·타부동산 공용)
-- ============================================================
CREATE TABLE IF NOT EXISTS memos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'normal'
                    CHECK (type IN ('normal', 'warning', 'dispute')),
  property_id     UUID REFERENCES properties(id),
  person_id       UUID REFERENCES people(id),
  agency_id       UUID REFERENCES agencies(id),
  visibility      TEXT NOT NULL DEFAULT 'office'
                    CHECK (visibility IN ('private', 'office')),
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON memos
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. notifications — 알림 통합 관리
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL
                    CHECK (type IN (
                      '거래신고기한', '계약만료', '갱신청구권', '일정',
                      '규제지역변경', '진단변경', '대납미회수', '수수료미수령', '기타'
                    )),
  due_date        DATE NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON notifications
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 9. documents — AI 질의응답용 문서 (Phase 4 RAG)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL
                 CHECK (type IN ('law', 'case', 'press', 'notice', 'manual')),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  source       TEXT,
  source_date  DATE,
  embedding    vector(1024),    -- Cohere-embed-v3-multilingual (Phase 4에서 채움)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON documents
  USING (auth.uid() IS NOT NULL);

-- 벡터 유사도 검색 인덱스 (Phase 4 활성화 후 효과 발휘)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- 10. property_permissions — 매물별 접근 권한
-- ============================================================
CREATE TABLE IF NOT EXISTS property_permissions (
  property_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission     TEXT NOT NULL DEFAULT 'view'
                   CHECK (permission IN ('view', 'edit', 'manage')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, user_id)
);

ALTER TABLE property_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_only" ON property_permissions
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 마이그레이션 완료: users, agencies, people, lookup_codes, properties, relations, memos, notifications, documents, property_permissions';
END
$$;

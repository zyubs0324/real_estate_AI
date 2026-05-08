-- ============================================================
-- 005: warning 플래그 + 거래 메모 지원
-- - properties / agencies / transactions 에 warning boolean 추가
-- - memos 에 transaction_id 컬럼 추가
-- ============================================================

-- 1. warning 플래그
ALTER TABLE properties  ADD COLUMN IF NOT EXISTS warning BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agencies    ADD COLUMN IF NOT EXISTS warning BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS warning BOOLEAN NOT NULL DEFAULT false;

-- 2. 거래 메모 연결
ALTER TABLE memos
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id);

-- 3. 삭제 정책이 없을 경우 추가 (멱등)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'memos' AND policyname = 'delete_own_memo'
  ) THEN
    EXECUTE 'CREATE POLICY "delete_own_memo" ON memos
      FOR DELETE USING (auth.uid() = created_by)';
  END IF;
END $$;

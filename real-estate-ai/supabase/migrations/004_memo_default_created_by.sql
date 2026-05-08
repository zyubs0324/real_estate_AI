-- ============================================================
-- 004: memos.created_by 기본값 → auth.uid()
-- U3-11 fix — 클라이언트에서 별도 getUser() 없이 메모 저장 가능
-- ============================================================

ALTER TABLE memos
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 삭제 정책 추가 (본인 메모만 삭제 가능)
CREATE POLICY "delete_own_memo" ON memos
  FOR DELETE USING (auth.uid() = created_by);

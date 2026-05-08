-- ============================================================
-- Phase 4 — RAG 엔진용 match_documents RPC 함수
-- U4-1: 벡터 유사도 검색 (Supabase pgvector)
-- ============================================================

-- pgvector 익스텐션 (Phase 1에서 이미 활성화, 안전하게 재확인)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── match_documents ────────────────────────────────────────
-- 질문 임베딩(query_embedding)과 가장 유사한 문서 청크를 반환합니다.
-- similarity: 1 - cosine distance (0~1, 높을수록 유사)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  title       text,
  content     text,
  source      text,
  source_date date,
  similarity  float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id,
    title,
    content,
    source,
    source_date,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RLS: authenticated 사용자만 호출 가능
GRANT EXECUTE ON FUNCTION match_documents(vector, int) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 마이그레이션 완료: match_documents RPC';
END $$;

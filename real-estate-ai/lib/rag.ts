/**
 * RAG 엔진 — 유사 문서 검색 + 컨텍스트 조합
 * U4-1/U4-2
 */
import { createClient } from '@supabase/supabase-js'
import { embed } from '@/lib/github-ai'

// ─── 타입 ─────────────────────────────────────────────────
export interface DocumentChunk {
  id:          string
  title:       string
  content:     string
  source:      string | null
  source_date: string | null
  similarity:  number
}

// ─── Supabase 서버 클라이언트 ─────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return createClient(url, key)
}

// ─── 유사 문서 검색 ───────────────────────────────────────
export async function searchDocuments(
  question: string,
  limit = 5,
): Promise<DocumentChunk[]> {
  try {
    const embedding = await embed(question)
    const supabase  = getSupabase()

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_count:     limit,
    })

    if (error || !data) return []
    return data as DocumentChunk[]
  } catch {
    return []
  }
}

// ─── 컨텍스트 문자열 조합 ─────────────────────────────────
export function buildContext(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return ''
  return chunks
    .map((c, i) =>
      `[${i + 1}] ${c.source ?? c.title}\n${c.title}\n${c.content}`
    )
    .join('\n\n---\n\n')
}

// ─── 시스템 프롬프트 ─────────────────────────────────────
export function buildSystemPrompt(context: string): string {
  const base = `당신은 대한민국 공인중개사를 위한 부동산 법률·정책 전문 AI 어시스턴트입니다.
아래 참고 문서를 바탕으로 질문에 답변하세요. 참고 문서에 없는 내용은 추측하지 말고 "관련 법령을 직접 확인하시기 바랍니다"라고 안내하세요.
답변은 한국어로 명확하고 실무적으로 작성하고, 출처 조문을 반드시 언급하세요.

⚠️ 본 AI 답변은 법률 조언이 아니며 참고용입니다. 중요한 결정은 반드시 전문 법률가에게 확인하세요.`

  if (!context) return base
  return `${base}\n\n=== 참고 문서 ===\n${context}`
}

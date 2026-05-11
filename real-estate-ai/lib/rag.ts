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
export function buildSystemPrompt(context: string, webContext?: string): string {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const base = `당신은 대한민국 공인중개사를 위한 부동산 법률·정책 전문 AI 어시스턴트입니다.
오늘 날짜: ${today}

질문에 대해 실무적이고 구체적인 답변을 한국어로 제공하세요.
참고 문서가 제공된 경우 해당 조문을 우선 인용하고, 없는 경우에도 일반 법률 지식을 바탕으로 최대한 유용한 답변을 제공하세요.
답변은 핵심을 명확하게 전달하고, 관련 법령명(예: 주택임대차보호법 제3조)을 함께 언급하세요.

⚠️ 중요: 규제지역 지정·해제, 대출 한도 등 수시로 변경되는 정책 정보는 학습 데이터 기준이므로 실제와 다를 수 있습니다.
   최신 정보는 국토교통부(molit.go.kr) 또는 국가법령정보센터(law.go.kr)에서 반드시 확인하세요.`

  const parts = [base]
  if (webContext) parts.push(`=== 실시간 웹 검색 결과 ===\n${webContext}`)
  if (context)    parts.push(`=== 참고 법령 문서 ===\n${context}`)

  return parts.join('\n\n')
}

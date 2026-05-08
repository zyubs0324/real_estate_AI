#!/usr/bin/env tsx
/**
 * 법령 임베딩 파이프라인 CLI
 * U4-1: 법제처 OpenAPI → 텍스트 청크 → Cohere 임베딩 → Supabase documents 저장
 *
 * 실행:
 *   npx tsx scripts/embed_laws.ts
 *   npx tsx scripts/embed_laws.ts --keyword "주택임대차" --max 20
 *
 * 환경변수:
 *   GITHUB_TOKEN              — GitHub Models API 키
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase 서비스 롤 키
 *   LAW_API_KEY               — 법제처 API 키 (없으면 샘플 데이터 사용)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ─── 설정 ─────────────────────────────────────────────────
const CHUNK_SIZE    = 500   // 토큰 단위 청크 크기 (한국어 ~300자)
const CHUNK_OVERLAP = 50    // 청크 오버랩 (문맥 연속성)
const EMBED_MODEL   = 'Cohere-embed-v3-multilingual'
const BATCH_SIZE    = 10    // 한 번에 임베딩할 청크 수

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ai = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey:  process.env.GITHUB_TOKEN ?? '',
})

// ─── 타입 ─────────────────────────────────────────────────
interface LawChunk {
  title:       string
  content:     string
  source:      string
  source_date: string | null
}

// ─── 법제처 API 호출 ─────────────────────────────────────
async function fetchLawsFromApi(keyword: string, max: number): Promise<LawChunk[]> {
  const apiKey = process.env.LAW_API_KEY
  if (!apiKey) {
    console.warn('⚠️  LAW_API_KEY 미설정 — 샘플 데이터로 대체합니다.')
    return getSampleLaws()
  }

  const url = new URL('https://www.law.go.kr/DRF/lawSearch.do')
  url.searchParams.set('OC',      apiKey)
  url.searchParams.set('target',  'law')
  url.searchParams.set('type',    'JSON')
  url.searchParams.set('query',   keyword)
  url.searchParams.set('display', String(Math.min(max, 100)))

  const res  = await fetch(url.toString())
  const json = await res.json() as { LawSearch?: { law?: Array<{ 법령명한글: string; 법령ID: string }> } }
  const laws = json.LawSearch?.law ?? []

  const chunks: LawChunk[] = []
  for (const law of laws.slice(0, max)) {
    const detail = await fetchLawDetail(law['법령ID'], law['법령명한글'], apiKey)
    chunks.push(...detail)
    process.stdout.write('.')
  }
  console.log()
  return chunks
}

async function fetchLawDetail(lawId: string, lawName: string, apiKey: string): Promise<LawChunk[]> {
  try {
    const url = `https://www.law.go.kr/DRF/lawService.do?OC=${apiKey}&target=law&ID=${lawId}&type=JSON`
    const res  = await fetch(url)
    const json = await res.json() as { 법령?: { 조문?: { 조문단위?: Array<{ 조문제목?: string; 조문내용?: string }> } } }
    const articles = json.법령?.조문?.조문단위 ?? []

    return articles
      .filter((a) => a.조문내용)
      .map((a) => ({
        title:       `${lawName} ${a.조문제목 ?? ''}`.trim(),
        content:     a.조문내용!.replace(/<[^>]*>/g, '').trim(),
        source:      lawName,
        source_date: null,
      }))
      .filter((c) => c.content.length > 20)
  } catch {
    return []
  }
}

// ─── 샘플 데이터 (LAW_API_KEY 없을 때) ───────────────────
function getSampleLaws(): LawChunk[] {
  return [
    {
      title:       '주택임대차보호법 제3조 (대항력 등)',
      content:     '임차인(賃借人)은 주택의 인도(引渡)와 주민등록을 마친 때에는 그 다음 날부터 제삼자에 대하여 효력이 생긴다. 이 경우 전입신고를 한 때에 주민등록이 된 것으로 본다.',
      source:      '주택임대차보호법',
      source_date: '2023-07-18',
    },
    {
      title:       '주택임대차보호법 제8조 (보증금 중 일정액의 보호)',
      content:     '임차인(賃借人)은 보증금 중 일정액을 다른 담보물권자(擔保物權者)보다 우선하여 변제받을 권리가 있다. 이 경우 임차인은 주택에 대한 경매신청의 등기 전에 제3조제1항의 요건을 갖추어야 한다.',
      source:      '주택임대차보호법',
      source_date: '2023-07-18',
    },
    {
      title:       '부동산 거래신고 등에 관한 법률 제3조 (부동산 거래의 신고)',
      content:     '거래당사자는 다음 각 호의 어느 하나에 해당하는 계약을 체결한 경우 그 실제 거래가격 등을 거래계약의 체결일부터 30일 이내에 그 권리의 대상인 부동산 등의 소재지를 관할하는 시장·군수 또는 구청장에게 공동으로 신고하여야 한다.',
      source:      '부동산 거래신고법',
      source_date: '2024-02-13',
    },
    {
      title:       '공인중개사법 제25조 (중개대상물의 확인·설명)',
      content:     '개업공인중개사는 중개를 의뢰받은 경우에는 중개가 완성되기 전에 다음 각 호의 사항을 확인하여 이를 해당 중개대상물에 관한 권리를 취득하고자 하는 중개의뢰인에게 성실·정확하게 설명하고, 토지대장 등본 또는 부동산종합증명서, 등기사항증명서 등 설명의 근거자료를 제시하여야 한다.',
      source:      '공인중개사법',
      source_date: '2024-01-09',
    },
    {
      title:       '민법 제621조 (임대차의 등기)',
      content:     '부동산임차인은 당사자간에 반대약정이 없으면 임대인에 대하여 그 임대차등기절차에 협력할 것을 청구할 수 있다. 부동산임대차를 등기한 때에는 그때부터 제삼자에 대하여 효력이 생긴다.',
      source:      '민법',
      source_date: null,
    },
  ]
}

// ─── 텍스트 청킹 ─────────────────────────────────────────
function chunkText(chunk: LawChunk): LawChunk[] {
  const { content } = chunk
  if (content.length <= CHUNK_SIZE) return [chunk]

  const results: LawChunk[] = []
  let start = 0
  while (start < content.length) {
    const end     = Math.min(start + CHUNK_SIZE, content.length)
    const sliced  = content.slice(start, end)
    results.push({ ...chunk, content: sliced })
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return results
}

// ─── 임베딩 생성 ─────────────────────────────────────────
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await ai.embeddings.create({
    model:           EMBED_MODEL,
    input:           texts,
    encoding_format: 'float',
  } as Parameters<typeof ai.embeddings.create>[0])

  return (res.data as Array<{ embedding: number[] }>).map((d) => d.embedding)
}

// ─── Supabase 저장 ────────────────────────────────────────
async function upsertDocuments(chunks: LawChunk[], embeddings: number[][]): Promise<void> {
  const rows = chunks.map((c, i) => ({
    type:        'law' as const,
    title:       c.title,
    content:     c.content,
    source:      c.source,
    source_date: c.source_date,
    embedding:   JSON.stringify(embeddings[i]),
  }))

  const { error } = await supabase.from('documents').insert(rows)
  if (error) throw new Error(`Supabase insert error: ${error.message}`)
}

// ─── 메인 ────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2)
  const keyword = args.find((a, i) => args[i - 1] === '--keyword') ?? '주택임대차'
  const max     = Number(args.find((a, i) => args[i - 1] === '--max') ?? '10')

  console.log(`🔍 법령 수집 중 (키워드: "${keyword}", 최대 ${max}건)…`)

  const rawChunks = await fetchLawsFromApi(keyword, max)
  const chunks    = rawChunks.flatMap(chunkText)

  console.log(`📄 총 ${chunks.length}개 청크 임베딩 생성 중…`)

  const allEmbeddings: number[][] = []
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch  = chunks.slice(i, i + BATCH_SIZE)
    const embeds = await embedBatch(batch.map((c) => c.title + '\n' + c.content))
    allEmbeddings.push(...embeds)
    process.stdout.write(`  [${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}]\r`)
  }
  console.log()

  console.log(`💾 Supabase documents 테이블에 저장 중…`)
  await upsertDocuments(chunks, allEmbeddings)

  console.log(`✅ 완료: ${chunks.length}개 청크를 저장했습니다.`)
}

main().catch((e) => {
  console.error('❌ 오류:', e)
  process.exit(1)
})

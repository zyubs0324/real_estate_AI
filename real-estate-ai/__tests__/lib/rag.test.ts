/**
 * U4-1/U4-2 — RAG 엔진 테스트
 *
 * - searchDocuments: 질문을 임베딩 → Supabase match_documents RPC 호출 → 청크 반환
 * - buildContext: 청크 배열을 프롬프트 컨텍스트 문자열로 변환
 */

jest.mock('@/lib/github-ai', () => ({
  embed: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

// server-side client mock
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { embed } from '@/lib/github-ai'
import { searchDocuments, buildContext, type DocumentChunk } from '@/lib/rag'
import { createClient } from '@supabase/supabase-js'

const MOCK_EMBEDDING = Array(1024).fill(0.1)

const MOCK_CHUNKS: DocumentChunk[] = [
  {
    id:          'doc-1',
    title:       '주택임대차보호법 제3조',
    content:     '임차인은 주택의 인도와 주민등록을 마친 때에는 그 다음 날부터 제삼자에 대하여 효력이 생긴다.',
    source:      '주택임대차보호법',
    source_date: '2023-08-08',
    similarity:  0.92,
  },
  {
    id:          'doc-2',
    title:       '부동산 거래신고 등에 관한 법률 제3조',
    content:     '거래당사자는 부동산 거래계약을 체결한 경우 계약 체결일부터 30일 이내에 신고하여야 한다.',
    source:      '부동산 거래신고법',
    source_date: '2024-01-01',
    similarity:  0.87,
  },
]

describe('RAG — searchDocuments', () => {
  let rpcMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    ;(embed as jest.Mock).mockResolvedValue(MOCK_EMBEDDING)

    rpcMock = jest.fn().mockResolvedValue({ data: MOCK_CHUNKS, error: null })
    ;(createClient as jest.Mock).mockReturnValue({ rpc: rpcMock })
  })

  it('embed()를 호출해 질문을 벡터로 변환한다', async () => {
    await searchDocuments('대항력이란 무엇인가요?')
    expect(embed).toHaveBeenCalledWith('대항력이란 무엇인가요?')
  })

  it('match_documents RPC를 임베딩 벡터와 limit으로 호출한다', async () => {
    await searchDocuments('대항력이란 무엇인가요?', 5)
    expect(rpcMock).toHaveBeenCalledWith('match_documents', {
      query_embedding: MOCK_EMBEDDING,
      match_count:     5,
    })
  })

  it('RPC 결과를 DocumentChunk 배열로 반환한다', async () => {
    const result = await searchDocuments('대항력이란 무엇인가요?')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('주택임대차보호법 제3조')
    expect(result[0].similarity).toBe(0.92)
  })

  it('RPC 오류 시 빈 배열을 반환한다', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const result = await searchDocuments('질문')
    expect(result).toEqual([])
  })

  it('임베딩 실패 시 빈 배열을 반환한다', async () => {
    ;(embed as jest.Mock).mockRejectedValue(new Error('API error'))
    const result = await searchDocuments('질문')
    expect(result).toEqual([])
  })
})

describe('RAG — buildContext', () => {
  it('청크를 [출처] 내용 형식의 문자열로 조합한다', () => {
    const ctx = buildContext(MOCK_CHUNKS)
    expect(ctx).toContain('주택임대차보호법')
    expect(ctx).toContain('임차인')          // chunk[0] content
    expect(ctx).toContain('부동산 거래신고법')
    expect(ctx).toContain('30일 이내')       // chunk[1] content
  })

  it('청크가 없으면 빈 문자열을 반환한다', () => {
    expect(buildContext([])).toBe('')
  })
})

/**
 * GitHub Models AI 클라이언트
 * Base URL: https://models.inference.ai.azure.com
 * 환경변수: GITHUB_TOKEN
 *
 * 채팅: gpt-4o
 * 임베딩: Cohere-embed-v3-multilingual (1024차원)
 */
import OpenAI from 'openai'

const baseURL = 'https://models.inference.ai.azure.com'

// ─── Lazy 초기화 ────────────────────────────────────────
// 모듈 로드 시 바로 생성하면 테스트(JSDOM) 환경에서 fetch 부재로 throw.
// Proxy 패턴으로 실제 사용 시점에 생성.
let _client: OpenAI | undefined

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL,
      apiKey:                  process.env.GITHUB_TOKEN ?? '',
      dangerouslyAllowBrowser: true, // 서버 전용 코드지만 JSDOM 감지 우회
    })
  }
  return _client
}

export const ai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getClient(), prop)
  },
})

// 테스트에서 client를 교체할 수 있도록 노출
export function _setClientForTesting(client: OpenAI): void {
  _client = client
}

// ─── 임베딩 ──────────────────────────────────────────────
export async function embed(text: string): Promise<number[]> {
  const res = await ai.embeddings.create({
    model:           'Cohere-embed-v3-multilingual',
    input:           text,
    encoding_format: 'float',
  } as Parameters<typeof ai.embeddings.create>[0])

  return (res.data[0] as { embedding: number[] }).embedding
}

// ─── 진단 리포트 AI 종합 의견 (U4-3) ────────────────────────
export interface DiagnosisInput {
  address:            string
  riskItems:          Array<{ label: string; level: 'danger' | 'warning' | 'safe' }>
  buildingSummary?:   string
  regulationSummary?: string
}

export async function generateDiagnosisOpinion(
  input: DiagnosisInput,
): Promise<string | null> {
  const { address, riskItems, buildingSummary, regulationSummary } = input

  const riskLines = riskItems.length > 0
    ? riskItems.map((r) =>
        `- ${r.label} (${r.level === 'danger' ? '위험' : r.level === 'warning' ? '주의' : '안전'})`
      ).join('\n')
    : '- 특이사항 없음'

  const userContent = [
    `주소: ${address}`,
    '',
    '【위험 항목】',
    riskLines,
    buildingSummary   ? `\n【건물 정보】\n${buildingSummary}`   : '',
    regulationSummary ? `\n【규제 정보】\n${regulationSummary}` : '',
  ].filter(Boolean).join('\n')

  try {
    const res = await ai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role:    'system',
          content: `당신은 대한민국 공인중개사를 보조하는 부동산 진단 AI입니다.
주어진 매물 진단 결과를 바탕으로 실무적인 종합 의견을 한국어로 3~5문장 작성하세요.
위험 항목이 있으면 구체적인 주의사항을, 없으면 안전성을 설명하세요.
마지막에 "본 의견은 참고용이며 법적 효력이 없습니다." 문장을 추가하세요.`,
        },
        { role: 'user', content: userContent },
      ],
    })

    const opinion = res.choices[0]?.message?.content?.trim() ?? ''
    return opinion || null
  } catch {
    return null
  }
}

// ─── 스트리밍 채팅 ────────────────────────────────────────
export async function streamChat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<ReadableStream<Uint8Array>> {
  const stream = await ai.chat.completions.create({
    model:  'gpt-4o',
    stream: true,
    messages,
  })

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
          )
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

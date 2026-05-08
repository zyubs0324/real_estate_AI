/**
 * U4-3 — 진단 리포트 AI 종합 의견 생성 테스트
 *
 * - generateDiagnosisOpinion: QuickCheck 결과 + 각 섹션 요약 → gpt-4o → 한국어 의견
 * - 위험 항목이 없는 경우에도 긍정적 의견 생성
 * - AI API 실패 시 null 반환 (graceful degradation)
 */

import { ai, generateDiagnosisOpinion, type DiagnosisInput } from '@/lib/github-ai'

const BASE_INPUT: DiagnosisInput = {
  address:   '서울 강남구 역삼동 123',
  riskItems: [
    { label: '근저당권',    level: 'danger'  },
    { label: '조정대상지역', level: 'warning' },
  ],
  buildingSummary:   '철근콘크리트 / 12층 / 준공 2005년',
  regulationSummary: '조정대상지역 해당',
}

describe('generateDiagnosisOpinion', () => {
  let createSpy: jest.SpyInstance

  beforeEach(() => {
    createSpy = jest.spyOn(ai.chat.completions, 'create')
  })

  afterEach(() => {
    createSpy.mockRestore()
  })

  it('gpt-4o chat completion API를 호출한다', async () => {
    createSpy.mockResolvedValue({
      choices: [{ message: { content: '종합 의견 텍스트입니다.' } }],
    })
    await generateDiagnosisOpinion(BASE_INPUT)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' })
    )
  })

  it('주소와 위험 항목 정보를 프롬프트에 포함시킨다', async () => {
    createSpy.mockResolvedValue({
      choices: [{ message: { content: '의견' } }],
    })
    await generateDiagnosisOpinion(BASE_INPUT)
    const call    = createSpy.mock.calls[0][0]
    const userMsg = call.messages.find((m: { role: string }) => m.role === 'user').content as string
    expect(userMsg).toContain('서울 강남구 역삼동 123')
    expect(userMsg).toContain('근저당권')
    expect(userMsg).toContain('조정대상지역')
  })

  it('AI 응답 텍스트를 반환한다', async () => {
    createSpy.mockResolvedValue({
      choices: [{ message: { content: '이 매물은 근저당권 위험이 있습니다.' } }],
    })
    const result = await generateDiagnosisOpinion(BASE_INPUT)
    expect(result).toBe('이 매물은 근저당권 위험이 있습니다.')
  })

  it('위험 항목이 없어도 의견을 생성한다', async () => {
    createSpy.mockResolvedValue({
      choices: [{ message: { content: '특이사항이 없는 안전한 매물입니다.' } }],
    })
    const result = await generateDiagnosisOpinion({ ...BASE_INPUT, riskItems: [] })
    expect(result).toBe('특이사항이 없는 안전한 매물입니다.')
  })

  it('API 오류 시 null을 반환한다 (graceful degradation)', async () => {
    createSpy.mockRejectedValue(new Error('API 오류'))
    const result = await generateDiagnosisOpinion(BASE_INPUT)
    expect(result).toBeNull()
  })

  it('응답이 비어있으면 null을 반환한다', async () => {
    createSpy.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    })
    const result = await generateDiagnosisOpinion(BASE_INPUT)
    expect(result).toBeNull()
  })
})

import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import vm from 'vm'

// JSDOM 환경에 TextEncoder/TextDecoder 폴리필 (스트리밍 응답 테스트용)
Object.defineProperty(global, 'TextEncoder', { value: TextEncoder })
Object.defineProperty(global, 'TextDecoder', { value: TextDecoder })

// JSDOM은 scrollIntoView를 구현하지 않으므로 no-op mock 추가
Element.prototype.scrollIntoView = jest.fn()

// GitHub Models / OpenAI SDK: 테스트 환경에서 빈 API 키로 throw하지 않도록 더미 값 설정
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? 'test-github-token'

// OpenAI v6: JSDOM(jsdom 26)에는 fetch가 없음.
// Node.js 18+ 네이티브 fetch를 VM 컨텍스트에서 가져와 JSDOM global에 주입.
if (!globalThis.fetch) {
  try {
    const nodeFetch = vm.runInThisContext('globalThis.fetch')
    if (nodeFetch) {
      Object.defineProperty(globalThis, 'fetch', {
        value:        nodeFetch,
        writable:     true,
        configurable: true,
      })
    }
  } catch {
    // Node.js 18 미만 등 fetch가 없는 환경에서는 건너뜀
  }
}

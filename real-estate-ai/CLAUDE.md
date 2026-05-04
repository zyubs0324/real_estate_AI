@AGENTS.md

# 부동산 AI 어시스턴트 — Claude Code 지침

## ⚠️ UI 컴포넌트 작성 전 필수 확인

**모든 UI 코드를 작성하기 전에 반드시 `E:\real_estate_AI\docs\apple.md`를 참조하라.**

이 파일이 프로젝트의 **유일한 공식 디자인 시스템**이다. 아래는 가장 자주 어기는 핵심 규칙만 요약한 것이며, 전체 명세는 apple.md를 직접 읽어야 한다.

---

## 핵심 디자인 토큰 (apple.md 요약)

### 색상 — 절대 임의로 추가하지 말 것

| 용도 | 값 | apple.md 위치 |
|---|---|---|
| **유일한 인터랙티브 액센트** | `#0071e3` (Apple Blue) | §2, §11 |
| 페이지/카드 배경 | `#f5f5f7` (Light Gray) | §2, §12 |
| 기본 텍스트 | `#1d1d1f` (Near Black) | §2 |
| 성공·완료 | `#34c759` | §11 |
| 경고·집중관리 | `#ff9f0a` | §11 |
| 위험·오류 | `#ff3b30` | §11 |
| 비활성·중립 | `#636366` | §11 |

**금지**: 네이비(#1C3C71), 골드(#F0B000) 등 임의 색상. Apple Blue가 유일한 브랜드 액센트.

### 폰트

- **Pretendard Variable** (CDN: orioncactus/pretendard) — SF Pro 한국어 동등체
- Apple 기기에서는 `-apple-system` 폴백으로 SF Pro 자동 적용
- `word-break: keep-all` 필수

### 사이드바 (apple.md §12)

```css
background: rgba(0, 0, 0, 0.85);
backdrop-filter: saturate(180%) blur(20px);
width: 240px;  /* w-64(256px) 아님 */
border-right: 1px solid rgba(255, 255, 255, 0.08);
```

- 링크 기본: `color: rgba(255,255,255,0.65)` / `font-size: 14px`
- 활성: `background: rgba(255,255,255,0.12)` + **좌측 3px 흰색 선**
- 아이콘: **16px** (20px 아님)

### 페이지 헤더 (apple.md §12)

```css
background: rgba(245, 245, 247, 0.85);
backdrop-filter: saturate(180%) blur(20px);
border-bottom: 1px solid rgba(0, 0, 0, 0.08);
height: 56px;  position: sticky; top: 0; z-index: 50;
```

### 카드 (apple.md §14, §20)

```css
background: #ffffff;
border-radius: 12px;
box-shadow: rgba(0, 0, 0, 0.06) 0 1px 4px;
```

**금지**: 카드에 border 사용 (Apple은 border 거의 미사용)

### 버튼 (apple.md §4)

- Primary CTA: `background: #0071e3` / `border-radius: 8px` / `padding: 8px 15px`
- "Learn more" 링크: `border-radius: 980px` (pill)
- **금지**: 버튼에 상태 색상(green/red/orange) 사용

---

## CSS 클래스 규칙

`globals.css`에 정의된 클래스를 재사용하라. 새 CSS를 추가하기 전에 기존 클래스 확인:

| 클래스 | 용도 |
|---|---|
| `.sidebar` | 글래스모피즘 사이드바 컨테이너 |
| `.sidebar-link` | 사이드바 네비 링크 |
| `.sidebar-link.active` | 활성 링크 (좌측 흰색 선) |
| `.sidebar-section-label` | 섹션 레이블 (11px uppercase) |
| `.page-header` | 글래스모피즘 헤더 |
| `.main-content` | margin-left 240px + #f5f5f7 |
| `.dashboard-card` | 대시보드 카드 |
| `.data-list` | 데이터 리스트 컨테이너 |
| `.skeleton` | 로딩 스켈레톤 |
| `.spinner` | 로딩 스피너 |
| `.legal-notice` | 법적 고지 문구 |

---

## 컴포넌트 작성 체크리스트

새 UI 컴포넌트를 만들기 **전에** 다음을 확인하라:

- [ ] apple.md 해당 섹션을 읽었는가? (§번호를 코드 주석에 명시)
- [ ] 색상이 위 토큰 표에 있는 값인가? (임의 색상 추가 금지)
- [ ] 사이드바는 240px + 글래스모피즘인가?
- [ ] 카드에 border 대신 shadow를 사용했는가?
- [ ] 폰트는 Pretendard가 적용되는가?
- [ ] 인터랙티브 액센트가 Apple Blue(#0071e3)인가?

---

## 개발 규칙

- **Mock 우선**: `NEXT_PUBLIC_USE_MOCK_API=true` → `lib/apis/__mocks__/` 사용
- **소단위 TDD**: 각 Unit 완료 후 사용자 육안 확인 필수, 확인 전 다음 Unit 진행 금지
- **DEFERRED 패턴**: Phase 4 AI 기능은 주석 처리 후 `// [DEFERRED] Phase 4` 표시
- **DB**: Supabase + pgvector, 마이그레이션은 `supabase/migrations/` 폴더
- **AI**: GitHub Models (`gpt-4o`, `Cohere-embed-v3-multilingual`) — `lib/github-ai.ts`

---

## 참조 문서

- 디자인 시스템: `E:\real_estate_AI\docs\apple.md`
- 서비스 개요: `E:\real_estate_AI\docs\01_서비스개요.md`
- 진단 리포트: `E:\real_estate_AI\docs\02_기능1_주소기반진단리포트.md`
- API 목록: `E:\real_estate_AI\docs\04_데이터소스목록.md`
- DB 스키마: `E:\real_estate_AI\docs\05_기술스택.md`
- 개발 로드맵: `E:\real_estate_AI\docs\06_개발로드맵.md`

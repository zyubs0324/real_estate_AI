# 부동산 AI CRM 고도화 인수인계 작업 계획

작성일: 2026-05-18  
대상 프로젝트: `E:\real_estate_AI\real-estate-ai`  
임포트 파일: `E:\real_estate_AI\매물정보_export.csv`  
SQL 적용 원칙: 모든 마이그레이션은 사용자가 Supabase SQL Editor에서 직접 실행한다. 코드 작성자는 SQL 파일 작성 후 실행 요청 단계에서 멈춘다.  
목적: 인물DB, 매물DB, 부동산DB, 공동 중개, 사진 업로드, CSV 임포트 고도화를 다른 AI가 중간에 이어받아도 흐름이 끊기지 않도록 세부 작업 단위로 정리한다.

## 병렬 작업 분담 원칙

이 문서는 Codex와 Claude가 시간 관계상 동시에 작업할 때 충돌을 줄이기 위한 소유 범위를 포함한다. 두 AI는 같은 파일을 동시에 수정하지 않는 것을 원칙으로 한다. 파일 소유 범위가 겹치는 경우, 먼저 작업 중인 AI가 변경을 완료하고 테스트 결과를 남긴 뒤 다른 AI가 이어받는다.

### 분담 요약

| 영역 | Codex 담당 | Claude 담당 |
|---|---|---|
| DB/SQL | 010/011 마이그레이션 초안 작성, SQL 실행 요청 문구 정리 | 기존 007/008/009 SQL 점검, SQL 적용 순서 검토 |
| 데이터 파서/임포트 | CSV 소유자/연락처/공동소유/공동중개 파서 및 import 스크립트 | 파서 테스트 리뷰, dry-run 결과 검토 |
| Supabase CRUD | 공동중개, lookup, 사진 CRUD 신규 파일 | 기존 CRUD 타입/함수 보강 리뷰 |
| 사진 업로드 | 이미지 압축/썸네일/Storage helper/업로더 컴포넌트 | UI 통합 전 검토 |
| 매물 UI | 공동중개, 공동소유, 사진 UI 통합 | 매물 화면 기존 검색/수정/삭제 흐름 유지 검토 |
| 인물 UI | 소유/공동소유/핸들링 목록과 역할 표시 개선 | 인물 폼/리스트 회귀 검토 |
| 부동산 UI | 대표 상태/태그/카운트/필터 개선 | 용어 변경과 기존 테스트 보강 |
| 검증 | `npm test`, `npm run build`, 주요 수동 검증 | 테스트 실패 분석 및 회귀 검토 |

### 파일 소유권

Codex가 우선 수정한다:

- `docs/crm_enhancement_handoff_plan.md`
- `supabase/migrations/010_property_agencies.sql`
- `supabase/migrations/011_lookup_and_storage.sql`
- `lib/property/csvImportProfile.ts`
- `scripts/import_properties.ts`
- `lib/supabase/propertyAgencies.ts`
- `lib/supabase/lookupCodes.ts`
- `lib/supabase/propertyPhotos.ts`
- `lib/images/propertyPhotoProcessor.ts`
- `components/properties/PropertyPhotoUploader.tsx`
- `__tests__/lib/csvImportProfile.test.ts`
- `__tests__/lib/supabaseCrudExtensions.test.ts`

Claude가 우선 수정한다:

- `supabase/migrations/007_report_history.sql`
- `supabase/migrations/008_property_extended.sql`
- `supabase/migrations/009_search_functions.sql`
- `lib/supabase/agencies.ts`
- `lib/supabase/people.ts`
- `lib/supabase/properties.ts`
- `app/(app)/properties/page.tsx`
- `app/(app)/people/page.tsx`
- `app/(app)/people/[id]/page.tsx`
- `app/(app)/agencies/page.tsx`
- `app/(app)/agencies/[id]/page.tsx`
- `__tests__/app/properties.test.tsx`
- `__tests__/app/people.test.tsx`
- `__tests__/app/agencies.test.tsx`

공동 소유 파일이다. 한쪽이 수정 중이면 다른 쪽은 먼저 상태를 확인하고 이어받는다:

- `lib/supabase/properties.ts`
- `lib/supabase/people.ts`
- `lib/supabase/agencies.ts`
- `app/(app)/properties/page.tsx`
- `app/(app)/people/page.tsx`
- `app/(app)/agencies/page.tsx`
- `package.json`
- `package-lock.json`

### 충돌 방지 규칙

1. 작업 시작 전 항상 `git status --short`를 확인한다.
2. 같은 파일을 수정해야 하면 먼저 현재 파일 내용을 읽고, 사용자 또는 다른 AI 변경분을 되돌리지 않는다.
3. SQL 실행이 필요한 단계에서는 파일만 작성하고 사용자에게 Supabase SQL Editor 실행을 요청한 뒤 멈춘다.
4. 실제 CSV import는 dry-run 결과를 사용자에게 보고하고 승인받기 전 실행하지 않는다.
5. `package.json` 의존성 추가는 반드시 사전에 필요성을 명시한다. CSV는 기본적으로 `xlsx`를 쓰지 않고 CSV 기반으로 처리한다.
6. 한 Phase가 끝나면 이 문서의 인수인계 메모 양식에 맞춰 완료 범위, 테스트 결과, 남은 작업을 남긴다.
7. Claude 작업 범위에 포함된 UI 파일을 Codex가 수정해야 하는 경우, 새 컴포넌트/새 helper를 먼저 만들고 최종 통합 지점만 최소 수정한다.
8. Codex 작업 범위의 신규 helper를 Claude가 사용할 경우, 함수 시그니처를 변경하지 말고 필요한 변경은 별도 메모로 남긴다.

## 0. 핵심 용어와 확정된 결정

### 0.1 용어

- `부동산`: 기존 UI의 `타부동산`을 대체하는 용어. DB 테이블명 `agencies`는 유지한다.
- `우리 사무소`: 현재는 `한자리`, `더힐`. 나중에 추가될 수 있다.
- `핸들링`: 해당 매물 거래를 누가 리드했는가. 개인 또는 부동산이 될 수 있다.
- `공동 중개`: 우리와 함께 거래에 참여한 부동산. 핸들링과 다른 개념이다.
- `소유자`: 매물의 소유자. 개인 또는 법인일 수 있다.
- `공동소유`: 한 매물에 소유자가 여러 명인 경우.
- `대표 역할`: `people.role`에 저장하는 사용자 직접입력/메모성 역할.
- `관계 역할`: `relations.role`에 저장하는 매물별 실제 역할. 예: 매도인, 임대인.

### 0.2 우리 사무소 판단

- `agencies.alias`가 `한자리` 또는 `더힐`이면 우리 사무소로 판단한다.
- 나중에 우리 사무소가 추가될 수 있으므로 코드에서는 하드코딩을 최소화하고, 가능하면 `is_our_office` 또는 alias lookup을 함께 사용한다.

### 0.3 핸들링과 공동 중개 규칙

| 원본 `핸들링` 값 | 처리 |
|---|---|
| `한자리` | `handling_agency_id` 설정, 공동 중개 없음 |
| `더힐` | `handling_agency_id` 설정, 공동 중개 없음 |
| 개인명/호칭 | `handling_person_id` 설정, 공동 중개 없음 |
| 우리 사무소가 아닌 부동산 | `handling_agency_id` 설정 + 같은 부동산을 공동 중개로 자동 연결 |
| `전속` | 핸들링은 `한자리`, `is_exclusive = true`, 공동 중개 없음 |
| `전략매물` | 핸들링은 `한자리`, `is_strategic = true`, 공동 중개 없음 |

주의:

- 핸들링이 `한자리`, `더힐`, 개인이라고 해서 실제 공동 중개가 없다는 뜻은 아니다.
- 현재 CSV만으로는 이 경우 공동 중개 부동산을 유추할 수 없으므로 초기값을 없음으로 둔다.
- 매물 수정 UI에서 공동 중개 부동산을 나중에 추가/삭제할 수 있어야 한다.
- 핸들링이 우리 사무소가 아닌 부동산이면 100% 공동 중개로 간주한다.

### 0.4 역할 규칙

- `people.role`은 유지한다.
- `people.role`은 실제 매물별 역할이 아니라 사용자가 직접 수정 가능한 대표/메모성 역할이다.
- 실제 매물별 역할은 `relations(person_id, property_id, role)` 기준으로 저장한다.
- 역할 후보 기본값:
  - `없음`
  - `매도인`
  - `매수인`
  - `임차인`
  - `임대인`
  - `복합`
- 사용자가 직접 입력할 수 있어야 한다.
- 직접 입력한 역할은 `lookup_codes.category = 'person_role'`에 저장해서 다음부터 후보로 노출한다.
- `워크인`, `소개자`, `대리인` 같은 값이 나중에 추가될 수 있다.

### 0.5 별칭 규칙

인물, 매물, 부동산 모두 별칭이 필요하다.

- 인물: `곽소장`, `부녀회장`, `내어회장` 같은 실무 호칭
- 매물: `극동`, `그린`, `금호대우` 같은 줄임말
- 부동산: `한자리`, `더힐`, `경희` 같은 사무소 줄임말

검색에는 별칭을 반드시 포함한다.

### 0.6 공동소유 규칙

- 소유자가 여러 명이면 `co_ownership`에 모든 소유자를 연결한다.
- 공동소유자는 이름으로도, 전화번호로도, 매물 필터로도 검색되어야 한다.
- 공동소유 지분율은 각 `co_ownership` 행에 `%` 문자열로 저장한다.
- 예:
  - 2명: 각 `50%`
  - 3명: 각 `33.33%`
  - 4명: 각 `25%`
- 나중에 사용자가 지분율을 수정할 수 있어야 한다.
- 이 지분율은 향후 계약금, 매매대금, 중개수수료 분담 계산에 활용될 수 있다.

### 0.7 사진 업로드 규칙

- Storage bucket 이름: `property-photos`
- bucket 접근: 비공개 bucket
- 접근 방식: signed URL
- signed URL 만료: 1시간
- Storage RLS: `authenticated` 사용자 전체 허용
- 업로드 가능 파일:
  - JPG
  - PNG
  - WebP
- 제한:
  - 파일당 10MB 이하
  - 매물당 최대 30장
- 사진 업로드 UI에 제한사항을 반드시 표시한다.
- 업로드는 매물 저장 후에만 가능하게 한다.
- 원본 그대로 저장하지 않는다.
- 1차 구현부터 WebP 압축 + 썸네일 생성을 한다.
- 본문용 이미지:
  - 긴 변 최대 1600px
  - WebP quality 0.82
- 썸네일:
  - 긴 변 최대 360px
  - WebP quality 0.75
- DB에는 signed URL을 저장하지 않는다. `path`, `thumbnail_path` 등 메타데이터만 저장한다.

사진 메타데이터 구조:

```json
[
  {
    "path": "properties/{propertyId}/photo-{uuid}.webp",
    "thumbnail_path": "properties/{propertyId}/thumb-{uuid}.webp",
    "caption": "",
    "sort_order": 0,
    "source": "upload",
    "original_filename": "IMG_0012.jpg",
    "original_size": 8450000,
    "compressed_size": 620000,
    "width": 1600,
    "height": 1200,
    "content_type": "image/webp",
    "uploaded_by": "user-uuid",
    "uploaded_at": "2026-05-18T00:00:00.000Z"
  }
]
```

## 2026-05-21 추가 진행: 중복 의심 매물 필터

목적: CSV 원본의 자유 입력 주소 때문에 같은 매물이 여러 건으로 보이는 경우를 사용자가 직접 정리할 수 있도록, `/properties` 화면에서 중복 의심 후보만 빠르게 좁혀 보는 기능을 추가했다.

구현 파일:

- `lib/property/propertyDuplicate.ts`
- `__tests__/lib/propertyDuplicate.test.ts`
- `app/(app)/properties/page.tsx`
- `__tests__/app/properties.test.tsx`

구현 내용:

- 주소, 건물명, 별칭, 호수를 조합해 실무형 중복 후보 키를 만든다.
- `맨션`과 `맨숀`처럼 흔한 표기 차이는 같은 값으로 본다.
- 마지막 숫자 묶음을 호수 후보로 사용해 `성아맨션 1 1112 1 1112`, `성아맨션 1 1112호`, `성아맨숀 1112` 같은 입력을 같은 후보로 묶는다.
- `/properties` 툴바에 `중복 의심 N` 버튼을 추가했다.
- 이 버튼은 자동 병합이나 자동 삭제를 하지 않고, 후보 필터만 적용한다.
- `duplicateOnly=1` URL 파라미터로 중복 후보 필터를 바로 열 수 있다.
- 대량 삭제 확인 문구에는 현재 필터 요약이 함께 표시되어 실수 삭제를 줄인다.

주의사항:

- 이 기능은 보수적인 “정리 보조 필터”다. 실제 동일 매물 여부는 사용자가 판단한다.
- 향후 더 정교한 정규화가 필요하면 건물 alias lookup, 법정동/도로명 주소 매핑, 동/호수 전용 파서를 추가한다.
- 자동 병합은 아직 구현하지 않는다.

추가 검증:

- `__tests__/app/properties.test.tsx`에서 버튼 클릭 시 `duplicateOnly=1` 파라미터가 생기는지 확인한다.
- `__tests__/app/properties.test.tsx`에서 `/properties?duplicateOnly=1` 진입 시 필터가 켜지는지 확인한다.
- `e2e/crm-data.smoke.spec.ts`에서 실제 브라우저로 `/properties?duplicateOnly=1` 진입 후 버튼이 pressed 상태인지 확인한다.

## 2026-05-22 추가 진행: 매물 목록 필터 URL 유지

목적: 매물 정리 작업 중 새로고침, 공유, 뒤로가기 흐름에서 필터 상태가 사라지지 않게 한다.

구현 내용:

- `/properties?tab=exclusive` 형식으로 탭 필터를 초기화한다.
- `/properties?dealType=매매` 형식으로 거래유형 필터를 초기화한다.
- `/properties?q=검색어` 형식으로 검색어 필터를 초기화한다.
- 사용자가 탭, 거래유형, 검색어를 바꾸면 URL 파라미터를 즉시 갱신한다.
- 필터가 바뀌면 기존 선택 항목을 비워 숨은 항목까지 함께 삭제되는 사고를 막는다.

검증:

- `__tests__/app/properties.test.tsx`에서 URL의 `tab`, `dealType`, `q`가 초기 상태로 반영되는지 확인한다.
- `__tests__/app/properties.test.tsx`에서 검색어 입력 시 `q` 파라미터가 갱신되는지 확인한다.
- `e2e/crm-data.smoke.spec.ts`에서 `/properties?q=Needle` 진입 시 검색 입력값이 유지되는지 확인한다.

## 남은 단계 요약

URL 매물 등록은 사용자가 육안 테스트를 나중에 진행하기로 했으므로 임시 보류한다.

남은 작업:

1. 외부 매물 URL 파싱 재설계 및 플랫폼별 실제 샘플 검증
2. 사진 업로드 실제 Storage 파일 업로드/삭제 육안 검증
3. Google Sheets 동기화 환경변수 연결 후 실제 시트 동기화 검증
4. 매물 중복 정리 고도화: 건물 alias lookup, 동/호수 파서, 후보 그룹 표시
5. 실무자 최종 테스트 전 DB 초기화 및 CSV/Sheet 재임포트 절차 정리
6. Next.js `middleware` 파일을 `proxy` 규칙으로 이전하는 빌드 경고 정리

## 2026-05-22 추가 진행: 매물 리스트 CSV 간략보기 UI

사용자 결정: 매물 리스트는 빽빽하더라도 실무에서 쓰던 `매물정보_export.csv`/Google Sheets 간략보기와 같은 컬럼 구조로 보여준다. 가로 스크롤을 허용하고, 컬럼을 생략하지 않는다.

리스트 컬럼 순서:

`등록일 | 핸들링 | 대표주소 | 카테고리 | 별칭 | 동 | 호수 | 랜덤광고 | 종류 | 가격 | 면적 | 소유자 | 연락처 | 통신사 | 한자리 | 더힐 | 입주시기 | 방향 | 관리비 | 기타사항`

구현 내용:

- `/properties` 테이블을 CSV 간략보기 순서의 조밀 테이블로 변경했다.
- 테이블에 `minWidth`를 두고 리스트 카드에서 가로 스크롤되도록 했다.
- 목록 조회 `LIST_SELECT`에 `ad_level`, `price_*`, `area_*`, `move_in_date`, `direction`, `maintenance_fee`, `notes`, `hanjari_date`, `deohill_date`를 포함했다.
- `co_ownership -> people` 중첩 조회를 추가해 리스트에서 소유자, 연락처, 통신사를 표시한다.
- 긴 값은 한 줄 말줄임 처리하고 `title`에 전체 값을 둔다.
- 기존 상세 패널 클릭 흐름과 선택/일괄삭제 흐름은 유지한다.

검증:

- `__tests__/app/properties.test.tsx`에 CSV 컬럼 헤더 순서와 소유자/연락처/통신사 표시 테스트를 추가했다.
- `npx playwright test e2e/crm-data.smoke.spec.ts --reporter=list`로 실제 임포트 데이터 조회가 깨지지 않는지 확인한다.

## 2026-05-22 추가 진행: 리스트 그리드 컨테이너 공통 적용

목적: 매물 화면에서 적용한 내부 스크롤 리스트 경험을 인물, 거래, 부동산, 일정 화면에도 맞춰 CRM 목록 사용성을 통일한다.

구현 내용:

- `/people` 테이블에 내부 스크롤 컨테이너를 추가했다.
- `/transactions` 테이블에 내부 스크롤 컨테이너를 추가했다.
- `/agencies` 카드 리스트에 내부 세로 스크롤 컨테이너를 추가했다.
- `/schedules` 카드 리스트에 내부 세로 스크롤 컨테이너를 추가했다.
- 인물/거래 테이블 헤더는 리스트 컨테이너 상단에 sticky로 고정된다.
- 선택 체크박스 첫 열은 좌측 sticky로 유지해 긴 목록에서도 선택 흐름을 유지한다.

검증:

- `npm test -- --runInBand __tests__/app/schedules.test.tsx __tests__/app/people.test.tsx __tests__/app/transactions.test.tsx __tests__/app/agencies.test.tsx`
- `npm run build`
- `npx playwright test e2e/crm.smoke.spec.ts --reporter=list`

## 2026-05-22 추가 진행: Next.js proxy 이전

목적: Next.js 16 빌드에서 반복 표시되던 `middleware` 파일 convention deprecated 경고를 제거한다.

구현 내용:

- 기존 `middleware.ts`의 Supabase 세션 갱신 및 보호 라우트 로직을 `proxy.ts`로 이전했다.
- exported function 이름을 `middleware`에서 `proxy`로 변경했다.
- 기존 `middleware.ts`는 제거했다.
- `/login`, `/auth`, `/api` 공개 경로와 보호 라우트 redirect 정책은 유지했다.

검증:

- `npm run build`에서 `middleware` deprecation 경고가 사라짐.
- `npx playwright test e2e/login.smoke.spec.ts e2e/auth.smoke.spec.ts e2e/crm.smoke.spec.ts --reporter=list`
- `npm test -- --runInBand`

## 2026-05-20 추가 인수인계 메모 - 일괄 삭제 UI

### 완료 내용
- `/properties`, `/people`, `/transactions`, `/schedules`, `/agencies` 목록에 선택 체크박스를 추가했다.
- 선택된 항목이 있을 때 `선택 N개 삭제`와 `선택 해제` 액션을 표시한다.
- 삭제 실행 전 `ConfirmDialog`로 확인을 받고, 확인 시 기존 단건 삭제 함수를 항목별로 호출한다.
- 실제 DB를 삭제하지 않는 단위 테스트로 5개 화면의 일괄 삭제 확인 흐름을 검증했다.
- 체크박스 열 추가로 인물 E2E의 소유매물 카운트 열 인덱스가 바뀌어 `e2e/crm-data.smoke.spec.ts`를 갱신했다.

### 수정 파일
- `app/(app)/properties/page.tsx`
- `app/(app)/people/page.tsx`
- `app/(app)/transactions/page.tsx`
- `app/(app)/schedules/page.tsx`
- `app/(app)/agencies/page.tsx`
- `__tests__/app/properties.test.tsx`
- `__tests__/app/people.test.tsx`
- `__tests__/app/transactions.test.tsx`
- `__tests__/app/schedules.test.tsx`
- `__tests__/app/agencies.test.tsx`
- `e2e/crm-data.smoke.spec.ts`

### 검증 결과
- `npm test -- --runInBand`: 48 suites, 316 tests passed
- `npm run build`: passed
- `npx playwright test --reporter=list`: 11 passed

### 주의사항
- E2E는 실제 DB 삭제를 수행하지 않는다. 일괄 삭제는 Jest mock 기반으로만 검증했다.
- 기존 5개 화면 테스트 파일은 인코딩 깨짐을 피하기 위해 ASCII 중심의 일괄 삭제 회귀 테스트로 정리했다.

## 2026-05-21 추가 인수인계 메모 - 매물 등록일 기준 정정

### 완료 내용
- `매물정보_export.csv`에서 가져온 매물의 등록일은 CSV 첫 컬럼 `f`를 의미한다.
- import 경로는 이미 `f -> registered_date`로 저장하고 있었고, 매물 목록 표시만 `created_at`을 쓰고 있었다.
- `/properties` 목록의 `등록일` 표시를 `registered_date` 우선, 값이 없을 때만 `created_at` fallback으로 변경했다.
- `lib/supabase/properties.ts`의 `PropertyRow`, `SavePropertyPayload`, `LIST_SELECT`에 `registered_date`를 명시했다.

### 검증 결과
- `npm test -- --runInBand __tests__/app/properties.test.tsx __tests__/lib/supabaseCrudExtensions.test.ts __tests__/lib/sheetsSync.test.ts`: 3 suites, 11 tests passed
- `npm run build`: passed

## 2026-05-21 추가 인수인계 메모 - 등록일 표기 정규화

### 결정 사항
- 매물 등록일은 `yyyy. m. d.` 형식으로 통일한다.
- 연도 없이 들어온 `2/1`, `1/30` 같은 값은 2026년 기준으로 해석한다.
  - `2/1` -> `2026. 2. 1.`
  - `1/30` -> `2026. 1. 30.`
- 알 수 없는 문자열은 임의 추정하지 않고 원문을 유지한다.

### 완료 내용
- `lib/property/dateNormalizer.ts` 추가: 등록일 정규화 공통 함수.
- CSV import의 `f` 컬럼, Google Sheets sync의 등록일 컬럼, `/properties` 목록 표시가 모두 같은 정규화 함수를 사용한다.
- 현재 Supabase `properties.registered_date` 기존 데이터 641건을 정규화했다.
- 정규화 후 dry-run 재확인 결과 남은 대상 0건.

### 검증 결과
- `npm test -- --runInBand __tests__/lib/dateNormalizer.test.ts __tests__/app/properties.test.tsx __tests__/lib/sheetsSync.test.ts __tests__/lib/csvImportProfile.test.ts`: 4 suites, 17 tests passed
- `npx tsx scripts/normalize_registered_dates.ts --execute`: updated 641 properties
- `npx tsx scripts/normalize_registered_dates.ts`: rows to normalize 0
- `npm run build`: passed

## 2026-05-21 추가 인수인계 메모 - 매물 등록일 기간 필터

### 완료 내용
- `/properties` toolbar에 등록일 시작/종료 date input을 추가했다.
- 필터 기준은 `properties.registered_date`이며, `2/1`, `2026. 2. 1.`, `2026-02-01` 모두 같은 날짜로 비교된다.
- 등록일 기간 필터가 적용된 상태에서 `select-all-properties`는 현재 필터 결과만 선택한다.
- 따라서 특정 기간 매물을 필터링한 뒤 일괄 삭제할 수 있다.

### 수정 파일
- `lib/property/dateNormalizer.ts`
- `app/(app)/properties/page.tsx`
- `__tests__/lib/dateNormalizer.test.ts`
- `__tests__/app/properties.test.tsx`

### 검증 결과
- `npm test -- --runInBand __tests__/lib/dateNormalizer.test.ts __tests__/app/properties.test.tsx`: 2 suites, 7 tests passed
- `npm test -- --runInBand`: 49 suites, 322 tests passed
- `npm run build`: passed
- `npx playwright test --reporter=list`: 11 passed

## 2026-05-21 추가 인수인계 메모 - 등록일 빠른 필터 및 URL 유지

### 완료 내용
- `/properties` 등록일 기간 필터에 `이번 달`, `지난 달`, `기간 해제` 버튼을 추가했다.
- 등록일 기간 변경 시 `registeredDateFrom`, `registeredDateTo` URL 파라미터를 갱신한다.
- URL 파라미터가 있는 상태로 `/properties`에 진입하면 해당 기간 필터가 자동 적용된다.
- 기간 필터를 바꿀 때 기존 선택 항목을 비워, 숨은 선택 항목까지 같이 삭제되는 사고를 막았다.
- `registeredDateInputValue()`를 추가해 `2/1`, `2026. 2. 1.` 같은 실무 날짜를 `<input type="date">` 값으로 안정 변환한다.

### 수정 파일
- `lib/property/dateNormalizer.ts`
- `app/(app)/properties/page.tsx`
- `__tests__/lib/dateNormalizer.test.ts`
- `__tests__/app/properties.test.tsx`

### 검증 결과
- `npm test -- --runInBand __tests__/lib/dateNormalizer.test.ts __tests__/app/properties.test.tsx`: 2 suites, 9 tests passed
- `npm test -- --runInBand`: 49 suites, 324 tests passed
- `npm run build`: passed
- `npx playwright test --reporter=list`: 11 passed

## 2026-05-21 추가 인수인계 메모 - 필터 삭제 안전장치

### 완료 내용
- `/properties`에 활성 필터 요약을 추가했다.
  - 예: `필터 결과 1건 · 등록일 2026. 2. 1. ~ 2026. 2. 28.`
- 일괄 삭제 확인 다이얼로그 설명에 현재 필터 조건을 함께 표시한다.
- 탭, 거래유형, 검색어, 등록일 기간이 바뀌면 기존 선택 항목을 자동 해제한다.
  - 필터 변경 후 화면에서 사라진 항목이 선택 상태로 남아 같이 삭제되는 사고를 방지하기 위한 조치다.

### 수정 파일
- `app/(app)/properties/page.tsx`
- `__tests__/app/properties.test.tsx`

### 검증 결과
- `npm test -- --runInBand __tests__/app/properties.test.tsx __tests__/lib/dateNormalizer.test.ts`: 2 suites, 9 tests passed
- `npm test -- --runInBand`: 49 suites, 324 tests passed
- `npm run build`: passed
- `npx playwright test --reporter=list`: 11 passed

## 15. 2026-05-20 Codex 진행 메모

### 완료한 추가 작업
- 리포트 생성 후 `report_history` 자동 저장을 연결했다.
- `/report` 화면에 최근 리포트 이력 목록을 표시하고, 이력 클릭 시 저장된 리포트 데이터를 재표시하도록 했다.
- Playwright E2E 기반을 추가했다.
- Jest가 Playwright E2E 파일을 실행하지 않도록 `jest.config.ts`에서 `e2e` 폴더를 제외했다.
- 개발/E2E 전용 인증 우회를 `middleware.ts`에 추가했다. 조건은 `NODE_ENV !== 'production'` 이면서 `PLAYWRIGHT_E2E=1` 또는 요청 헤더 `x-playwright-e2e: 1`인 경우에만 동작한다.

### 추가/수정 파일
- `app/(app)/report/page.tsx`
- `__tests__/app/report.test.tsx`
- `middleware.ts`
- `playwright.config.ts`
- `e2e/login.smoke.spec.ts`
- `e2e/crm.smoke.spec.ts`
- `jest.config.ts`
- `package.json`
- `package-lock.json`

### 검증 결과
- `npm test -- --runInBand`: 48 suites, 343 tests passed
- `npm run build`: 성공
- `npx playwright test --reporter=list`: 11 tests passed

### E2E 주의사항
- 현재 Playwright는 기존 `localhost:3000` dev server를 재사용한다.
- 보호 화면 E2E는 실제 Supabase 개발 계정 세션을 사용한다.
- `app/api/dev/e2e-login/route.ts`는 `NODE_ENV === 'production'`에서는 403을 반환한다.
- 기본 계정은 개발 setup 라우트와 동일하게 `zyubs0324@gmail.com` / `RealEstate2026!`를 사용한다. 필요하면 `E2E_EMAIL`, `E2E_PASSWORD` 환경변수로 덮어쓴다.
- 로그인 폼 직접 입력/클릭 E2E도 통과한다.
- 보호 화면 반복 검증은 속도와 안정성을 위해 개발 전용 API가 Supabase `signInWithPassword`를 호출하고 쿠키를 설정하는 방식으로 수행한다.
- Playwright는 `localhost:3000`을 기준으로 실행한다. `127.0.0.1`로 실행하면 Next dev resource origin 차이로 hydration/HMR 문제가 날 수 있어 `next.config.ts`에 `allowedDevOrigins: ['127.0.0.1']`도 추가했다.
- 인물 리스트 소유매물/핸들링 카운트는 ID를 200개씩 나눠 조회한다. 대량 인물 데이터에서 Supabase `.in()` 조건이 길어져 카운트가 0으로 표시되던 문제를 방지하기 위한 처리다.
- 인물 리스트의 소유매물 카운트는 `road_address + building_dong + unit_number` 기준으로 중복 제거한다. 같은 주소/동/호수인데 거래유형만 다른 등록 매물은 실물 소유 단위로는 1개로 본다.
- 인물 상세 화면에는 `소유 매물` 섹션을 추가했다. 실물 단위로 묶어 표시하고, 그 아래에 거래유형별 등록 건(예: 전세/반월세)을 나열한다.
- `e2e/crm-data.smoke.spec.ts`에서 실제 임포트 데이터 렌더링, 인물 소유매물 카운트, 부동산 핸들링/공동 중개 카운트를 확인한다.
- 인물 소유매물 카운트와 부동산 공동 중개 카운트를 클릭하면 `/properties`의 URL 파라미터 필터 화면으로 이동하는 E2E도 추가했다.

### 0.8 부동산 태그 규칙

부동산에는 한눈에 볼 수 있는 대표 상태와 복수 태그가 필요하다.

대표 상태 기본 후보:

- `신뢰`
- `일반`
- `주의`

대표 상태는 사용자가 추가할 수 있어야 한다. 후보는 `lookup_codes.category = 'agency_trust_level'`로 관리한다.

복수 태그도 1차에 구현한다. 후보 예시:

- `협조적`
- `응답느림`
- `광고강함`
- `가격협상주의`
- `분쟁주의`
- `자료정확`
- `연락주의`

복수 태그도 사용자가 추가할 수 있어야 한다. 후보는 `lookup_codes.category = 'agency_tag'`로 관리한다.

## 1. 현재 코드에서 이미 확인된 구현 흔적

아래 파일들은 이미 존재하거나 일부 구현되어 있다. 이어받는 AI는 먼저 최신 내용을 다시 읽고, 중복 구현을 피해야 한다.

- `supabase/migrations/007_report_history.sql`
- `supabase/migrations/008_property_extended.sql`
- `supabase/migrations/009_search_functions.sql`
- `lib/property/csvImportProfile.ts`
- `lib/property/priceParser.ts`
- `lib/property/areaParser.ts`
- `lib/property/carrierParser.ts`
- `lib/property/categoryMapper.ts`
- `scripts/import_properties.ts`
- `lib/supabase/properties.ts`
- `lib/supabase/people.ts`
- `lib/supabase/agencies.ts`
- `lib/supabase/reportHistory.ts`
- `components/common/SearchInput.tsx`
- `components/common/ConfirmDialog.tsx`
- `app/(app)/properties/page.tsx`
- `app/(app)/people/page.tsx`
- `app/(app)/people/[id]/page.tsx`
- `app/(app)/agencies/page.tsx`
- `app/(app)/agencies/[id]/page.tsx`

2026-05-18 기준 확인 결과:

- `npm test -- --runInBand` 통과
- `npm run build` 통과
- 단, 워킹트리에 이미 수정/추가 파일이 많다. 절대 임의로 되돌리지 말 것.

## 2. 전체 작업 순서 요약

1. Phase 0: 현재 상태 감사
2. Phase 1: DB/Storage SQL 작성 및 사용자 실행 요청
3. Phase 2: CSV 파서/임포트 규칙 보강
4. Phase 3: Supabase CRUD 확장
5. Phase 4: 사진 처리/업로드 구현
6. Phase 5: 매물 화면 개선
7. Phase 6: 인물 화면 개선
8. Phase 7: 부동산 화면 개선
9. Phase 8: 테스트/빌드/수동 검증
10. Phase 9: 실제 CSV import dry-run 후 사용자 확인 및 실행

각 Phase 종료 시 반드시 인수인계 메모를 남긴다.

## 3. Phase 0 - 현재 상태 감사

담당: Codex 주도, Claude 검토 가능

### 목표

이미 구현된 부분과 남은 부분을 정확히 구분한다.

### 확인 파일

- `git status --short`
- `supabase/migrations/*.sql`
- `lib/property/*.ts`
- `scripts/import_properties.ts`
- `lib/supabase/*.ts`
- `app/(app)/properties/page.tsx`
- `app/(app)/people/page.tsx`
- `app/(app)/people/[id]/page.tsx`
- `app/(app)/agencies/page.tsx`
- `app/(app)/agencies/[id]/page.tsx`
- `__tests__/lib/*.test.ts`
- `__tests__/app/*.test.tsx`

### 실행 명령

```powershell
git status --short
npm test -- --runInBand
npm run build
```

### 완료 기준

- 기존 변경분 목록 확인
- 이미 있는 기능과 새로 필요한 기능 분리
- 테스트/빌드 현재 기준선 확인

### 중단 시 인수인계 메모

- 현재 git status 요약
- 테스트 결과
- 빌드 결과
- 다음 Phase로 넘어가도 되는지 여부

## 4. Phase 1 - DB/Storage SQL 작성 및 사용자 실행

담당: Codex 주도. 사용자가 Supabase SQL Editor에서 직접 실행한다. Claude는 007/008/009 기존 SQL과 실행 순서를 검토한다.

### 목표

공동 중개, 부동산 태그, 사진 Storage를 위한 DB 기반을 준비한다.

### 신규 마이그레이션 후보

- `supabase/migrations/010_property_agencies.sql`
- `supabase/migrations/011_agency_tags_and_storage_notes.sql`

파일명은 이미 존재하는 마이그레이션 번호와 충돌하지 않게 조정한다.

### 4.1 공동 중개 테이블

테이블명: `property_agencies`

의미:

- 매물과 공동 중개 부동산의 N:N 연결
- 현재는 `relation_type = 'co_broker'`를 사용
- 향후 `광고협력`, `문의처` 같은 확장을 고려해 `relation_type`은 유지

권장 SQL:

```sql
CREATE TABLE IF NOT EXISTS property_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'co_broker',
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, agency_id, relation_type)
);

ALTER TABLE property_agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON property_agencies;
CREATE POLICY "authenticated_only" ON property_agencies
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_property_agencies_property_id
  ON property_agencies(property_id);

CREATE INDEX IF NOT EXISTS idx_property_agencies_agency_id
  ON property_agencies(agency_id);
```

### 4.2 agencies 확장

필요 컬럼:

- `is_our_office BOOLEAN NOT NULL DEFAULT false`
- `alias TEXT`
- `trust_level TEXT NOT NULL DEFAULT '일반'`
- `tags JSONB NOT NULL DEFAULT '[]'`

`is_our_office`, `alias`는 `008_property_extended.sql`에 이미 있을 수 있다. 중복 방지를 위해 `ADD COLUMN IF NOT EXISTS` 사용.

권장 SQL:

```sql
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS is_our_office BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alias TEXT,
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT '일반',
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';
```

### 4.3 lookup_codes 후보 seed

권장 seed:

```sql
INSERT INTO lookup_codes (category, value, label, sort_order) VALUES
  ('person_role', '없음', '없음', 1),
  ('person_role', '매도인', '매도인', 2),
  ('person_role', '매수인', '매수인', 3),
  ('person_role', '임차인', '임차인', 4),
  ('person_role', '임대인', '임대인', 5),
  ('person_role', '복합', '복합', 6),
  ('agency_trust_level', '신뢰', '신뢰', 1),
  ('agency_trust_level', '일반', '일반', 2),
  ('agency_trust_level', '주의', '주의', 3),
  ('agency_tag', '협조적', '협조적', 1),
  ('agency_tag', '응답느림', '응답느림', 2),
  ('agency_tag', '광고강함', '광고강함', 3),
  ('agency_tag', '가격협상주의', '가격협상주의', 4),
  ('agency_tag', '분쟁주의', '분쟁주의', 5),
  ('agency_tag', '자료정확', '자료정확', 6),
  ('agency_tag', '연락주의', '연락주의', 7)
ON CONFLICT (category, value) DO NOTHING;
```

### 4.4 Storage bucket

사용자는 SQL Editor에서 직접 실행할 예정이다. 이 단계에서 반드시 사용자에게 SQL 실행을 요청하고, 완료 확인을 받은 뒤 DB 의존 구현을 진행한다.

권장 SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "property_photos_authenticated_select" ON storage.objects;
CREATE POLICY "property_photos_authenticated_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "property_photos_authenticated_insert" ON storage.objects;
CREATE POLICY "property_photos_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "property_photos_authenticated_update" ON storage.objects;
CREATE POLICY "property_photos_authenticated_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "property_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "property_photos_authenticated_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
);
```

### 완료 기준

- SQL 파일 작성 완료
- 사용자에게 Supabase SQL Editor 실행 요청
- 사용자가 실행 완료했다고 확인
- 이후 단계에서 새 테이블/컬럼/bucket 사용 가능

### 중단 시 인수인계 메모

- 작성한 SQL 파일 경로
- 사용자가 실행했는지 여부
- 실행 중 오류가 있었다면 오류 전문
- 아직 실행되지 않았다면 다음 AI는 DB 의존 코드를 실행하지 말 것

## 5. Phase 2 - CSV 파서/임포트 보강

담당: Codex 주도. Claude는 테스트 케이스와 dry-run 결과를 검토한다.

### 목표

`E:\real_estate_AI\매물정보_export.csv`를 사용자 규칙대로 매물, 인물, 부동산, 공동소유, 공동 중개 관계에 반영한다.

### 수정 파일

- `lib/property/csvImportProfile.ts`
- `scripts/import_properties.ts`
- `__tests__/lib/csvImportProfile.test.ts`
- 필요 시 `__tests__/lib/propertyParsers.test.ts`

### 5.1 엑셀/CSV 컬럼 의미

1. `f`: 등록일
2. `핸들링`: 매물 거래를 리딩하는 부동산 또는 개인
3. `대표주소`: 매물 소재지 동이름
4. `카테고리`: 실무 분류
5. `별칭`: 매물명/주소 줄임말
6. `동`
7. `호수`: 실호수
8. `랜덤광고`: 광고 여부/강도
9. `종류`: 매매, 전세, 반전세, 월세, 반월세 등
10. `가격`: 매매 금액 또는 보증금/임대료
11. `면적`: 평형 또는 제곱미터
12. `소유자`: 개인 또는 법인 소유자명
13. `통신사 및 연락처`: 소유자의 통신사/연락처/기타 텍스트
14. `한자리`
15. `더힐`
16. `입주시기`
17. `방향`
18. `관리비`
19. `기타사항`

### 5.2 소유자 분리

구분자:

- `,`
- `/`
- 줄바꿈
- `·`
- `및`
- `외`

주의:

- `외`는 `김철수 외 1명`처럼 실제 이름이 없는 경우가 있으므로, 생성 가능한 이름만 생성하고 원문은 notes에 보존한다.

### 5.3 전화번호/통신사 파싱

전화번호:

- `010-xxxx-xxxx` 형식만 phone으로 저장한다.
- 이외 번호 형식은 우선 notes에 보존한다.

통신사:

- `sk`, `skt` 포함 시 `SKT`
- `lg`, `lgu`, `엘지` 포함 시 `LGU`
- `kt`, `(kt)` 포함 시 `KT`
- 대소문자 무시

기타:

- 이름, 전화번호, 통신사 외 텍스트는 notes에 보존한다.

### 5.4 소유자와 전화번호 매칭

규칙:

1. 이름 수와 전화번호 수가 딱 맞으면 순서대로 각각 인물 생성.
2. 이름 1개 + 전화번호 여러 개:
   - 첫 번째 전화번호는 대표번호
   - 나머지 전화번호는 notes에 보존
3. 이름 없음 + 전화번호 있음:
   - `소유자1`, `소유자2` 식으로 인물 생성
4. 이름도 전화번호도 없음:
   - `별칭`, `동`, `호수` 조합으로 임시 소유자명 생성
   - 예: `극동 101-1001`

### 5.5 같은 이름/다른 연락처

- 같은 소유자명인데 연락처가 다르면 다른 사람이다.
- 이름 뒤에 넘버링한다.
- 예:
  - `김소유`, `010-1111-2222`
  - `김소유`, `010-3333-4444`
  - 저장명: `김소유1`, `김소유2`

### 5.6 법인 자동 판별

법인으로 판단하는 경우:

- 이름에 `주식회사`, `(주)`, `법인`, `회사`, `유한회사`, `재단`, `조합` 등이 포함
- 한국인 이름으로 보기 어려운 경우

예외:

- `김철수2`
- `워크인1`
- `소유자1`

위와 같은 자동 넘버링 이름은 개인으로 유지한다.

UI에서 개인/법인 여부를 나중에 수정할 수 있어야 한다.

### 5.7 공동소유 지분율

- 공동소유자 수를 기준으로 균등 배분한다.
- 각 `co_ownership.share_ratio` 행에 개별 비율을 저장한다.
- 저장 형식:
  - `50%`
  - `33.33%`
  - `25%`

### 5.8 핸들링 인물

핸들링 값 중 아래는 인물DB에 저장한다.

- `곽소장`
- `부녀회장`
- `워크인`
- `이선유`
- `허원장`
- `허지연`
- `장은하`
- `김민주`
- `내어회장`

`워크인`은 매칭되는 매물이 다르면 `워크인1`, `워크인2`처럼 넘버링한다.

### 5.9 공동 중개 자동 생성

- 핸들링이 우리 사무소가 아닌 부동산이면 `property_agencies`에 공동 중개로 연결한다.
- 같은 부동산은 `handling_agency_id`에도 들어간다.
- 핸들링이 우리 사무소 또는 개인이면 공동 중개 없음으로 둔다.

### 완료 기준

- CSV 파싱 단위 테스트 통과
- owner/contact 매칭 테스트 통과
- corporate detection 테스트 통과
- share ratio percent 테스트 통과
- non-office handling agency -> co-broker 테스트 통과
- import dry-run profile에 다음 카운트 표시:
  - properties
  - people
  - owner links
  - co_ownership links
  - handling agency links
  - handling person links
  - co_broker links
  - exclusive count
  - strategic count

### 중단 시 인수인계 메모

- 수정한 파서 함수 목록
- 테스트 추가 여부
- dry-run 결과
- 실제 import는 아직 실행하지 않았는지 여부

## 6. Phase 3 - Supabase CRUD 확장

담당: Codex는 신규 CRUD 파일을 만든다. Claude는 기존 `properties.ts`, `people.ts`, `agencies.ts`의 타입/호출부 통합을 맡는다.

### 목표

UI에서 공동 중개, 공동소유, 사진, lookup 후보, 부동산 태그를 다룰 수 있도록 데이터 접근 레이어를 확장한다.

### 수정/신규 파일

- `lib/supabase/properties.ts`
- `lib/supabase/people.ts`
- `lib/supabase/agencies.ts`
- 신규 후보: `lib/supabase/propertyAgencies.ts`
- 신규 후보: `lib/supabase/propertyPhotos.ts`
- 신규 후보: `lib/supabase/lookupCodes.ts`

### 필요한 함수

공동 중개:

- `listPropertyCoBrokers(propertyId)`
- `addPropertyCoBroker(propertyId, agencyId, memo?)`
- `removePropertyCoBroker(propertyId, agencyId)`
- `listProperties({ coBrokerAgencyId })`

공동소유:

- `listPropertyOwners(propertyId)`
- `updateCoOwnershipShare(propertyId, personId, shareRatio)`

부동산 카운트:

- `listAgencies()`가 `handling_property_count` 포함
- `listAgencies()`가 `co_broker_property_count` 포함

lookup:

- `listLookupCodes(category)`
- `upsertLookupCode(category, value, label?)`

사진:

- `uploadPropertyPhoto(...)`
- `deletePropertyPhoto(...)`
- `getPropertyPhotoSignedUrls(...)`
- `updatePropertyPhotoMetadata(...)`

### 완료 기준

- 타입 정의 완료
- 기존 화면이 깨지지 않음
- CRUD 함수 단위 테스트 또는 mock 기반 테스트 추가

### 중단 시 인수인계 메모

- 새로 만든 함수 목록
- 아직 UI에 연결하지 않은 함수 목록
- DB SQL 실행 여부

## 7. Phase 4 - 사진 처리/업로드 구현

담당: Codex 주도. Claude는 매물 화면 통합 전 UI/테스트 회귀를 검토한다.

### 목표

매물 저장 후 실제 사진 업로드, 압축, 썸네일, signed URL 표시를 구현한다.

### 신규 파일 후보

- `lib/images/propertyPhotoProcessor.ts`
- `lib/supabase/propertyPhotos.ts`
- `components/properties/PropertyPhotoUploader.tsx`

### 구현 상세

업로드 제한:

- JPG/PNG/WebP
- 파일당 10MB 이하
- 매물당 최대 30장

UI 표시:

- 업로드 UI에 제한사항을 명시한다.
- 예: `JPG/PNG/WebP, 파일당 10MB 이하, 매물당 최대 30장. 업로드 시 WebP로 압축되고 썸네일이 생성됩니다.`

이미지 처리:

- `createImageBitmap` 또는 `canvas` 사용
- 본문용:
  - 긴 변 최대 1600px
  - WebP quality 0.82
- 썸네일:
  - 긴 변 최대 360px
  - WebP quality 0.75

Storage path:

- `properties/{propertyId}/photo-{uuid}.webp`
- `properties/{propertyId}/thumb-{uuid}.webp`

삭제:

- 원본 WebP와 썸네일 WebP 모두 삭제
- `properties.photo_urls`에서도 metadata 제거

조회:

- DB에 저장된 `path`, `thumbnail_path` 기준으로 1시간 signed URL 발급

### 완료 기준

- 매물 저장 전에는 업로드 불가
- 매물 저장 후 업로드 가능
- 업로드 후 썸네일 표시
- 새로고침 후 signed URL 재발급
- 삭제 시 Storage와 DB metadata 모두 정리

### 중단 시 인수인계 메모

- Storage bucket SQL 실행 여부
- 업로드 함수 테스트 여부
- UI 연결 여부
- 아직 수동 확인이 필요한 브라우저 시나리오

## 8. Phase 5 - 매물 화면 개선

담당: Claude 주도, Codex는 사진 업로더/공동중개 helper 제공 및 최소 통합 지원.

### 목표

매물 화면에서 공동소유, 공동 중개, 사진, 별칭/카테고리/종류/방향 직접입력을 처리한다.

### 수정 파일

- `app/(app)/properties/page.tsx`
- 필요 시 `components/properties/*.tsx`
- `lib/supabase/properties.ts`

### 필터 확장

- `ownerPersonId`
- `handlingPersonId`
- `handlingAgencyId`
- `coBrokerAgencyId`

### 표시 항목

- 핸들링 주체
- 공동 중개 부동산 전체
- 공동 중개 없음
- 소유자/공동소유자
- 지분율
- 사진 썸네일
- 카테고리
- 별칭
- 종류
- 가격
- 면적

공동 중개 표시:

- 공동 중개가 없으면 `공동 중개 없음`
- 있으면 모든 부동산 별칭/이름을 표시한다.
- 일반적으로 한자리수를 넘지 않으므로 전체 표시한다.

### 수정 UI

- 공동 중개 부동산 추가/삭제
- 공동소유자 추가/삭제 또는 최소 지분율 수정
- 사진 업로드/삭제/캡션 수정
- 카테고리 직접입력 + 후보 저장
- 별칭 직접입력 + 후보 저장
- 종류 직접입력 + 후보 저장
- 방향 직접입력 + 후보 저장

### 완료 기준

- 특정 공동 중개 부동산과 함께한 매물 검색 가능
- 특정 핸들링 부동산 매물 검색 가능
- 특정 소유자/공동소유자 매물 검색 가능
- 사진 업로드 UI 동작
- 매물 수정 후 목록/상세에 반영

### 중단 시 인수인계 메모

- 연결된 필터 목록
- 아직 UI에 연결하지 않은 CRUD 함수
- 테스트 통과 여부

## 9. Phase 6 - 인물 화면 개선

담당: Claude 주도, Codex는 소유/공동소유/핸들링 데이터 helper 제공.

### 목표

인물DB를 소유, 공동소유, 역할, 핸들링 중심으로 정리한다.

### 수정 파일

- `app/(app)/people/page.tsx`
- `app/(app)/people/[id]/page.tsx`
- `lib/supabase/people.ts`

### 인물 리스트 표시

- 이름
- 별칭/호칭
- 연락처
- 통신사
- 개인/법인
- 대표 역할
- 관계 역할 요약
- 소유매물 수
- 핸들링매물 수

### 인물 수정

- 대표 역할 직접입력
- 직접입력 시 `lookup_codes.person_role` 저장
- 개인/법인 수정 가능
- 주소 수정 가능
- 통신사 직접입력 가능

### 인물 상세

섹션:

- 기본 정보
- 소유매물
- 공동소유 매물 + 지분율
- 역할별 연결 매물
- 핸들링 매물
- 메모

매물 요약 표시:

- 핸들링
- 대표주소
- 별칭
- 종류
- 가격
- 면적

이동:

- 소유매물 클릭: 현재 구조에 맞춰 `/properties?ownerPersonId=...`
- 핸들링매물 클릭: `/properties?handlingPersonId=...`
- 별도 `/properties/[id]` 상세 페이지는 이번 범위에서 만들지 않는다.

### 완료 기준

- 소유매물 수 클릭 시 매물 필터 이동
- 핸들링 수 클릭 시 매물 필터 이동
- 관계 역할과 대표 역할이 혼동되지 않게 표시
- 법인 여부 수정 가능

### 중단 시 인수인계 메모

- 리스트/상세 중 어디까지 완료했는지
- 대표 역할 lookup 연동 여부
- 필터 이동 동작 여부

## 10. Phase 7 - 부동산 화면 개선

담당: Claude 주도, Codex는 lookup helper와 공동중개 카운트 helper 제공.

### 목표

부동산DB에서 핸들링과 공동 중개를 분리해서 보여주고, 대표 상태/태그를 관리한다.

### 수정 파일

- `app/(app)/agencies/page.tsx`
- `app/(app)/agencies/[id]/page.tsx`
- `lib/supabase/agencies.ts`
- 필요 시 `lib/supabase/lookupCodes.ts`

### UI 용어

- 모든 사용자 표시 문구에서 `타부동산`을 `부동산`으로 변경한다.
- 코드 파일명과 DB 테이블명 `agencies`는 유지한다.

### 부동산 리스트 표시

- 부동산명
- 별칭
- 대표자
- 연락처
- 우리 사무소 여부
- 대표 상태: `신뢰`, `일반`, `주의`, 사용자 추가값
- 복수 태그
- 핸들링 매물 수
- 공동 중개 매물 수

### 부동산 등록/수정

- 별칭
- 우리 사무소 여부
- 대표 상태 선택 + 직접입력
- 복수 태그 선택 + 직접입력 추가
- 메모는 기존 메모 기능 유지

### 부동산 상세

- 대표 상태와 태그 상단 노출
- 핸들링 매물 목록
- 공동 중개 매물 목록
- 메모/주의 메모

이동:

- 핸들링 수 클릭: `/properties?handlingAgencyId=...`
- 공동 중개 수 클릭: `/properties?coBrokerAgencyId=...`

### 완료 기준

- 대표 상태 표시/수정 가능
- 새 대표 상태 후보 저장 가능
- 복수 태그 추가/삭제 가능
- 새 태그 후보 저장 가능
- 핸들링 카운트와 공동 중개 카운트 분리

### 중단 시 인수인계 메모

- 리스트/상세/폼 중 완료 범위
- lookup 연동 여부
- 카운트 쿼리 검증 여부

## 11. Phase 8 - 테스트 및 검증

담당: 공동. 각자 수정한 파일의 테스트를 먼저 통과시킨 뒤 전체 테스트/빌드는 한 번에 확인한다.

### 목표

요구사항이 자동 테스트와 수동 검증으로 확인되도록 한다.

### 추가/수정 테스트 후보

- `__tests__/lib/csvImportProfile.test.ts`
  - owner/contact matching
  - missing owner name with phone -> `소유자1`
  - one owner many phones -> first phone primary, rest notes
  - corporate detection
  - share ratio percent
  - non-office handling agency -> co-broker
- `__tests__/lib/propertyParsers.test.ts`
  - carrier parsing
  - direction/move-in correction
  - price/area parsing
- `__tests__/lib/supabaseCrudExtensions.test.ts`
  - property co-broker CRUD
  - lookup upsert
  - photo metadata validation
- `__tests__/app/properties.test.tsx`
  - coBrokerAgencyId filter
  - photo UI limit text
  - co-broker display
- `__tests__/app/people.test.tsx`
  - ownership count
  - handling count
  - corporate display
- `__tests__/app/people-profile.test.tsx`
  - owned/co-owned/handling sections
- `__tests__/app/agencies.test.tsx`
  - trust level
  - tags
  - handling count
  - co-broker count

### 검증 명령

```powershell
npm test -- --runInBand
npm run build
```

### 수동 검증 후보

- dev 서버 실행
- `/properties`에서 공동 중개 필터 확인
- `/people`에서 소유/핸들링 수 클릭 확인
- `/people/[id]`에서 매물 요약 확인
- `/agencies`에서 대표 상태/태그/카운트 확인
- 매물 저장 후 사진 업로드/삭제 확인

### 완료 기준

- 전체 테스트 통과
- 빌드 통과
- 주요 UI 수동 확인 완료

### 중단 시 인수인계 메모

- 실패 테스트 이름
- 실패 원인 추정
- 빌드 성공 여부
- 수동 검증한 화면 목록

## 12. Phase 9 - 실제 CSV import

담당: Codex 주도. 실제 import는 사용자 승인 후에만 실행한다. Claude는 dry-run 결과를 검토할 수 있다.

### 목표

마이그레이션과 코드가 준비된 뒤 실제 CSV 데이터를 DB에 반영한다.

### 중요

실제 import는 데이터 삭제/덮어쓰기 가능성이 있으므로 반드시 사용자 확인 후 실행한다.

### 순서

1. SQL 마이그레이션이 Supabase SQL Editor에서 실행됐는지 확인
2. `scripts/import_properties.ts` dry-run 실행
3. dry-run 결과를 사용자에게 보고
4. 사용자 승인 후 실제 import 실행
5. import 결과 카운트 보고
6. 앱에서 주요 샘플 확인

### dry-run에서 보고할 항목

- 총 매물 수
- 생성될 인물 수
- 생성될 부동산 수
- 소유자 연결 수
- 공동소유 연결 수
- 핸들링 개인 연결 수
- 핸들링 부동산 연결 수
- 공동 중개 연결 수
- 전속 매물 수
- 전략 매물 수
- 파싱 실패/확인 필요 row

### 완료 기준

- 사용자 승인 후 실제 import 완료
- import 결과 카운트 확인
- 샘플 매물/인물/부동산 화면에서 관계 확인

### 중단 시 인수인계 메모

- dry-run만 했는지, 실제 import까지 했는지
- 실행한 명령
- 결과 카운트
- 실패 row 목록

## 13. 최종 완료 기준

전체 작업 완료 조건:

- `타부동산` UI 용어가 `부동산`으로 변경됨
- 인물/매물/부동산 별칭 검색 가능
- CSV 소유자/연락처/통신사/법인/공동소유 파싱 규칙 반영
- 공동소유자 모두 매물과 연결됨
- 공동소유 지분율이 `%`로 저장됨
- 핸들링과 공동 중개가 분리됨
- 핸들링이 다른 부동산인 매물은 공동 중개로 자동 연결됨
- 매물 화면에서 공동 중개 부동산 전체 표시
- 특정 부동산과 공동 중개한 매물 검색 가능
- 인물 리스트/상세에서 소유매물과 핸들링매물 확인 가능
- 부동산 리스트/상세에서 핸들링 매물 수와 공동 중개 매물 수 확인 가능
- 부동산 대표 상태와 복수 태그 관리 가능
- 사진 업로드가 실제 Supabase Storage 기반으로 동작
- 사진은 WebP 압축 + 썸네일 생성
- signed URL은 1시간 기준으로 표시 시 발급
- `npm test -- --runInBand` 통과
- `npm run build` 통과

## 14. 다른 AI에게 넘길 때 반드시 남길 메모 양식

아래 형식으로 마지막 메시지나 별도 문서에 남긴다.

```md
## 인수인계 메모

### 완료한 Phase
- Phase:
- 완료 내용:

### 수정한 파일
- 

### 생성한 파일
- 

### 사용자가 Supabase SQL Editor에서 실행해야 할 SQL
- 실행 완료 여부:
- SQL 파일 경로:

### 실행한 명령과 결과
- `npm test -- --runInBand`:
- `npm run build`:
- 기타:

### 아직 남은 작업
- 

### 주의사항
- 사용자 변경분을 되돌리지 말 것.
- 실제 import는 사용자 승인 전 실행하지 말 것.
- Storage bucket SQL 실행 여부를 확인할 것.
```

## 2026-05-22 추가 진행: 대시보드 빠른 주소 검색 수정

### 증상

- `/dashboard`의 빠른 주소 검색에서 검색어를 입력해도 결과가 표시되지 않는 문제가 있었다.

### 원인

- 현재 `.env.local`의 Juso 개발 승인키가 만료되어 Juso API가 `E0014`를 반환했다.
- `/api/juso`는 오류를 사용자 경험 보호 목적으로 빈 배열로 반환하고 있어 화면에서는 아무 결과가 없는 것처럼 보였다.
- 추가로 `AddressSearch`의 `bdKdcdFilter`가 API 결과를 전부 걸러내면 원본 결과까지 사라지는 구조였다.

### 조치

- `lib/apis/juso.ts`
  - Mock 검색 필터를 공통 함수로 분리했다.
  - 개발환경에서 Juso API 오류가 발생하면 Mock 검색 결과로 폴백하도록 했다.
  - `JUSO_API_KEY`가 없을 때도 전체 Mock이 아니라 검색어로 필터링된 Mock을 반환하도록 정리했다.
- `components/address/AddressSearch.tsx`
  - 건물구분 필터 결과가 0건이면 원본 주소 결과를 표시하도록 변경했다.
- `jest.setup.ts`
  - Node 테스트 환경에서도 setup이 깨지지 않도록 `Element` 존재 여부를 확인한다.
- 테스트 추가
  - `__tests__/lib/juso.server.test.ts`
  - `e2e/dashboard-quick-address.spec.ts`

### 검증

- `npm test -- --runInBand __tests__/lib/juso.test.ts __tests__/lib/juso.server.test.ts __tests__/components/AddressSearch.test.tsx __tests__/components/QuickAddressSearch.test.tsx`
- `npx playwright test e2e/dashboard-quick-address.spec.ts --reporter=list`
- `npm run build`
- 로컬 확인: `GET /api/juso?q=옥수`가 Mock 결과 2건을 반환함

### 남은 주의사항

- 현재 수정은 개발 중 화면이 멈추지 않도록 하는 폴백이다.
- 실무 최종 테스트 전에는 Juso 승인키를 갱신해야 실제 도로명주소 API 결과가 반환된다.

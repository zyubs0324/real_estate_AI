# Property CSV Import Profile

Source: `E:\real_estate_AI\매물정보_export.csv`

## File Shape

- Encoding: `cp949`
- Parsed CSV rows: 3,052 including header
- Header columns: 35
- Primary property columns: first 19 columns
- Importable primary data rows: 1,189
- Empty trailing rows: 1,862
- Trailing helper/validation columns: 16

The CSV has quoted newlines in headers and cells. Do not parse it line-by-line.

## Primary Columns

1. `f`
2. `핸들링`
3. `대표주소`
4. `카테고리`
5. `별칭`
6. `동`
7. `호수`
8. `랜덤광고(고,중,저)\n사용승인일`
9. `종류`
10. `가격`
11. `면적`
12. `소유자`
13. `통신사 및 연락처`
14. `한자리`
15. `더힐`
16. `입주시기`
17. `방향`
18. `관리비`
19. `기타사항`

## Import Rules Implemented

- `source_platform`: `sheet`
- `road_address`: synthesized from `대표주소 + 별칭 + 동 + 호수`
- `neighborhood`: `대표주소`
- `building_name`: `별칭`
- `registered_date`: `f`
- `hanjari_date`: `한자리`
- `deohill_date`: `더힐`
- `전속`: `is_exclusive=true`, handling becomes `한자리`
- `전략매물`: `is_strategic=true`, handling becomes `한자리`
- `급매`: `deal_type=매매`, `status=급매`
- `보류`: `deal_type=매매`, `status=보류`
- `반전`: `반전세`
- `반월`: `반월세`
- `임대`: `월세`
- `단기`: `단기임대`
- 8방위 외 `방향` values move to `move_in_date` when `입주시기` is blank
- Missing owner generates a temporary owner name from `별칭 동 호수`
- Agencies are imported first and linked to properties through `handling_agency_id` when the extended schema exists.
- People are imported next and linked to properties through `handling_person_id` when the extended schema exists.
- If the remote database is still on the older CRM schema, property handling is linked through `listing_agency_id` / `listing_agent_id`.
- If `co_ownership` is unavailable, owner links are imported into `relations` with `role='소유자'` or `role='공동소유자'`.
- If extended property columns are unavailable, extended values are preserved in `properties.external_ids`.

## Dry-Run Summary

- Importable rows: 1,189
- Unique import keys: 1,086
- Duplicate import keys: 91
- Missing critical fields: 59
- Exclusive rows: 9
- Strategic rows: 5
- Generated owner rows: 246

## Executed Import Result

Executed against the configured Supabase project after clearing existing CRM mock data.

- Agencies: 21
- People: 1,023
- Properties: 1,189
- Co-ownership rows: 1,252
- Legacy owner relations: 0
- Properties linked to agencies through `handling_agency_id`: 905
- Properties linked to people through `handling_person_id`: 266
- Exclusive rows: 9
- Strategic rows: 5
- `반전세` rows: 15
- `반월세` rows: 6

The full extended schema is now active in the remote DB. Extended fields such as handling name, category, alias, source platform, parsed price, parsed area, exclusive/strategic flags, and co-ownership are stored in regular columns/tables.

Remaining compatibility notes:

- `status` is still constrained by the older status check, so `급매`, `보류`, `완료`, and `확인필요` are preserved in `notes` as values such as `원상태: 급매`; DB `status` is set to `공실` for schema compatibility.
- Malformed or unsupported deal types such as `통매각`, `??`, and `???` are preserved in `notes` as values such as `원종류: 통매각`; DB `deal_type` is set to `null`.
- Rows with numeric-only prices and missing deal type can be ambiguous. For example, `13.5` without `deal_type=매매` remains a manual review candidate.

Import key currently uses:

```text
별칭 | 동 | 호수 | normalized deal_type | 가격
```

This catches exact duplicate listing rows while allowing the same unit to have multiple deal types.

## Top Values

Handling:

- 한자리: 591
- 곽소장: 97
- 더힐: 89
- 경희: 61
- 이야기: 35
- 세일: 26
- 한양: 20

Deal type after normalization:

- 매매: 654
- 전세: 271
- 월세: 211
- 반전세: 15
- 반월세: 6
- 렌트: 5
- 단기임대: 2
- Needs manual check: 3

Category:

- 극동: 382
- 그린: 191
- 나홀로,빌라,오피,풍림,어울림: 174
- 리버젠,옥파,한하: 109
- 상가/사무실/건물: 108
- 삼성,현대,옥하: 85
- 타지역/토지: 74
- 금호/응봉: 52

## Manual Review Needed

- The plan expected 1,196 rows, but CSV primary data rows are 1,189.
- 91 duplicate import keys should be reviewed before destructive upsert.
- 59 rows are missing one or more critical fields among handling/address/alias/deal/price.
- Unknown handling names are common. Many should be classified as agencies or people before a clean import.
- Some trailing helper columns contain stray data in about 10 cells; these are ignored by the importer for now.

## Run Commands

Dry-run:

```powershell
npx tsx scripts/import_properties.ts E:\real_estate_AI\매물정보_export.csv
```

Execute import:

```powershell
npx tsx scripts/import_properties.ts E:\real_estate_AI\매물정보_export.csv --execute
```

`--execute` requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

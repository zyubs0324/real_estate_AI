/**
 * U1-4: Phase 1 마이그레이션 SQL 파일 구조 검증
 * - 파일 존재 여부
 * - 필수 테이블 CREATE TABLE 구문 포함 여부
 * - RLS 정책 정의 여부
 * - pgvector 익스텐션 활성화 여부
 */
import * as fs from 'fs'
import * as path from 'path'

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../supabase/migrations/001_phase1_core.sql',
)

const REQUIRED_TABLES = [
  'users',
  'agencies',
  'people',
  'lookup_codes',
  'properties',
  'relations',
  'memos',
  'notifications',
  'documents',
  'property_permissions',
]

describe('001_phase1_core.sql — 마이그레이션 파일 검증', () => {
  let sql: string

  beforeAll(() => {
    sql = fs.readFileSync(MIGRATION_PATH, 'utf-8').toLowerCase()
  })

  it('마이그레이션 파일이 존재한다', () => {
    expect(fs.existsSync(MIGRATION_PATH)).toBe(true)
  })

  it('파일이 비어있지 않다', () => {
    expect(sql.trim().length).toBeGreaterThan(100)
  })

  it('pgvector 익스텐션을 활성화한다', () => {
    expect(sql).toContain('create extension if not exists vector')
  })

  REQUIRED_TABLES.forEach((table) => {
    it(`"${table}" 테이블 CREATE TABLE 구문이 있다`, () => {
      expect(sql).toMatch(new RegExp(`create table.+${table}`, 's'))
    })
  })

  it('RLS 활성화(enable row level security) 구문이 있다', () => {
    expect(sql).toContain('enable row level security')
  })

  it('인증된 사용자만 접근 가능한 RLS 정책이 있다', () => {
    expect(sql).toContain('auth.uid()')
  })

  it('users 테이블이 auth.users를 참조한다', () => {
    expect(sql).toContain('auth.users')
  })

  it('properties 테이블에 is_our_property 컬럼이 있다', () => {
    expect(sql).toContain('is_our_property')
  })

  it('lookup_codes 기본 데이터(건물 유형)가 INSERT 구문으로 포함된다', () => {
    expect(sql).toContain('insert into')
    expect(sql).toContain('아파트')
  })
})

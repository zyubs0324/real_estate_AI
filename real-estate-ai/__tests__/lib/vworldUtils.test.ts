/**
 * VWorld 유틸리티 함수 단위 테스트
 * buildPnu: 법정동코드(10) + 대지구분(1) + 지번본번(4) + 지번부번(4) → PNU 19자리
 */
import { buildPnu } from '@/lib/apis/vworld'

describe('buildPnu (VWorld PNU 구성)', () => {
  it('PNU는 항상 19자리다', () => {
    expect(buildPnu('1120010200', '0', '0001', '0000')).toHaveLength(19)
  })

  it('법정동코드(10) + 대지구분(1) + 지번본번(4) + 지번부번(4)로 조합한다', () => {
    // 성동구 옥수동 법정동코드 1120010200, 대지(0), 1번지
    const pnu = buildPnu('1120010200', '0', '0001', '0000')
    expect(pnu.slice(0, 10)).toBe('1120010200')  // 법정동코드
    expect(pnu[10]).toBe('0')                    // 대지구분 (0=대지)
    expect(pnu.slice(11, 15)).toBe('0001')        // 지번본번
    expect(pnu.slice(15)).toBe('0000')            // 지번부번
    expect(pnu).toBe('1120010200000010000')
  })

  it('산 임야(대지구분=1)를 올바르게 인코딩한다', () => {
    const pnu = buildPnu('1120010200', '1', '0428', '0000')
    expect(pnu[10]).toBe('1')                    // 대지구분 (1=산)
    expect(pnu.slice(11, 15)).toBe('0428')
    expect(pnu).toBe('1120010200104280000')
  })

  it('sigunguCd + bjdongCd 연결로 admCd10을 구성할 수 있다', () => {
    const sigunguCd = '11200'
    const bjdongCd  = '10200'
    const pnu = buildPnu(sigunguCd + bjdongCd, '0', '0100', '0010')
    expect(pnu.slice(0, 10)).toBe('1120010200')
    expect(pnu.slice(11, 15)).toBe('0100')
    expect(pnu.slice(15)).toBe('0010')
  })

  it('지번이 짧을 때 앞을 0으로 패딩한다', () => {
    const pnu = buildPnu('1168010600', '0', '1', '5')
    expect(pnu.slice(11, 15)).toBe('0001')
    expect(pnu.slice(15)).toBe('0005')
  })

  it('admCd10이 10자보다 짧으면 0으로 채운다', () => {
    const pnu = buildPnu('11200', '0', '0001', '0000')
    expect(pnu.slice(0, 10)).toBe('1120000000')
    expect(pnu).toHaveLength(19)
  })
})

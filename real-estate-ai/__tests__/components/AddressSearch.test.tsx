/**
 * U1-6: AddressSearch 컴포넌트 — 자동완성 드롭다운 UI 테스트
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// juso API 모킹
jest.mock('@/lib/apis/juso', () => ({
  fetchJuso: jest.fn().mockResolvedValue([
    {
      roadAddr: '서울특별시 성동구 옥수동 옥수로 100',
      jibunAddr: '서울특별시 성동구 옥수동 123-45',
      zipNo: '04631',
      bdNm: '옥수하이츠',
    },
    {
      roadAddr: '서울특별시 성동구 옥수동 옥수로 200',
      jibunAddr: '서울특별시 성동구 옥수동 234-56',
      zipNo: '04632',
      bdNm: '',
    },
  ]),
}))

import AddressSearch from '@/components/address/AddressSearch'

describe('AddressSearch — 자동완성 드롭다운 (U1-6)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('검색 입력창을 렌더링한다', () => {
    render(<AddressSearch onSelect={jest.fn()} />)
    expect(screen.getByPlaceholderText(/주소 입력/i)).toBeInTheDocument()
  })

  it('입력 시 API를 호출하고 드롭다운을 표시한다', async () => {
    render(<AddressSearch onSelect={jest.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/주소 입력/i), '옥수')
    await waitFor(() => {
      expect(screen.getByText('서울특별시 성동구 옥수동 옥수로 100')).toBeInTheDocument()
    })
  })

  it('드롭다운 항목 선택 시 onSelect 콜백이 호출된다', async () => {
    const onSelect = jest.fn()
    render(<AddressSearch onSelect={onSelect} />)
    await userEvent.type(screen.getByPlaceholderText(/주소 입력/i), '옥수')
    await waitFor(() => {
      expect(screen.getByText('서울특별시 성동구 옥수동 옥수로 100')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('서울특별시 성동구 옥수동 옥수로 100'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      roadAddr: '서울특별시 성동구 옥수동 옥수로 100',
    }))
  })

  it('항목 선택 후 드롭다운이 닫힌다', async () => {
    render(<AddressSearch onSelect={jest.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/주소 입력/i), '옥수')
    await waitFor(() => {
      expect(screen.getByText('서울특별시 성동구 옥수동 옥수로 100')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('서울특별시 성동구 옥수동 옥수로 100'))
    await waitFor(() => {
      expect(screen.queryByText('서울특별시 성동구 옥수동 옥수로 200')).not.toBeInTheDocument()
    })
  })

  it('빈 결과 시 "검색 결과가 없습니다" 메시지를 표시한다', async () => {
    const { fetchJuso } = require('@/lib/apis/juso')
    fetchJuso.mockResolvedValueOnce([])
    render(<AddressSearch onSelect={jest.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/주소 입력/i), '없는주소')
    await waitFor(() => {
      expect(screen.getByText(/검색 결과가 없습니다/i)).toBeInTheDocument()
    })
  })
})

'use client'

// apple.md §13 — 검색 입력 + 드롭다운 (인라인 스타일)
// U1-6: 도로명주소 자동완성 컴포넌트

import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchJuso, type JusoResult } from '@/lib/apis/juso'

interface AddressSearchProps {
  onSelect: (result: JusoResult) => void
  placeholder?: string
  disabled?: boolean
}

const S = {
  wrap: {
    position: 'relative' as const,
    width: '100%',
  },
  inputWrap: {
    position: 'relative' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(0,0,0,0.3)',
    pointerEvents: 'none' as const,
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    border: '1px solid rgba(0, 0, 0, 0.12)',
    padding: '0 36px',
    fontSize: 14,
    color: '#1d1d1f',
    background: '#f5f5f7',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  inputFocus: {
    border: '1px solid #0071e3',
    boxShadow: '0 0 0 3px rgba(0, 113, 227, 0.18)',
    background: '#ffffff',
  },
  clearButton: {
    position: 'absolute' as const,
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.18)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  dropdown: {
    position: 'absolute' as const,
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#ffffff',
    borderRadius: 10,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
    zIndex: 200,
    overflow: 'hidden',
    maxHeight: 280,
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    transition: 'background 100ms ease',
  },
  dropdownItemRoad: {
    fontSize: 14,
    color: '#1d1d1f',
    fontWeight: 500,
    marginBottom: 2,
  },
  dropdownItemJibun: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
  },
  dropdownItemZip: {
    fontSize: 11,
    color: '#0071e3',
    marginLeft: 6,
  },
  emptyState: {
    padding: '16px 14px',
    fontSize: 14,
    color: 'rgba(0,0,0,0.4)',
    textAlign: 'center' as const,
  },
  loadingState: {
    padding: '12px 14px',
    fontSize: 13,
    color: 'rgba(0,0,0,0.4)',
    textAlign: 'center' as const,
  },
}

export default function AddressSearch({
  onSelect,
  placeholder = '도로명 또는 지번 주소 입력 (예: 성동구 옥수)',
  disabled = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<JusoResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await fetchJuso(q)
      setResults(data)
      setIsOpen(true)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(item: JusoResult) {
    setQuery(item.roadAddr)
    setIsOpen(false)
    setResults([])
    onSelect(item)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const inputStyle = {
    ...S.input,
    ...(isFocused ? S.inputFocus : {}),
  }

  return (
    <div ref={wrapRef} style={S.wrap}>
      <div style={S.inputWrap}>
        {/* 돋보기 아이콘 */}
        <span style={S.searchIcon}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </span>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true)
            if (results.length > 0) setIsOpen(true)
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyle}
          aria-label="주소 검색 입력"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          autoComplete="off"
        />

        {/* 지우기 버튼 */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={S.clearButton}
            aria-label="검색어 지우기"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 드롭다운 */}
      {isOpen && (
        <div style={S.dropdown} role="listbox">
          {isLoading && (
            <div style={S.loadingState}>검색 중…</div>
          )}

          {!isLoading && results.length === 0 && (
            <div style={S.emptyState}>검색 결과가 없습니다</div>
          )}

          {!isLoading && results.map((item, idx) => (
            <div
              key={item.bdMgtSn || idx}
              role="option"
              aria-selected={false}
              style={{
                ...S.dropdownItem,
                background: hoveredIdx === idx ? '#f5f5f7' : '#ffffff',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onMouseDown={(e) => e.preventDefault()} // input blur 방지
              onClick={() => handleSelect(item)}
            >
              <div style={S.dropdownItemRoad}>
                {item.roadAddr}
                {item.bdNm && (
                  <span style={{ marginLeft: 6, fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: 400 }}>
                    ({item.bdNm})
                  </span>
                )}
                <span style={S.dropdownItemZip}>[{item.zipNo}]</span>
              </div>
              <div style={S.dropdownItemJibun}>{item.jibunAddr}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

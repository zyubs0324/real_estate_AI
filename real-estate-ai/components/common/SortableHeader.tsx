'use client'

import type { CSSProperties } from 'react'
import { nextSortState, type SortState } from '@/lib/table/sort'

type SortableHeaderProps<Key extends string> = {
  label: string
  sortKey: Key
  sort: SortState<Key>
  onSort: (sort: SortState<Key>) => void
  style?: CSSProperties
}

export default function SortableHeader<Key extends string>({
  label,
  sortKey,
  sort,
  onSort,
  style,
}: SortableHeaderProps<Key>) {
  const active = sort.key === sortKey
  const directionLabel = active ? (sort.direction === 'asc' ? '오름차순' : '내림차순') : '정렬 없음'

  return (
    <th style={style} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(nextSortState(sort, sortKey))}
        title={`${label} ${directionLabel}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: active ? '#1d1d1f' : 'inherit',
          font: 'inherit',
          fontWeight: active ? 700 : 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true" style={{ fontSize: 10, color: active ? '#0071e3' : 'rgba(0,0,0,0.25)' }}>
          {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

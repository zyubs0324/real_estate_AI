'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder = '검색',
  label = '검색',
}: SearchInputProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 0, position: 'absolute' }}>{label}</span>
      <span aria-hidden="true" style={{ color: 'rgba(0,0,0,0.38)' }}>⌕</span>
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: 220,
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          fontFamily: 'inherit',
          background: '#fff',
        }}
      />
    </label>
  )
}

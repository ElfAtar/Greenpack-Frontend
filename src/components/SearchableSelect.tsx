import React, { useEffect, useMemo, useRef, useState } from 'react'
import { matchesQuery, rankMatch } from '../utils/search'
import HighlightedText from './HighlightedText'

export interface SearchableSelectOption {
  value: string
  /** Main text shown in the list and in the closed input. */
  label: string
  /** Secondary line, e.g. the product key that tells two similar names apart. */
  sublabel?: string
  /** Short badge on the right, e.g. the product type. */
  meta?: string
  /** Extra text that should be searchable without being shown. */
  keywords?: Array<string | undefined | null>
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  /** Shown when there is nothing to choose from at all, as opposed to nothing matching. */
  noOptionsText?: string
  loadingText?: string
  isLoading?: boolean
  disabled?: boolean
  hasError?: boolean
  width?: number | string
  /** Results rendered at once; the rest stay hidden until the query narrows down. */
  maxVisible?: number
  id?: string
}

const secondaryFields = (option: SearchableSelectOption): Array<string | undefined | null> =>
  [option.sublabel, option.meta, ...(option.keywords ?? [])]

const searchFields = (option: SearchableSelectOption): Array<string | undefined | null> =>
  [option.label, ...secondaryFields(option)]

/**
 * A select you can actually search in: substring matching over every field of an option (not just
 * the first letters a native <select> jumps to), Turkish-insensitive, with the matched part
 * highlighted and a second line to separate different forms of the same product.
 */
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  emptyText = 'Sonuç bulunamadı',
  noOptionsText = 'Seçenek bulunmuyor',
  loadingText = 'Yükleniyor...',
  isLoading = false,
  disabled = false,
  hasError = false,
  width = '100%',
  maxVisible = 100,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(
    () => options.find(option => option.value === value) ?? null,
    [options, value]
  )

  const matches = useMemo(() => {
    const trimmed = query.trim()
    if (trimmed === '') return options

    // Match on every field first - a query may mix a word from the name with one from the product
    // key - then rank the survivors so the closest name match is on top.
    return options
      .filter(option => matchesQuery(searchFields(option), trimmed))
      .map(option => ({
        option,
        rank: rankMatch(option.label, secondaryFields(option), trimmed),
      }))
      .sort((a, b) => a.rank - b.rank || a.option.label.localeCompare(b.option.label, 'tr'))
      .map(entry => entry.option)
  }, [options, query])

  const visibleMatches = matches.slice(0, maxVisible)

  // Keep the highlighted row inside the list as the user arrows through it.
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const activeElement = listRef.current.children[activeIndex] as HTMLElement | undefined
    activeElement?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const open = () => {
    if (disabled) return
    setQuery('')
    setIsOpen(true)
    // Start on the current selection so Enter keeps it instead of jumping to the first row.
    const selectedIndex = options.findIndex(option => option.value === value)
    setActiveIndex(selectedIndex >= 0 && selectedIndex < maxVisible ? selectedIndex : 0)
  }

  const close = () => {
    setIsOpen(false)
    setQuery('')
  }

  const select = (option: SearchableSelectOption) => {
    onChange(option.value)
    close()
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        open()
        return
      }
      if (visibleMatches.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(previous => (previous + step + visibleMatches.length) % visibleMatches.length)
      return
    }

    if (event.key === 'Enter') {
      if (!isOpen) return
      event.preventDefault()
      const option = visibleMatches[activeIndex]
      if (option) select(option)
      return
    }

    if (event.key === 'Escape') {
      if (!isOpen) return
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'Tab') {
      close()
    }
  }

  const borderColor = hasError ? '#d32f2f' : isOpen ? '#1976d2' : '#b0b0b0'

  return (
    <div ref={containerRef} style={{ position: 'relative', width }}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={isOpen ? query : (selectedOption?.label ?? '')}
        placeholder={isLoading ? loadingText : (selectedOption ? selectedOption.label : placeholder)}
        onChange={event => {
          setQuery(event.target.value)
          if (!isOpen) setIsOpen(true)
        }}
        onFocus={() => { if (!isOpen) open() }}
        onMouseDown={() => { if (!isOpen) open() }}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          fontSize: 15,
          padding: '10px 58px 10px 12px',
          borderRadius: 6,
          border: `${hasError ? 2 : 1}px solid ${borderColor}`,
          backgroundColor: hasError ? '#fff5f5' : disabled ? '#f5f5f5' : '#fff',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />

      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {value !== '' && !disabled && (
          <button
            type="button"
            title="Seçimi temizle"
            onMouseDown={event => event.preventDefault()}
            onClick={() => { onChange(''); close() }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', color: '#6c757d',
              fontSize: 14, lineHeight: 1, padding: '2px 4px',
            }}
          >
            ✕
          </button>
        )}
        <span style={{ pointerEvents: 'none', color: '#666', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div ref={listRef} role="listbox" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {visibleMatches.map((option, index) => {
              const isActive = index === activeIndex
              const isSelected = option.value === value
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => select(option)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f3f5',
                    background: isActive ? '#e3f2fd' : isSelected ? '#f1f8ff' : 'transparent',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#212529', fontWeight: isSelected ? 600 : 400 }}>
                      <HighlightedText text={option.label} query={query} />
                    </div>
                    {option.sublabel && (
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2 }}>
                        <HighlightedText text={option.sublabel} query={query} />
                      </div>
                    )}
                  </div>
                  {option.meta && (
                    <span style={{
                      flexShrink: 0, fontSize: 11, color: '#1976d2', background: '#e3f2fd',
                      border: '1px solid #bbdefb', borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>
                      <HighlightedText text={option.meta} query={query} />
                    </span>
                  )}
                </div>
              )
            })}

            {visibleMatches.length === 0 && (
              <div style={{ padding: '12px', color: '#6c757d', fontStyle: 'italic', fontSize: 14 }}>
                {isLoading ? loadingText : options.length === 0 ? noOptionsText : emptyText}
              </div>
            )}
          </div>

          {options.length > 0 && (
            <div style={{
              padding: '6px 12px', fontSize: 12, color: '#6c757d',
              background: '#f8f9fa', borderTop: '1px solid #e9ecef',
            }}>
              {matches.length} / {options.length} sonuç
              {matches.length > visibleMatches.length && ` — ilk ${visibleMatches.length} tanesi gösteriliyor, aramayı daraltın`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchableSelect

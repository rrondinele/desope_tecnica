import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/services/supabaseClient'

export default function SearchableSelect({
  tableName,
  columnName,
  placeholder = 'Pesquisar…',
  onValueChange,
  selectColumns,
  value: controlledValue,
  className = '',
  id,
  required,
  disabled,
  selectionOnly = true,
  getLabel,
  getValue,
}) {
  const [query, setQuery] = useState(controlledValue || '')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState(controlledValue || '')
  const containerRef = useRef(null)

  const cols = selectColumns || (columnName === 'tecnico' ? 'tecnico,matricula_light' : columnName)

  useEffect(() => {
    setQuery(controlledValue || '')
    setSelectedLabel(controlledValue || '')
  }, [controlledValue])

  useEffect(() => {
    let ignore = false
    async function run() {
      if (!supabase || !tableName || !columnName) return
      const q = supabase
        .from(tableName)
        .select(cols)
        .order(columnName)
        .limit(20)
      const searchTerm = columnName === 'tecnico' && typeof query === 'string'
        ? query.split(',')[0]?.trim() ?? ''
        : query

      const { data, error } = searchTerm
        ? await q.ilike(columnName, `%${searchTerm}%`)
        : await q
      if (error) return
      if (!ignore) setItems(data || [])
    }
    run()
    return () => { ignore = true }
  }, [tableName, columnName, cols, query])

  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        if (selectionOnly && query !== selectedLabel) {
          setQuery(selectedLabel || '')
        }
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [selectionOnly, query, selectedLabel])

  function selectItem(row) {
    const fallback = row?.[columnName] ?? ''
    const defaultLabel = columnName === 'tecnico' && row?.matricula_light
      ? `${row.tecnico}, ${row.matricula_light}`
      : fallback
    const label = getLabel ? getLabel(row) : defaultLabel
    const val = getValue
      ? getValue(row)
      : (columnName === 'tecnico' && row?.matricula_light ? defaultLabel : fallback)
    setQuery(label)
    setSelectedLabel(label)
    setOpen(false)
    onValueChange && onValueChange(val, row)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={query}
        id={id}
        required={required}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onBlur={() => { if (selectionOnly && query !== selectedLabel) setQuery(selectedLabel || '') }}
      />
      {open && items?.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {items.map((row, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50"
              onClick={() => selectItem(row)}
            >
              {getLabel
                ? getLabel(row)
                : (columnName === 'tecnico' && row?.matricula_light ? `${row.tecnico}, ${row.matricula_light}` : row[columnName])}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
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
  // 🔽 NOVO
  where = [],                  // [{ column, operator:'ilike'|'eq'|'in'|..., value }]
  exclude,                     // { column:'matricula_ceneged', values:[...] }
  maxRows = 50,                // opcional
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

      let q = supabase
        .from(tableName)
        .select(cols)
        .order(columnName, { ascending: true })
        .limit(maxRows)

      // 🔎 termo de busca (sempre na columnName)
      const searchTerm =
        columnName === 'tecnico' && typeof query === 'string'
          ? query.split(',')[0]?.trim() ?? ''
          : query

      if (searchTerm) {
        q = q.ilike(columnName, `%${searchTerm}%`)
      }

      // 🔽 aplica filtros AND vindos do pai
      if (Array.isArray(where)) {
        for (const f of where) {
          if (!f?.column) continue
          const op = (f.operator || 'eq').toLowerCase()
          const val = f.value
          if (op === 'ilike') q = q.ilike(f.column, String(val))
          else if (op === 'eq') q = q.eq(f.column, val)
          else if (op === 'neq') q = q.neq(f.column, val)
          else if (op === 'gte') q = q.gte(f.column, val)
          else if (op === 'lte') q = q.lte(f.column, val)
          else if (op === 'gt') q = q.gt(f.column, val)
          else if (op === 'lt') q = q.lt(f.column, val)
          else if (op === 'in') q = q.in(f.column, Array.isArray(val) ? val : [])
          else q = q.filter(f.column, op, val)
        }
      }

      // 🚫 excluir valores já usados
      if (exclude?.column && Array.isArray(exclude.values) && exclude.values.length > 0) {
        // supabase-js exige string '(v1,v2,...)' para o operador IN quando usado via .not
        const list = '(' + exclude.values
          .map(v => `'${String(v).replace(/'/g, "''")}'`)
          .join(',') + ')'
        q = q.not(exclude.column, 'in', list)
      }

      const { data, error } = await q
      if (error) {
        console.error('SearchableSelect error:', error)
        if (!ignore) setItems([])
        return
      }
      if (!ignore) setItems(data || [])
    }

    run()
    return () => { ignore = true }
  // 🔁 reexecuta quando filtros/exclusões mudam
  }, [
    tableName,
    columnName,
    cols,
    maxRows,
    query,
    JSON.stringify(where || []),
    JSON.stringify(exclude || {})
  ])

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
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {items?.length > 0 ? items.map((row, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-blue-50"
              onClick={() => selectItem(row)}
            >
              {getLabel
                ? getLabel(row)
                : (columnName === 'tecnico' && row?.matricula_light
                    ? `${row.tecnico}, ${row.matricula_light}`
                    : row[columnName])}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</div>
          )}
        </div>
      )}
    </div>
  )
}
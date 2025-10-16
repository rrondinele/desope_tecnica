import { supabase, hasSupabase } from '@/services/supabaseClient'

export async function fetchTecnicos() {
  if (!hasSupabase()) return []
  const { data, error } = await supabase
    .from('light_tecnico')
    .select('tecnico, matricula_light')
    .order('tecnico')
  if (error) {
    console.warn('[lookups] erro ao buscar técnicos:', error.message)
    return []
  }
  return data || []
}

export async function fetchMunicipios() {
  if (!hasSupabase()) return []
  const { data } = await supabase.from('light_municipio').select('municipio, regional').order('municipio')
  return data || []
}

export async function fetchMateriaisByCodigos(codigos = []) {
  if (!hasSupabase()) return { data: {}, available: false }

  const sanitized = Array.from(
    new Set(
      (codigos || [])
        .map((valor) => (valor === null || valor === undefined ? '' : String(valor).trim()))
        .filter(Boolean)
    )
  )

  if (sanitized.length === 0) {
    return { data: {}, available: true }
  }

  const { data, error } = await supabase
    .from('light_material')
    .select('codigo_material, texto_breve_material, umb')
    .in('codigo_material', sanitized)

  if (error) {
    console.warn('[lookups] erro ao buscar materiais:', error.message)
    return { data: {}, available: true, error: error.message }
  }

  const map = {}
  ;(data || []).forEach((item) => {
    if (item?.codigo_material === null || item?.codigo_material === undefined) {
      return
    }
    const key = String(item.codigo_material).trim()
    if (!key) return
    map[key] = {
      descricao: item.texto_breve_material || '',
      umb: item.umb || '',
    }
  })

  return { data: map, available: true }
}

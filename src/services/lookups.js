import { supabase, hasSupabase } from '@/services/supabaseClient'

export async function fetchTecnicos() {
  if (!hasSupabase()) return []
  // tabela: light_tecnico (tecnico, matricula_light)
  const { data, error } = await supabase
    .from('light_tecnico')
    .select('id, tecnico, matricula_light')
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
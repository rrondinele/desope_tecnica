// frontend/src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Importante: Vite substitui import.meta.env apenas quando usado literalmente
const env = import.meta.env
let url = env.VITE_SUPABASE_URL
let anonKey = env.VITE_SUPABASE_ANON_KEY

// Permite usar process.env quando o bundle roda em scripts Node (ex.: testes)
if ((!url || !anonKey) && typeof process !== 'undefined' && process.env) {
  url = url || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  anonKey = anonKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
}

export const supabase = (url && anonKey) ? createClient(url, anonKey) : null

const diagPayload = {
  hasSupabase: !!(url && anonKey),
  url: url || null,
  anonKeyPresent: !!anonKey,
}

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] VITE_SUPABASE_URL/ANON_KEY não configurados. Usando localStorage.')
}

// Expor diagnóstico no ambiente (browser ou Node)
if (typeof window !== 'undefined') {
  window.__SUPABASE_CFG__ = diagPayload
  if (supabase) {
    // eslint-disable-next-line no-console
    console.info('[supabase] cliente inicializado', { url })
  }
} else if (typeof globalThis !== 'undefined') {
  globalThis.__SUPABASE_CFG__ = diagPayload
}

export function hasSupabase() {
  return !!supabase
}

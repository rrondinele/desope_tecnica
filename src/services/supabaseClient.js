// frontend/src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Importante: Vite substitui import.meta.env apenas quando usado literalmente, sem optional chaining
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey } = import.meta.env

export const supabase = (url && anonKey) ? createClient(url, anonKey) : null

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] VITE_SUPABASE_URL/ANON_KEY não configurados. Usando localStorage.');
}

// Expor diagnóstico no navegador para facilitar debug
if (typeof window !== 'undefined') {
  window.__SUPABASE_CFG__ = {
    hasSupabase: !!(url && anonKey),
    url,
    anonKeyPresent: !!anonKey,
  }
  if (supabase) {
    // eslint-disable-next-line no-console
    console.info('[supabase] cliente inicializado', { url })
  }
}

export function hasSupabase() {
  return !!supabase
}

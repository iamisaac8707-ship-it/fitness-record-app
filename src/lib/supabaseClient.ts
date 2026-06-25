import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function normalizeSupabaseUrl(value?: string) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  }
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

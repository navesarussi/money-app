import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

/** True when PostgREST cannot find a table (migration not applied or wrong project). */
export function isMissingTableError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  const m = (error.message ?? '').toLowerCase()
  return m.includes('could not find the table') || m.includes('schema cache')
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    )
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

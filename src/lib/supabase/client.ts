import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/supabase'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create the client with cookie-based session handling
export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null
          const item = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${key}=`))
          return item ? item.split('=')[1] : null
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return
          document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      }
    }
  }
)

export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
} 
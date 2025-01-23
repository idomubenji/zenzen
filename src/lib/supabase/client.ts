import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Use non-suffixed environment variables for simplicity
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
  })
  throw new Error('Missing required Supabase environment variables')
}

// Create the client with anon key for client-side operations
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        // Use secure cookie storage instead of localStorage
        getItem: (key) => {
          if (typeof document === 'undefined') return null
          const item = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
          return item ? item.split('=')[1] : null
        },
        setItem: (key, value) => {
          if (typeof document === 'undefined') return
          document.cookie = `${key}=${value}; path=/; secure; samesite=strict`
        },
        removeItem: (key) => {
          if (typeof document === 'undefined') return
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    },
  }
) 
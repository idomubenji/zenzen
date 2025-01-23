import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/types/supabase'

// Use environment-specific variables
const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
const supabaseUrl = isProd 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_PROD 
  : process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = isProd
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables:', {
    URL: !!supabaseUrl,
    ANON_KEY: !!supabaseAnonKey,
    ENV: process.env.NEXT_PUBLIC_VERCEL_ENV
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
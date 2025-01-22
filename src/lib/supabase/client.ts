import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Environment-specific URLs and keys
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD
const DEV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321'
const PROD_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD
const DEV_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV

// Determine if we're in production
const isProd = process.env.NODE_ENV === 'production'

// Validate environment variables
if (isProd && (!PROD_URL || !PROD_ANON_KEY)) {
  console.error('Missing required Supabase environment variables for production:', {
    PROD_URL: !!PROD_URL,
    PROD_ANON_KEY: !!PROD_ANON_KEY,
  })
  throw new Error('Missing required Supabase environment variables for production')
}

if (!isProd && !DEV_ANON_KEY) {
  console.error('Missing required Supabase environment variables for development:', {
    DEV_ANON_KEY: !!DEV_ANON_KEY,
  })
  throw new Error('Missing required Supabase environment variables for development')
}

// Create the client with anon key for client-side operations
export const supabase = createClient<Database>(
  isProd ? PROD_URL! : DEV_URL,
  isProd ? PROD_ANON_KEY! : DEV_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        // Use secure cookie storage instead of localStorage
        getItem: (key) => {
          const item = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`))
          return item ? item.split('=')[1] : null
        },
        setItem: (key, value) => {
          document.cookie = `${key}=${value}; path=/; secure; samesite=strict`
        },
        removeItem: (key) => {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    },
  }
) 
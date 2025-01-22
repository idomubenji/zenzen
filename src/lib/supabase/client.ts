import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Environment-specific URLs and keys
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD || ''
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || ''
const DEV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321'
const DEV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || ''

// Determine if we're in production
const isProd = process.env.NODE_ENV === 'production'

// Create the appropriate client based on environment
export const supabase = createClient<Database>(
  isProd ? PROD_URL : DEV_URL,
  isProd ? PROD_KEY : DEV_KEY,
  {
    auth: {
      persistSession: false // Since this is for server-side API routes
    }
  }
)

// Create a client specifically for auth operations (using anon key)
export const supabaseAuth = createClient<Database>(
  isProd ? PROD_URL : DEV_URL,
  isProd ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD || '' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV || '',
  {
    auth: {
      persistSession: true // For client-side auth, we want to persist the session
    }
  }
) 
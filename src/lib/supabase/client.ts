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

// Create the client with minimal configuration for testing
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
) 